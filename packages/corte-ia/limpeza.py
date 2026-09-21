# -*- coding: utf-8 -*-
"""Limpeza da gravação: tira pausa morta, falsa partida e hesitação.

Pedido da Aline (21/09/2026): "se às vezes a pessoa deu uma pausa, errou, para
dar uma quebra". A transcrição do faster-whisper já vem com timestamp POR
PALAVRA, então o dado pra isso sempre existiu; faltava a regra.

Funções puras (nenhuma toca ffmpeg nem rede) — quem recorta o vídeo é o
`pipeline.py`, quem prova que a regra vale é o `test_limpeza.py`.

O que é removido, em ordem de confiança:

  1. silêncio       — buraco entre duas palavras maior que LIMIAR_SILENCIO.
                      Nunca some inteiro: fica RESPIRO de cada lado, senão a
                      fala emenda e soa robótica.
  2. cabeça/rabo    — o "deixa eu ver se está gravando" antes da primeira
                      palavra e o silêncio depois da última.
  3. falsa partida  — a pessoa começou a frase, errou, PAROU e recomeçou
                      igual. Fica a última tomada.
  4. hesitação      — "ãã", "hum" isolados entre duas pausas.

🔴 A TRAVA PRINCIPAL: A TRANSCRIÇÃO PROPÕE, O ÁUDIO CONFIRMA.

Buraco na transcrição NÃO é prova de silêncio: pode ser fala que o
reconhecimento não pegou (sotaque, som baixo, palavra técnica). Cortar ali
comeria a frase da nutri, que é o pior desfecho possível deste código.

Por isso o `pipeline` mede o silêncio REAL no áudio (ffmpeg silencedetect) e
passa em `silencios`: todo corte de pausa é a INTERSEÇÃO entre o buraco da
transcrição e o silêncio medido. Sem essa lista o módulo entra no modo
desconfiado (só corta buraco muito grande, com teto baixo), porque aí ele está
adivinhando.

🔴 As outras travas (nenhuma se afrouxa sem a Aline saber):

  - corte SEMPRE cai em silêncio, nunca dentro de uma palavra.
  - nada menor que MIN_CORTE sai. Tirar 80 ms é inaudível e só arrisca estalo.
  - a PRIMEIRA e a ÚLTIMA palavra nunca somem: são a promessa dos 2 s iniciais
    e a chamada pra ação. (O silêncio antes e depois delas, sim.)
  - remoção de FALA (falsa partida e hesitação) tem teto próprio e apertado:
    é a única parte que mexe no que foi dito.
  - estourou o teto: NÃO corta nada e devolve o motivo por escrito. Entregar
    meio vídeo é pior que entregar o vídeo inteiro.
"""

import re
import unicodedata

# ---------------------------------------------------------------- ajustes
LIMIAR_SILENCIO = 0.70      # buraco a partir daqui é candidato a pausa morta
LIMIAR_SEM_AUDIO = 1.20     # sem confirmação do áudio, só buraco bem grande
RESPIRO = 0.18              # sobra de cada lado do corte (o ar da fala)
MIN_CORTE = 0.25            # abaixo disso não compensa cortar
CABECA_MAX = 0.15           # silêncio que fica antes da primeira palavra
RABO_MAX = 0.45             # silêncio que fica depois da última (respiro do CTA)
MAX_REMOVIDO = 0.70         # teto do total, com áudio confirmando
MAX_REMOVIDO_SEM_AUDIO = 0.40
MAX_FALA_REMOVIDA = 0.25    # teto do que pode sair de FALA (erro e hesitação)
PAUSA_RECOMECO = 0.35       # pausa que caracteriza "errei, vou repetir"
JANELA_RECOMECO = 3.0       # a repetição tem que vir logo depois
MIN_PALAVRAS_REPETIDAS = 3

# 🔴 Lista deliberadamente CURTA. "a", "e", "um", "é" são artigo, conjunção e
# numeral em português: entraram aqui numa primeira versão e o teste pegou o
# corte comendo o "a" de "a microbiota toda". Muleta que também é palavra fica
# de fora — deixar uma hesitação passar é barato, comer a fala da nutri não é.
HESITACAO = {
    "aa", "aaa", "ah", "aah", "ahn", "ahm", "aham",
    "hum", "hm", "hmm", "hmmm", "uhum", "ee", "eee", "mm", "mmm",
}

SILENCIO, CABECA, RABO, RECOMECO, HESITA = "silencio", "cabeca", "rabo", "recomeco", "hesitacao"
FALA = {RECOMECO, HESITA}
MOTIVOS = {
    SILENCIO: "pausa",
    CABECA: "silêncio do começo",
    RABO: "silêncio do fim",
    RECOMECO: "falsa partida (frase recomeçada)",
    HESITA: "hesitação",
}


def _norm(t):
    """Minúscula, sem acento e sem pontuação — pra comparar palavra falada."""
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", t)


def palavras_de(transcricao):
    """Achata a transcrição numa lista só de palavras com tempo, em ordem."""
    fora = []
    for s in transcricao or []:
        for p in s.get("palavras") or []:
            try:
                i, f = float(p["i"]), float(p["f"])
            except (KeyError, TypeError, ValueError):
                continue
            if f <= i:
                continue
            fora.append({"t": p.get("t", ""), "i": i, "f": f})
    fora.sort(key=lambda p: p["i"])
    return fora


# ---------------------------------------------------------------- detecção
def falsas_partidas(palavras):
    """Índices de palavras a remover por frase recomeçada.

    Assinatura do erro: um bloco de N palavras (N >= 3) aparece, vem uma PAUSA,
    e o mesmo bloco aparece de novo logo em seguida. A primeira tomada sai.

    A pausa é o que separa erro de ênfase. "Não é sorte, não é sorte" dito de
    corrido é escolha de escrita e fica; dito com meio segundo de silêncio no
    meio, é a pessoa se corrigindo.
    """
    fora = set()
    n = len(palavras)
    chaves = [_norm(p["t"]) for p in palavras]
    i = 0
    while i < n:
        achou = 0
        # bloco maior primeiro: "o que acontece é" ganha de "o que acontece"
        for tam in range(8, MIN_PALAVRAS_REPETIDAS - 1, -1):
            j = i + tam
            if j + tam > n:
                continue
            a, b = chaves[i:i + tam], chaves[j:j + tam]
            if not all(a) or a != b:
                continue
            if palavras[j]["i"] - palavras[j - 1]["f"] < PAUSA_RECOMECO:
                continue
            if palavras[j]["i"] - palavras[i]["f"] > JANELA_RECOMECO:
                continue
            fora.update(range(i, j))
            achou = tam
            break
        i += achou * 2 if achou else 1
    return fora


def hesitacoes(palavras):
    """Índices de 'ãã'/'hum' isolados: a palavra é muleta E tem pausa em volta."""
    fora = set()
    for k, p in enumerate(palavras):
        if _norm(p["t"]) not in HESITACAO:
            continue
        antes = p["i"] - palavras[k - 1]["f"] if k else 99.0
        depois = palavras[k + 1]["i"] - p["f"] if k + 1 < len(palavras) else 99.0
        if max(antes, depois) >= 0.25:
            fora.add(k)
    return fora


def _fundir(trechos):
    """Une intervalos que se tocam, pra não gerar dois cortes colados."""
    if not trechos:
        return []
    trechos = sorted(trechos, key=lambda t: t["inicio"])
    saida = [dict(trechos[0])]
    for t in trechos[1:]:
        if t["inicio"] <= saida[-1]["fim"] + 0.01:
            saida[-1]["fim"] = max(saida[-1]["fim"], t["fim"])
            if saida[-1]["motivo"] in FALA or t["motivo"] in FALA:
                saida[-1]["motivo"] = RECOMECO if RECOMECO in (saida[-1]["motivo"], t["motivo"]) else HESITA
        else:
            saida.append(dict(t))
    return saida


def _intersecao(a0, a1, silencios):
    """Pedaços de [a0,a1] que o áudio confirma como silêncio."""
    fora = []
    for s0, s1 in silencios:
        i0, i1 = max(a0, float(s0)), min(a1, float(s1))
        if i1 - i0 > 0.01:
            fora.append((i0, i1))
    return fora


# ---------------------------------------------------------------- plano
def planejar_limpeza(transcricao, duracao, silencios=None, ligado=True):
    """Devolve {manter, removidos, seg_removidos, dur_original, dur_final, aviso}.

    `manter` é a lista de trechos (inicio, fim) do vídeo ORIGINAL que ficam, em
    ordem. Com ela o pipeline recorta e o `remapear` conserta os tempos.

    `silencios` é a lista [(inicio, fim)] medida no áudio. Ver a trava principal
    no topo do arquivo: sem ela o módulo fica desconfiado de propósito.
    """
    dur = float(duracao or 0)
    inteiro = {"manter": [(0.0, round(dur, 3))] if dur > 0 else [], "removidos": [],
               "seg_removidos": 0.0, "dur_original": round(dur, 2),
               "dur_final": round(dur, 2), "aviso": None,
               "audio_confirmou": silencios is not None}
    if not ligado or dur <= 0:
        return inteiro

    palavras = palavras_de(transcricao)
    if len(palavras) < 2:
        inteiro["aviso"] = "sem timestamp por palavra: não cortei nada."
        return inteiro

    com_audio = silencios is not None
    limiar = LIMIAR_SILENCIO if com_audio else LIMIAR_SEM_AUDIO
    teto = MAX_REMOVIDO if com_audio else MAX_REMOVIDO_SEM_AUDIO

    recomecos, hesitas = falsas_partidas(palavras), hesitacoes(palavras)
    descartar = (recomecos | hesitas) - {0, len(palavras) - 1}

    brutos = []
    # 1) palavra descartada sai com um respiro do silêncio colado nela.
    #
    # 🔴 O respiro entra AQUI, onde ainda se sabe onde estão os vizinhos, e
    # nunca passa da metade do buraco disponível. A versão que encolhia o
    # intervalo depois, às cegas, cortava DENTRO da palavra quando o buraco era
    # curto: o teste `corte_nunca_cai_dentro_de_palavra` pegou.
    for k in sorted(descartar):
        antes = palavras[k]["i"] - (palavras[k - 1]["f"] if k else 0.0)
        depois = (palavras[k + 1]["i"] if k + 1 < len(palavras) else dur) - palavras[k]["f"]
        brutos.append({
            "inicio": palavras[k]["i"] - min(RESPIRO / 2, max(antes, 0) / 2),
            "fim": palavras[k]["f"] + min(RESPIRO / 2, max(depois, 0) / 2),
            "motivo": RECOMECO if k in recomecos else HESITA,
        })

    # 2) silêncio entre as palavras que ficam
    vivas = [p for k, p in enumerate(palavras) if k not in descartar]
    for a, b in zip(vivas, vivas[1:]):
        if b["i"] - a["f"] > limiar:
            brutos.append({"inicio": a["f"], "fim": b["i"], "motivo": SILENCIO})

    # 3) cabeça e rabo
    if vivas[0]["i"] > CABECA_MAX + MIN_CORTE:
        brutos.append({"inicio": 0.0, "fim": vivas[0]["i"], "motivo": CABECA})
    if dur - vivas[-1]["f"] > RABO_MAX + MIN_CORTE:
        brutos.append({"inicio": vivas[-1]["f"], "fim": dur, "motivo": RABO})

    # 4) respiro, confirmação do áudio e piso de tamanho
    removidos = []
    for t in _fundir(brutos):
        ini, fim, motivo = t["inicio"], t["fim"], t["motivo"]
        if motivo == CABECA:
            fim = max(ini, fim - CABECA_MAX)
        elif motivo == RABO:
            ini = min(fim, ini + RABO_MAX)
        elif motivo == SILENCIO:
            ini, fim = ini + RESPIRO, fim - RESPIRO
        # corte de FALA já nasceu com o respiro certo, na montagem acima

        if fim - ini < MIN_CORTE:
            continue

        pedacos = [(ini, fim)]
        if com_audio and motivo != RECOMECO and motivo != HESITA:
            pedacos = _intersecao(ini, fim, silencios)
        for p0, p1 in pedacos:
            if p1 - p0 >= MIN_CORTE:
                removidos.append({"inicio": round(p0, 3), "fim": round(p1, 3),
                                  "motivo": MOTIVOS[motivo], "tipo": motivo})

    removidos.sort(key=lambda t: t["inicio"])

    # Cabeça e rabo ficam FORA do teto: são o único corte provadamente fora de
    # toda fala, e numa gravação que começou torta eles são a maior parte do
    # que sai. Contá-los faria o teto barrar justamente o corte mais seguro.
    total = sum(t["fim"] - t["inicio"] for t in removidos
                if t["tipo"] not in (CABECA, RABO))

    # Fala removida é o tempo das PALAVRAS que caíram dentro do corte, nunca o
    # tamanho do intervalo: o silêncio colado na palavra não é fala perdida.
    def _dentro_de_corte(p):
        return any(t["inicio"] <= p["i"] and p["f"] <= t["fim"] for t in removidos)

    de_fala = sum(p["f"] - p["i"] for p in palavras if _dentro_de_corte(p))
    fala_total = sum(p["f"] - p["i"] for p in palavras)

    if total > dur * teto:
        inteiro["aviso"] = (f"a limpeza queria tirar {total:.0f}s de {dur:.0f}s. "
                            "É muito: deixei a gravação inteira.")
        return inteiro
    if fala_total and de_fala > fala_total * MAX_FALA_REMOVIDA:
        inteiro["aviso"] = ("achei repetição demais pra ter certeza do que era erro. "
                            "Deixei a gravação inteira.")
        return inteiro
    if not removidos:
        return inteiro

    manter, cursor = [], 0.0
    for t in removidos:
        if t["inicio"] - cursor > 0.05:
            manter.append((round(cursor, 3), round(t["inicio"], 3)))
        cursor = max(cursor, t["fim"])
    if dur - cursor > 0.05:
        manter.append((round(cursor, 3), round(dur, 3)))
    if not manter:
        return inteiro

    return {"manter": manter, "removidos": removidos,
            "seg_removidos": round(total, 2), "dur_original": round(dur, 2),
            "dur_final": round(sum(b - a for a, b in manter), 2),
            "aviso": None, "audio_confirmou": com_audio}


# ---------------------------------------------------------------- remapear
def remapear_tempo(t, manter):
    """Tempo do vídeo original → tempo do vídeo já cortado.

    Instante que caiu num trecho removido vira a emenda (o começo do próximo
    trecho que fica) — assim nenhuma legenda aponta pra um pedaço que não existe.
    """
    passado = 0.0
    for a, b in manter:
        if t < a:
            return round(passado, 3)
        if t <= b:
            return round(passado + (t - a), 3)
        passado += b - a
    return round(passado, 3)


def remapear_transcricao(transcricao, manter):
    """Reescreve os tempos e joga fora o que não sobreviveu ao corte."""
    def dentro(t):
        return any(a - 0.001 <= t <= b + 0.001 for a, b in manter)

    saida = []
    for s in transcricao or []:
        palavras = []
        for p in s.get("palavras") or []:
            try:
                i, f = float(p["i"]), float(p["f"])
            except (KeyError, TypeError, ValueError):
                continue
            if not (dentro(i) or dentro(f)):
                continue
            ni = remapear_tempo(i, manter)
            nf = remapear_tempo(f, manter)
            if nf <= ni:
                nf = ni + 0.08
            palavras.append({"t": p.get("t", ""), "i": round(ni, 2), "f": round(nf, 2)})
        if not palavras:
            continue
        saida.append({"inicio": palavras[0]["i"], "fim": palavras[-1]["f"],
                      "texto": s.get("texto", "").strip(), "palavras": palavras})
    return saida


def frase_do_aviso(limpeza):
    """Uma linha pra nutri, na tela. Sem número, ela não sabe o que aconteceu."""
    if limpeza.get("aviso"):
        return limpeza["aviso"]
    removidos = limpeza.get("removidos") or []
    if not removidos:
        return "Nada a cortar: a gravação já estava limpa."
    n = len(removidos)
    seg = limpeza.get("seg_removidos") or 0
    tipos = sorted({t["motivo"] for t in removidos})
    return (f"Tirei {seg:.0f}s em {n} corte{'s' if n > 1 else ''} "
            f"({', '.join(tipos)}). O vídeo ficou com {limpeza['dur_final']:.0f}s.")
