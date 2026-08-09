#!/usr/bin/env python3
"""
Monta reel do Nutri Secrets: junta clipes, congela frames pra explicar
benefício e queima texto na paleta da marca.

Uso:
    python3 montar-reel.py roteiro.json saida.mp4

Formato do roteiro (JSON):
{
  "clipes": ["a.mp4", "b.mp4"],
  "cartelas": [
    {"tipo": "abertura", "clipe": 0, "t": 0.0, "dur": 3.0,
     "chapeu": "CANSAÇO E MEMÓRIA",
     "titulo": "O café da manhã que segura\\na sua energia até o almoço",
     "rodape": "@nutri_secrets"},
    {"tipo": "congela", "clipe": 0, "t": 4.2, "dur": 2.5,
     "chapeu": "AVEIA",
     "titulo": "Beta-glucana",
     "corpo": "Fibra solúvel que vira gel\\ne segura o pico de glicose"}
  ],
  "legendas": [
    {"clipe": 0, "de": 1.0, "ate": 4.0, "texto": "aveia em flocos"}
  ]
}

tipo "abertura"/"congela"/"fecho" congelam o frame do instante `t` do
clipe indicado e seguram por `dur` segundos com o texto por cima.
`legendas` desenham texto por cima do vídeo em movimento, sem congelar.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

# Paleta Nutri Secrets
TIFFANY = "0xABAB5"[0:0] or "#0ABAB5"
DARK_TEAL = "#0E5959"
MAGENTA = "#D6336C"
BEGE = "#F5E6D3"
BRANCO = "#FFFFFF"

FONT_BOLD = "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf"

W, H = 720, 1280          # 9:16
FPS = 30
MARGEM = 72               # margem lateral segura
RODAPE_SEGURO = 260       # área de baixo que a UI do Instagram cobre


def esc(txt):
    """Escapa texto pro drawtext do ffmpeg."""
    return (txt.replace("\\", "\\\\").replace(":", "\\:")
               .replace("'", "’").replace("%", "\\%"))


def drawtext(texto, fonte, tam, cor, y, enable=None, box=False,
             box_cor="black@0.55", box_pad=18, line_spacing=10):
    partes = [
        f"fontfile={fonte}",
        f"text='{esc(texto)}'",
        f"fontsize={tam}",
        f"fontcolor={cor}",
        "x=(w-text_w)/2",
        f"y={y}",
        f"line_spacing={line_spacing}",
    ]
    if box:
        partes += ["box=1", f"boxcolor={box_cor}", f"boxborderw={box_pad}"]
    if enable:
        partes.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(partes)


def dur_video(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def faz_cartela(clipe, t, dur, saida, chapeu=None, titulo=None,
                corpo=None, rodape=None, escurecer=0.35):
    """Congela o frame em `t` e escreve o texto dentro de um painel."""
    # alturas de cada bloco, pra dimensionar o painel
    H_CHAPEU, TAM_CHAPEU = 46, 30
    TAM_TITULO, LH_TITULO = 54, 72
    TAM_CORPO, LH_CORPO = 34, 46
    PAD = 44

    n_tit = titulo.count("\n") + 1 if titulo else 0
    n_cor = corpo.count("\n") + 1 if corpo else 0

    alt = PAD * 2
    alt += H_CHAPEU + 16 if chapeu else 0
    alt += LH_TITULO * n_tit + (18 if corpo else 0) if titulo else 0
    alt += LH_CORPO * n_cor if corpo else 0

    painel_x, painel_w = 44, W - 88
    painel_y = (H - RODAPE_SEGURO) // 2 - alt // 2

    filtros = [
        f"scale={W}:{H}",
        f"drawbox=x=0:y=0:w={W}:h={H}:color=black@{escurecer}:t=fill",
        f"drawbox=x={painel_x}:y={painel_y}:w={painel_w}:h={alt}"
        f":color=black@0.72:t=fill",
        # filete magenta no topo do painel, assinatura da marca
        f"drawbox=x={painel_x}:y={painel_y}:w={painel_w}:h=6"
        f":color={MAGENTA}:t=fill",
    ]

    y = painel_y + PAD
    if chapeu:
        filtros.append(drawtext(chapeu.upper(), FONT_SEMI, TAM_CHAPEU,
                                MAGENTA, y))
        y += H_CHAPEU + 16
    if titulo:
        filtros.append(drawtext(titulo, FONT_BOLD, TAM_TITULO, BRANCO, y,
                                line_spacing=LH_TITULO - TAM_TITULO))
        y += LH_TITULO * n_tit + (18 if corpo else 0)
    if corpo:
        filtros.append(drawtext(corpo, FONT_MED, TAM_CORPO, BEGE, y,
                                line_spacing=LH_CORPO - TAM_CORPO))
    if rodape:
        filtros.append(drawtext(rodape, FONT_SEMI, 32, BEGE,
                                H - RODAPE_SEGURO + 40))

    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-ss", str(t), "-i", str(clipe), "-frames:v", "1",
        "-vf", ",".join(filtros), "-f", "image2", "-update", "1",
        str(saida) + ".png",
    ], check=True)

    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-loop", "1", "-i", str(saida) + ".png", "-t", str(dur),
        "-r", str(FPS), "-pix_fmt", "yuv420p",
        "-c:v", "libx264", "-crf", "18", str(saida),
    ], check=True)


def prepara_clipe(clipe, legendas, saida, ate=None):
    """Normaliza o clipe e queima as legendas em movimento."""
    filtros = [f"scale={W}:{H}", f"fps={FPS}"]
    for leg in legendas:
        y = H - RODAPE_SEGURO - 90
        filtros.append(drawtext(
            leg["texto"], FONT_SEMI, 40, BRANCO, y,
            enable=f"between(t,{leg['de']},{leg['ate']})",
            box=True, box_cor="black@0.5"))
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(clipe)]
    if ate is not None:
        cmd += ["-t", str(ate)]
    cmd += ["-vf", ",".join(filtros), "-an",
            "-r", str(FPS), "-pix_fmt", "yuv420p",
            "-c:v", "libx264", "-crf", "18", str(saida)]
    subprocess.run(cmd, check=True)


def main():
    roteiro = json.loads(Path(sys.argv[1]).read_text())
    saida = sys.argv[2]
    tmp = Path(tempfile.mkdtemp())
    clipes = roteiro["clipes"]

    # cada clipe vira: [cartelas que caem nele, na ordem] intercaladas
    pedacos = []
    for i, clipe in enumerate(clipes):
        legendas = [l for l in roteiro.get("legendas", [])
                    if l.get("clipe", 0) == i]
        cortes = sorted([c for c in roteiro.get("cartelas", [])
                         if c.get("clipe", 0) == i],
                        key=lambda c: c["t"])

        base = tmp / f"clipe{i}.mp4"
        prepara_clipe(clipe, legendas, base,
                      ate=roteiro.get("cortar", {}).get(str(i)))
        total = dur_video(base)

        inicio = 0.0
        for j, cart in enumerate(cortes):
            t = cart["t"]
            if t > inicio:                     # trecho de vídeo antes
                trecho = tmp / f"c{i}_v{j}.mp4"
                subprocess.run([
                    "ffmpeg", "-v", "error", "-y", "-i", str(base),
                    "-ss", str(inicio), "-to", str(t),
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                    str(trecho)], check=True)
                pedacos.append(trecho)
            cart_mp4 = tmp / f"c{i}_cart{j}.mp4"
            faz_cartela(base, t, cart["dur"], cart_mp4,
                        chapeu=cart.get("chapeu"),
                        titulo=cart.get("titulo"),
                        corpo=cart.get("corpo"),
                        rodape=cart.get("rodape"),
                        escurecer=cart.get("escurecer", 0.55))
            pedacos.append(cart_mp4)
            inicio = t
        if inicio < total:                     # resto do clipe
            resto = tmp / f"c{i}_fim.mp4"
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(base),
                "-ss", str(inicio), "-c:v", "libx264", "-crf", "18",
                "-pix_fmt", "yuv420p", str(resto)], check=True)
            pedacos.append(resto)

    lista = tmp / "lista.txt"
    lista.write_text("".join(f"file '{p}'\n" for p in pedacos))
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c:v", "libx264", "-crf", "18",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", saida,
    ], check=True)
    print(f"pronto: {saida} ({dur_video(saida):.1f}s)")


if __name__ == "__main__":
    main()
