# Monta o video da entrega da consulta em cima do tablet frontal.
#
# A cena nao corta: o tablet fica parado o video inteiro e o que muda e a
# pagina dentro dele, que e como um tablet se comporta de verdade. Cada
# tela entra com overlay + enable na sua janela de tempo, e rola dentro
# da tela com crop animado, sem a camera andar.

import json, subprocess, sys, pathlib

AQUI = pathlib.Path(__file__).parent
FF = "/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2"
META = json.load(open(AQUI/"telas-pre.json"))

TELA = (148, 375, 794, 1200)      # x, y, w, h da tela em 1080x1920

# nome, entra, sai, atraso da rolagem, px por segundo
ROTEIRO = [
    ("plano-alimentar-wide",   0.0,  8.3, 1.6,  78),
    ("scanner-exames-wide",    8.3, 11.9, 0.5,  80),
    ("questionario-wide",     11.9, 15.5, 0.5,  50),
    ("prato-nutrigenomico",   15.5, 20.0, 0.0,   0),
    ("suplementacao-wide",    20.0, 26.0, 0.6,  26),
    ("genetica-tablet",       26.0, 38.5, 4.5,  16),
    ("scanner-genetica-wide", 38.5, 46.5, 0.6, 135),
    ("trilha-wide",           46.5, 59.0, 1.0,   6),
]


def passo(entrada, saida, itens):
    """Um passe de ffmpeg com ate cinco telas, pra nao estourar o grafo."""
    cmd = [FF, "-v", "error", "-y", "-i", entrada]
    for nome, *_ in itens:
        cmd += ["-loop", "1", "-i", str(AQUI/META[nome]["arquivo"])]
    cmd += ["-loop", "1", "-i", str(AQUI/"mascara-tela.png")]
    imasc = len(itens) + 1

    f = [f"[{imasc}:v]format=gray,split={len(itens)}" +
         "".join(f"[m{i}]" for i in range(len(itens)))]
    f.append("[0:v]fps=24[v0]")
    for i, (nome, t0, t1, atraso, taxa) in enumerate(itens):
        m = META[nome]
        rol = m["rolagem"]
        if taxa and rol:
            # a imagem ja vem na largura da tela, entao o crop e a
            # unica conta por quadro: nada de reescalar 1400 vezes
            y = f"'min({rol},max(0,(t-{t0}-{atraso})*{taxa}))'"
        else:
            y = "0"
        f.append(f"[{i+1}:v]crop={TELA[2]}:{TELA[3]}:0:{y},setsar=1[c{i}]")
        f.append(f"[c{i}][m{i}]alphamerge[s{i}]")
        f.append(f"[v{i}][s{i}]overlay={TELA[0]}:{TELA[1]}:"
                 f"enable='between(t,{t0},{t1})'[v{i+1}]")
    cmd += ["-filter_complex", ";".join(f), "-map", f"[v{len(itens)}]",
            "-an", "-r", "24", "-c:v", "libx264", "-crf", "19",
            "-preset", "medium", "-pix_fmt", "yuv420p", saida]
    print(">", saida, "com", ", ".join(i[0] for i in itens))
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    passo("base-tablet.mp4", "tab-p1.mp4", ROTEIRO[:5])
    passo("tab-p1.mp4",      "tab-p2.mp4", ROTEIRO[5:])
    print("pronto: tab-p2.mp4")
