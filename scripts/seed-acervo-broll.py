# -*- coding: utf-8 -*-
"""Enche o acervo compartilhado de b-roll a partir de `docs/broll-coringas.md`.

Por que existe: em 21/09/2026 o acervo estava VAZIO (`acervo_videos`,
`videos_franqueada` e `aline.videos_perfil`, zero linha cada), e sem clipe o
corte automático entrega vídeo sem nenhuma retomada. A lista dos 40 coringas
já estava escrita no documento; faltava alguém subir.

Este script NÃO substitui os clipes da Aline. Ele é o fundo de catálogo pra
enquanto os dela não sobem — e o worker sempre prefere a biblioteca da nutri
ao acervo (ver `catalogo_broll` em packages/corte-ia/pipeline.py).

    export SB_URL=... SB_KEY=<service role> PEXELS_API_KEY=...
    python3 scripts/seed-acervo-broll.py --limite 40          # de verdade
    python3 scripts/seed-acervo-broll.py --simular            # só mostra

🔴 Idempotente por `fonte`: roda de novo e ATUALIZA, não duplica. Clipe que a
equipe já editou à mão (descrição, tags) NÃO é tocado — só entra o que ainda
não existe, a menos que venha `--reescrever`.
"""
import argparse
import json
import os
import re
import sys

import requests

FONTE = "coringa-pexels"
DOC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "broll-coringas.md")
PEXELS = "https://api.pexels.com/videos/search"

# "1. Tigela de aveia com frutas vermelhas sendo montada. `fibra, aveia`"
LINHA = re.compile(r"^\s*\d+\.\s+(.+?)\s*`([^`]+)`\s*$")


def ler_coringas(caminho=DOC):
    """Título + tags de cada item numerado do documento."""
    itens = []
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            m = LINHA.match(linha)
            if not m:
                continue
            titulo = m.group(1).strip().rstrip(".")
            tags = [t.strip() for t in m.group(2).split(",") if t.strip()]
            if titulo and tags:
                itens.append({"titulo": titulo, "tags": tags})
    return itens


def termo_de_busca(item):
    """O documento está em português e o banco responde melhor em inglês nas
    cenas genéricas; as tags dão o assunto e o título dá a cena."""
    return " ".join(item["tags"][:3])


def buscar(termo, chave):
    r = requests.get(PEXELS, headers={"Authorization": chave}, timeout=30,
                     params={"query": termo, "orientation": "portrait",
                             "per_page": 5, "size": "medium"})
    r.raise_for_status()
    for v in r.json().get("videos") or []:
        if (v.get("duration") or 0) < 4:
            continue
        arq = [f for f in v.get("video_files") or [] if (f.get("height") or 0) >= (f.get("width") or 0)]
        if not arq:
            continue
        arq.sort(key=lambda f: f.get("height") or 0)
        melhor = next((f for f in arq if (f.get("height") or 0) >= 1080), arq[-1])
        return {"url": melhor["link"], "pexels_video_id": str(v.get("id")),
                "duracao_seg": v.get("duration"),
                "thumbnail_url": v.get("image")}
    return None


def existentes(sb_url, sb_key):
    r = requests.get(f"{sb_url}/rest/v1/acervo_videos",
                     headers={"Authorization": f"Bearer {sb_key}", "apikey": sb_key},
                     params={"select": "titulo", "fonte": f"eq.{FONTE}", "limit": "500"},
                     timeout=30)
    r.raise_for_status()
    return {row["titulo"] for row in r.json()}


def gravar(sb_url, sb_key, linhas):
    r = requests.post(f"{sb_url}/rest/v1/acervo_videos",
                      headers={"Authorization": f"Bearer {sb_key}", "apikey": sb_key,
                               "Content-Type": "application/json",
                               "Prefer": "return=minimal"},
                      data=json.dumps(linhas), timeout=120)
    if not r.ok:
        raise RuntimeError(f"{r.status_code}: {r.text[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limite", type=int, default=40)
    ap.add_argument("--simular", action="store_true")
    ap.add_argument("--reescrever", action="store_true",
                    help="sobe também os que já existem (perde edição manual)")
    a = ap.parse_args()

    itens = ler_coringas()
    print(f"{len(itens)} coringas no documento")
    if a.simular and not os.environ.get("PEXELS_API_KEY"):
        for i in itens[: a.limite]:
            print(" -", i["titulo"], "|", termo_de_busca(i))
        return

    chave = os.environ.get("PEXELS_API_KEY")
    sb_url = (os.environ.get("SB_URL") or "").rstrip("/")
    sb_key = os.environ.get("SB_KEY")
    if not chave:
        sys.exit("falta PEXELS_API_KEY")
    if not a.simular and not (sb_url and sb_key):
        sys.exit("faltam SB_URL e SB_KEY (service role)")

    ja = set() if (a.simular or a.reescrever) else existentes(sb_url, sb_key)
    novos, sem_video = [], []
    for item in itens[: a.limite]:
        if item["titulo"] in ja:
            continue
        achado = buscar(termo_de_busca(item), chave)
        if not achado:
            sem_video.append(item["titulo"])
            continue
        novos.append({
            "titulo": item["titulo"],
            "descricao": f"Clipe coringa de banco de imagem. Ilustra: {', '.join(item['tags'])}.",
            "tags": item["tags"],
            "url": achado["url"],
            "thumbnail_url": achado["thumbnail_url"],
            "duracao_seg": achado["duracao_seg"],
            "pexels_video_id": achado["pexels_video_id"],
            "fonte": FONTE,
            "ativo": True,
            # `bucket` fica no default ('videos-biblioteca'): o clipe mora no
            # banco de imagem, não no nosso Storage, e quem lê usa `url`.
        })
        print(" +", item["titulo"])

    print(f"\n{len(novos)} pra subir, {len(sem_video)} sem vídeo no banco de imagem")
    for t in sem_video:
        print("   sem resultado:", t)
    if a.simular:
        print("(simulação: nada foi gravado)")
        return
    if novos:
        gravar(sb_url, sb_key, novos)
        print("gravado.")


if __name__ == "__main__":
    main()
