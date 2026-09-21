# -*- coding: utf-8 -*-
"""B-roll de banco de imagem, quando a biblioteca da nutri está vazia.

Pedido da Aline (21/09/2026): b-roll é o que falta pro corte ficar bom, e hoje
o acervo compartilhado tem ZERO clipe (medido em 21/09: `acervo_videos`,
`videos_franqueada` e `aline.videos_perfil` todas vazias). Enquanto ela não
sobe os clipes dela, a nutri que gravar hoje receberia um vídeo sem nenhuma
retomada.

Então: se a biblioteca não tiver nada que sirva, o worker busca no Pexels pela
PALAVRA-CHAVE que o plano já escreveu pra cada trecho. Assim que o acervo
tiver material, a biblioteca ganha de novo — o Pexels é a queda, nunca a
primeira escolha.

🔴 Duas regras que não mudam:
  - a biblioteca da nutri e o acervo TÊM PRIORIDADE. Esta busca só entra
    quando o plano do Claude voltou sem b-roll nenhum.
  - sem PEXELS_API_KEY, o corte sai como hoje (só rosto). Nada de erro: é o
    comportamento de antes desta função existir.

A colocação (`posicionar`) é função pura e segue o mesmo ritmo do
`render.timeline` e do `docs/REGRAS-CONTEUDO.md` seção 2.1.
"""
import os

import requests

BASE = "https://api.pexels.com/videos/search"

# REGRAS-CONTEUDO 2.1: rosto é a base, b-roll é retomada
INICIO_MIN = 3.0        # nada antes disso (a promessa é o rosto falando)
FIM_RESERVADO = 4.0     # o fim é a chamada pra ação
DUR_CLIPE = 2.5
ROSTO_ENTRE = 3.0       # rosto sustentando entre duas retomadas
MAX_FRACAO = 0.25       # teto de b-roll no vídeo
MAX_CLIPES = 3

# O termo que vai pro banco de imagem. A palavra-chave do plano é clínica
# ("BUTIRATO", "MTHFR") e não devolve vídeo nenhum; o que devolve é a CENA.
CENA_POR_TEMA = {
    "fibra": "fresh vegetables cooking", "microbiota": "yogurt fermented food",
    "butirato": "whole grains bowl", "intestino": "woman hands on belly",
    "gene": "dna helix animation", "genetica": "dna helix animation",
    "dna": "dna helix animation", "exame": "blood test laboratory",
    "sangue": "blood test laboratory", "vitamina": "colorful fruits table",
    "ferro": "green leafy vegetables", "proteina": "grilled fish vegetables",
    "sono": "woman sleeping calm bedroom", "cortisol": "woman stressed desk",
    "estresse": "woman breathing window", "inflamacao": "turmeric ginger tea",
    "hormonio": "woman walking outdoors morning", "peso": "woman walking outdoors",
    "agua": "pouring water glass", "cansaco": "tired woman morning",
    "pele": "woman looking mirror skin", "consulta": "nutritionist consultation",
    "suplemento": "supplement capsules table", "acucar": "sugar cubes spoon",
    "cafe": "pouring coffee morning", "treino": "woman light workout",
}
CENA_PADRAO = "healthy food preparation"


def termo_de(palavra_chave, nicho=None):
    """Palavra-chave clínica → cena que existe em banco de imagem."""
    k = (palavra_chave or "").strip().lower()
    import unicodedata
    k = "".join(c for c in unicodedata.normalize("NFD", k)
                if unicodedata.category(c) != "Mn")
    for tema, cena in CENA_POR_TEMA.items():
        if tema in k or k in tema:
            return cena
    if nicho and "fertil" in (nicho or "").lower():
        return "pregnant woman healthy food"
    return CENA_PADRAO


def posicionar(secoes, duracao, max_clipes=MAX_CLIPES):
    """Onde cabe retomada, respeitando o ritmo. Função pura.

    Devolve [{inicio, fim, palavra_chave}] — o clipe em si é escolhido depois.
    """
    dur = float(duracao or 0)
    limite_fim = dur - FIM_RESERVADO
    if limite_fim <= INICIO_MIN + DUR_CLIPE:
        return []
    teto = dur * MAX_FRACAO

    # começa em cada troca de assunto: é onde a retomada não atropela a frase
    candidatos = []
    for sec in sorted(secoes or [], key=lambda s: float(s.get("inicio", 0))):
        ini = float(sec.get("inicio", 0))
        if ini < INICIO_MIN:
            continue
        candidatos.append((ini, sec.get("palavra_chave", "")))

    postos, usado, ultimo_fim = [], 0.0, -99.0
    for ini, chave in candidatos:
        if len(postos) >= max_clipes or usado + DUR_CLIPE > teto:
            break
        if ini - ultimo_fim < ROSTO_ENTRE:
            continue
        fim = min(ini + DUR_CLIPE, limite_fim)
        if fim - ini < 1.5:
            continue
        postos.append({"inicio": round(ini, 2), "fim": round(fim, 2),
                       "palavra_chave": chave})
        usado += fim - ini
        ultimo_fim = fim
    return postos


def buscar(termo, chave, minimo_seg=3):
    """Um vídeo vertical do Pexels pra esse termo. None se não achar."""
    if not chave:
        return None
    try:
        r = requests.get(BASE, headers={"Authorization": chave}, timeout=25,
                         params={"query": termo, "orientation": "portrait",
                                 "per_page": 8, "size": "medium"})
        r.raise_for_status()
        for v in r.json().get("videos") or []:
            if (v.get("duration") or 0) < minimo_seg:
                continue
            arquivos = [f for f in v.get("video_files") or []
                        if (f.get("height") or 0) >= (f.get("width") or 0)]
            if not arquivos:
                continue
            # o menor que ainda é vertical: o corte reescala tudo pra 1080x1920
            arquivos.sort(key=lambda f: (f.get("height") or 0))
            melhor = next((f for f in arquivos if (f.get("height") or 0) >= 1080), arquivos[-1])
            return {"url": melhor["link"], "pexels_id": str(v.get("id")),
                    "duracao": v.get("duration")}
    except Exception as e:
        print("pexels falhou:", e)
    return None


def completar_plano(plano, duracao, nicho=None, chave=None):
    """Preenche plano['broll'] quando ele voltou vazio. Devolve (plano, baixar).

    `baixar` é {video_id: url} do que o pipeline precisa buscar na rede.
    """
    chave = chave or os.environ.get("PEXELS_API_KEY")
    if plano.get("broll"):
        return plano, {}
    if not chave:
        print("sem PEXELS_API_KEY: corte sai só com o rosto")
        return plano, {}

    postos = posicionar(plano.get("secoes") or [], duracao)
    if not postos:
        return plano, {}

    broll, baixar, vistos = [], {}, set()
    for n, posto in enumerate(postos):
        termo = termo_de(posto["palavra_chave"], nicho)
        if termo in vistos:       # dois trechos com a mesma cena ficam repetitivos
            continue
        achado = buscar(termo, chave)
        if not achado:
            continue
        vistos.add(termo)
        vid = f"pexels-{achado['pexels_id']}"
        broll.append({"inicio": posto["inicio"], "fim": posto["fim"],
                      "video_id": vid, "motivo": f"banco de imagem: {termo}"})
        baixar[vid] = achado["url"]
        del n
    if broll:
        plano = dict(plano)
        plano["broll"] = broll
        plano["broll_fonte"] = "pexels"
    return plano, baixar
