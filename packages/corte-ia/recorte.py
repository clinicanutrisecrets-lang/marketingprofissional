# -*- coding: utf-8 -*-
"""A parte da limpeza que toca ffmpeg: medir o silêncio e recortar o vídeo.

Fica separado de `limpeza.py` de propósito — lá é regra pura e testável, aqui
é encanamento. Quem decide O QUE sai é a regra; este arquivo só executa.
"""
import os
import re

import render


def medir_silencio(video, ruido_db=-32, minimo=0.20):
    """Onde o áudio está REALMENTE calado, pelo ffmpeg silencedetect.

    É o que transforma "buraco na transcrição" em "silêncio provado" (ver a
    trava principal de limpeza.py). Devolve [(inicio, fim)] em segundos.

    Erro aqui NÃO derruba o corte: devolve None, e a limpeza entra no modo
    desconfiado, que é o comportamento de quem não tem a informação.
    """
    try:
        r = render.run(["ffmpeg", "-hide_banner", "-nostats", "-i", video,
                        "-af", f"silencedetect=noise={ruido_db}dB:d={minimo}",
                        "-f", "null", "-"], check=False)
    except FileNotFoundError:
        return None
    saida = (r.stderr or "") + (r.stdout or "")
    if "silencedetect" not in saida and "silence_start" not in saida:
        return None

    trechos, aberto = [], None
    for m in re.finditer(r"silence_(start|end):\s*(-?[\d.]+)", saida):
        tipo, valor = m.group(1), float(m.group(2))
        if tipo == "start":
            aberto = max(0.0, valor)
        elif aberto is not None:
            if valor > aberto:
                trechos.append((aberto, valor))
            aberto = None
    if aberto is not None:  # silêncio que vai até o fim do arquivo
        _, _, dur = render.probe(video)
        if dur > aberto:
            trechos.append((aberto, dur))
    return trechos


def recortar(video, manter, saida):
    """Monta o vídeo só com os trechos de `manter`, em ordem, com áudio junto.

    Reencoda de propósito: corte por cópia de stream só cai em keyframe, e aí
    a emenda não bate com o tempo que a legenda espera.
    """
    if not manter:
        raise ValueError("nada a manter")
    if len(manter) == 1 and manter[0][0] <= 0.05:
        # nada foi cortado: não vale reencodar o vídeo inteiro à toa
        return video

    partes, fc = [], []
    for n, (a, b) in enumerate(manter):
        fc.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{n}]")
        fc.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{n}]")
        partes.append(f"[v{n}][a{n}]")
    fc.append("".join(partes) + f"concat=n={len(manter)}:v=1:a=1[v][a]")

    render.run(["ffmpeg", "-hide_banner", "-y", "-i", video,
                "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
                "-r", "25", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-b:a", "160k",
                "-movflags", "+faststart", saida])
    if not os.path.exists(saida) or os.path.getsize(saida) < 1024:
        raise RuntimeError("o recorte saiu vazio")
    return saida
