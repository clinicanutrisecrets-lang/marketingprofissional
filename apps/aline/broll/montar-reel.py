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
import textwrap
from pathlib import Path

from PIL import ImageFont

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


def quebra(texto, fonte, tam, largura):
    """Quebra o texto pra caber na largura, medindo com a fonte real.

    Respeita as quebras que o roteiro já trouxe (\n) e só reparte a linha
    que passa da largura — evita frase cortada pela borda do painel.
    """
    f = ImageFont.truetype(fonte, tam)
    saida = []
    for bruta in texto.split("\n"):
        if f.getlength(bruta) <= largura:
            saida.append(bruta)
            continue
        linha = ""
        for palavra in bruta.split():
            teste = f"{linha} {palavra}".strip()
            if f.getlength(teste) <= largura:
                linha = teste
            else:
                if linha:
                    saida.append(linha)
                linha = palavra
        if linha:
            saida.append(linha)
    return saida


def dur_video(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def faz_cartela(clipe, t, dur, saida, chapeu=None, titulo=None,
                corpo=None, rodape=None, escurecer=0.0):
    """Congela o frame em `t` e escreve o texto dentro de um painel."""
    # alturas de cada bloco, pra dimensionar o painel
    H_CHAPEU, TAM_CHAPEU = 46, 30
    TAM_TITULO, LH_TITULO = 54, 72
    TAM_CORPO, LH_CORPO = 34, 46
    PAD = 44

    painel_x, painel_w = 44, W - 88
    texto_w = painel_w - PAD * 2          # largura útil dentro do painel

    linhas_tit = quebra(titulo, FONT_BOLD, TAM_TITULO, texto_w) if titulo else []
    # corpo reflui como parágrafo: quebra do roteiro vira espaço, senão
    # sobram linhas órfãs de uma palavra
    linhas_cor = (quebra(" ".join(corpo.split("\n")), FONT_MED, TAM_CORPO,
                         texto_w) if corpo else [])

    alt = PAD * 2
    alt += H_CHAPEU + 16 if chapeu else 0
    alt += LH_TITULO * len(linhas_tit) + (18 if corpo else 0) if titulo else 0
    alt += LH_CORPO * len(linhas_cor) if corpo else 0

    painel_y = (H - RODAPE_SEGURO) // 2 - alt // 2

    filtros = []
    if escurecer:
        filtros.append(
            f"drawbox=x=0:y=0:w={W}:h={H}:color=black@{escurecer}:t=fill")
    filtros += [
        f"drawbox=x={painel_x}:y={painel_y}:w={painel_w}:h={alt}"
        f":color=black@0.82:t=fill",
        # filete magenta no topo do painel, assinatura da marca
        f"drawbox=x={painel_x}:y={painel_y}:w={painel_w}:h=6"
        f":color={MAGENTA}:t=fill",
    ]

    # revelação escalonada: cada bloco entra um pouco depois do anterior
    passo = 0.28
    quando = 0.0

    y = painel_y + PAD
    if chapeu:
        filtros.append(drawtext(chapeu.upper(), FONT_SEMI, TAM_CHAPEU,
                                MAGENTA, y, enable=f"gte(t,{quando:.2f})"))
        y += H_CHAPEU + 16
        quando += passo
    for linha in linhas_tit:
        filtros.append(drawtext(linha, FONT_BOLD, TAM_TITULO, BRANCO, y,
                                enable=f"gte(t,{quando:.2f})"))
        y += LH_TITULO
        quando += passo
    if linhas_tit and corpo:
        y += 18
    for linha in linhas_cor:
        filtros.append(drawtext(linha, FONT_MED, TAM_CORPO, BEGE, y,
                                enable=f"gte(t,{quando:.2f})"))
        y += LH_CORPO
        quando += passo * 0.7
    if rodape:
        filtros.append(drawtext(rodape, FONT_SEMI, 32, BEGE,
                                H - RODAPE_SEGURO + 40))

    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-ss", str(t), "-i", str(clipe), "-frames:v", "1",
        "-vf", f"scale={W}:{H}", "-f", "image2", "-update", "1",
        str(saida) + ".png",
    ], check=True)

    frames = max(2, int(dur * FPS))
    # zoom lento no frame congelado: nunca fica parado de verdade.
    # eq compensa o painel escuro, que puxa a cor média pra baixo e faz o
    # congelamento parecer desbotado ao lado do vídeo em movimento.
    zoom = (f"zoompan=z='min(zoom+0.0005,1.05)':d={frames}"
            f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}"
            f",eq=saturation=1.18:brightness=0.03")

    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-loop", "1", "-i", str(saida) + ".png", "-t", str(dur),
        "-vf", zoom + "," + ",".join(filtros),
        "-r", str(FPS), "-pix_fmt", "yuv420p",
        "-c:v", "libx264", "-crf", "18", str(saida),
    ], check=True)


def prepara_clipe(clipe, legendas, saida, ate=None, trechos=None):
    """Normaliza o clipe, tira os trechos ruins e queima as legendas.

    `trechos` é uma lista [[de, ate], ...] com o que APROVEITAR — serve pra
    pular momentos em que a IA desenhou uma mão. As legendas são aplicadas
    depois do corte, então seus tempos são do vídeo já limpo.
    """
    fonte = clipe
    if trechos:
        partes = []
        tmpdir = Path(saida).parent
        for k, (de, ate_t) in enumerate(trechos):
            p = tmpdir / f"{Path(saida).stem}_t{k}.mp4"
            subprocess.run([
                "ffmpeg", "-v", "error", "-y", "-i", str(clipe),
                "-ss", str(de), "-to", str(ate_t),
                "-vf", f"scale={W}:{H},fps={FPS}", "-an",
                "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                str(p)], check=True)
            partes.append(p)
        lista = tmpdir / f"{Path(saida).stem}_lista.txt"
        lista.write_text("".join(f"file '{p}'\n" for p in partes))
        fonte = tmpdir / f"{Path(saida).stem}_juntos.mp4"
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
            "-i", str(lista), "-c", "copy", str(fonte)], check=True)

    filtros = [f"scale={W}:{H}", f"fps={FPS}"]
    for leg in legendas:
        y = H - RODAPE_SEGURO - 90
        filtros.append(drawtext(
            leg["texto"], FONT_SEMI, 40, BRANCO, y,
            enable=f"between(t,{leg['de']},{leg['ate']})",
            box=True, box_cor="black@0.5"))
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(fonte)]
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
                      ate=roteiro.get("cortar", {}).get(str(i)),
                      trechos=roteiro.get("trechos", {}).get(str(i)))
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
