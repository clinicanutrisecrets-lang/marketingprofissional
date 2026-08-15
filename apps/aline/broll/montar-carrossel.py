#!/usr/bin/env python3
"""
Monta carrossel-vídeo do Nutri Secrets: fotos + faixa de texto, animadas.

Uso:
    python3 montar-carrossel.py roteiro.json saida.mp4

A foto ganha zoom lento (Ken Burns) e a faixa de texto fica parada por
cima — se o texto subir junto com o zoom, a faixa "respira" e denuncia o
efeito.

Formato do roteiro (JSON):
{
  "fotos": {"a": "foto1.png", "b": "foto2.png"},
  "slides": [
    {"tipo": "capa", "fotos": ["a", "b"], "dur": 4.5,
     "chapeu": "NUTRIGENÉTICA",
     "titulo": "Como eu **interpreto** um teste"},
    {"foto": "a", "pos": "baixo", "dur": 4.0,
     "texto": "Eu nunca começo pelo **gene**."}
  ]
}

`pos` é onde a faixa de texto entra: "baixo" ou "cima".
`**palavra**` no texto sai em Tiffany.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Paleta Nutri Secrets
TIFFANY = (10, 186, 181)
DARK_TEAL = (14, 89, 89)
MAGENTA = (214, 51, 108)
BEGE = (245, 230, 211)
BRANCO = (255, 255, 255)

FONT_BOLD = "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf"

W, H = 1080, 1920         # 9:16
FPS = 30
MARGEM = 88
FADE = 0.4                # crossfade entre slides
COR = ["-color_range", "tv", "-colorspace", "bt709",
       "-color_primaries", "bt709", "-color_trc", "bt709"]
FMT = "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p"


def pedacos(texto):
    """Quebra `a **b** c` em [(a, False), (b, True), (c, False)]."""
    saida = []
    for parte in re.split(r"(\*\*[^*]+\*\*)", texto):
        if not parte:
            continue
        if parte.startswith("**"):
            saida.append((parte[2:-2], True))
        else:
            saida.append((parte, False))
    return saida


def tokens(texto):
    """Quebra em palavras, cada uma com seus trechos e destaques.

    Uma palavra pode ter destaque parcial — `**queixa**.` é um token só,
    com o ponto final colado. Se a pontuação virasse token separado, o
    espaço entre palavras a jogaria pra longe ("queixa .").
    """
    saida, novo = [], True
    for trecho, marcado in pedacos(texto):
        for i, p in enumerate(trecho.split(" ")):
            if i > 0 or not p:
                novo = True
            if not p:
                continue
            if novo or not saida:
                saida.append([(p, marcado)])
                novo = False
            else:
                saida[-1].append((p, marcado))
    return saida


def larg_token(token, fonte):
    return sum(fonte.getlength(t) for t, _ in token)


def quebra_marcado(texto, fonte, largura):
    """Quebra em linhas preservando o destaque, medindo com a fonte real.

    Respeita as quebras que o roteiro trouxe (\\n) e só reparte a linha que
    passa da largura. Sem isso a frase curta com destaque no fim deixa a
    palavra destacada sozinha numa linha órfã.
    """
    espaco = fonte.getlength(" ")
    linhas = []
    for bruta in texto.split("\n"):
        atual, larg = [], 0.0
        for token in tokens(bruta):
            lt = larg_token(token, fonte)
            extra = lt + (espaco if atual else 0)
            if larg + extra <= largura or not atual:
                atual.append(token)
                larg += extra
            else:
                linhas.append(atual)
                atual, larg = [token], lt
        if atual:
            linhas.append(atual)
    return linhas


def escreve_linha(draw, linha, fonte, y, cor_base, cor_destaque, largura):
    """Desenha uma linha centralizada, token a token, com destaque."""
    espaco = fonte.getlength(" ")
    total = (sum(larg_token(t, fonte) for t in linha)
             + espaco * (len(linha) - 1))
    x = (largura - total) / 2
    for token in linha:
        for txt, marcado in token:
            draw.text((x, y), txt, font=fonte,
                      fill=cor_destaque if marcado else cor_base)
            x += fonte.getlength(txt)
        x += espaco


def cobre(caminho, larg, alt):
    """Recorta a foto pra preencher a caixa sem distorcer."""
    img = Image.open(caminho).convert("RGB")
    escala = max(larg / img.width, alt / img.height)
    nova = img.resize((round(img.width * escala), round(img.height * escala)),
                      Image.LANCZOS)
    # corte centrado na horizontal, um pouco acima do centro na vertical:
    # em retrato o rosto costuma ficar no terço de cima
    x = (nova.width - larg) // 2
    y = max(0, int((nova.height - alt) * 0.35))
    return nova.crop((x, y, x + larg, y + alt))


def faixa_texto(draw, y0, altura, texto, tam, cor_fundo=BEGE,
                cor_base=DARK_TEAL, cor_destaque=TIFFANY, rodape=None):
    """Desenha a faixa de texto e devolve nada — escreve no draw."""
    draw.rectangle([0, y0, W, y0 + altura], fill=cor_fundo)
    fonte = ImageFont.truetype(FONT_BOLD, tam)
    linhas = quebra_marcado(texto, fonte, W - MARGEM * 2)
    alt_linha = int(tam * 1.32)
    alt_bloco = alt_linha * len(linhas)
    y = y0 + (altura - alt_bloco) // 2
    if rodape:
        y -= 26
    for linha in linhas:
        escreve_linha(draw, linha, fonte, y, cor_base, cor_destaque, W)
        y += alt_linha
    if rodape:
        f = ImageFont.truetype(FONT_SEMI, 30)
        larg = f.getlength(rodape)
        draw.text(((W - larg) / 2, y0 + altura - 62), rodape, font=f,
                  fill=TIFFANY)


def slide_capa(fotos, chapeu, titulo, sub, rodape):
    """Foto em cima, faixa de texto no meio, foto embaixo."""
    alt_faixa = 560
    alt_foto = (H - alt_faixa) // 2
    base = Image.new("RGB", (W, H), BEGE)
    base.paste(cobre(fotos[0], W, alt_foto), (0, 0))
    base.paste(cobre(fotos[-1], W, H - alt_foto - alt_faixa),
               (0, alt_foto + alt_faixa))

    draw = ImageDraw.Draw(base)
    y0 = alt_foto
    draw.rectangle([0, y0, W, y0 + alt_faixa], fill=BEGE)

    y = y0 + 62
    if chapeu:
        f = ImageFont.truetype(FONT_SEMI, 32)
        txt = chapeu.upper()
        larg = f.getlength(txt)
        # letter spacing manual: chapéu apertado fica pesado
        x = (W - (larg + 5 * (len(txt) - 1))) / 2
        for ch in txt:
            draw.text((x, y), ch, font=f, fill=TIFFANY)
            x += f.getlength(ch) + 5
        y += 62

    fonte = ImageFont.truetype(FONT_BOLD, 74)
    linhas = quebra_marcado(titulo, fonte, W - MARGEM * 2)
    for linha in linhas:
        escreve_linha(draw, linha, fonte, y, DARK_TEAL, TIFFANY, W)
        y += 94

    if sub:
        f = ImageFont.truetype(FONT_MED, 40)
        larg = f.getlength(sub)
        draw.text(((W - larg) / 2, y + 18), sub, font=f, fill=DARK_TEAL)

    if rodape:
        f = ImageFont.truetype(FONT_SEMI, 30)
        larg = f.getlength(rodape)
        draw.text(((W - larg) / 2, y0 + alt_faixa - 54), rodape, font=f,
                  fill=TIFFANY)
    return base


def slide_foto(foto, texto, pos, tam, rodape, fundo, cor_base, cor_destaque):
    """Foto grande e faixa de texto em cima ou embaixo."""
    alt_faixa = 470
    alt_foto = H - alt_faixa
    base = Image.new("RGB", (W, H), fundo)
    y_foto = alt_faixa if pos == "cima" else 0
    base.paste(cobre(foto, W, alt_foto), (0, y_foto))

    draw = ImageDraw.Draw(base)
    y0 = 0 if pos == "cima" else alt_foto
    faixa_texto(draw, y0, alt_faixa, texto, tam, fundo, cor_base,
                cor_destaque, rodape)
    return base


def anima(png, dur, saida, zoom=True):
    """Zoom lento na imagem inteira, sem mexer no enquadramento do texto.

    A faixa é sólida e ocupa a largura toda, então o zoom leve nela não
    aparece — o que apareceria é um corte na borda, e por isso o zoom fica
    abaixo de 3%.
    """
    frames = max(2, int(dur * FPS))
    if zoom:
        vf = (f"scale={W*2}:-1,zoompan=z='min(zoom+0.00035,1.03)':d={frames}"
              f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}")
    else:
        vf = f"scale={W}:{H},fps={FPS}"
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-loop", "1", "-i", str(png),
        "-t", str(dur), "-vf", vf + "," + FMT,
        "-r", str(FPS), "-pix_fmt", "yuv420p", *COR,
        "-c:v", "libx264", "-crf", "17", str(saida)], check=True)


def main():
    roteiro = json.loads(Path(sys.argv[1]).read_text())
    saida = sys.argv[2]
    tmp = Path(tempfile.mkdtemp())
    fotos = roteiro["fotos"]
    rodape_geral = roteiro.get("rodape")

    partes = []
    for i, s in enumerate(roteiro["slides"]):
        png = tmp / f"s{i}.png"
        if s.get("tipo") == "capa":
            img = slide_capa([fotos[k] for k in s["fotos"]],
                             s.get("chapeu"), s["titulo"], s.get("sub"),
                             s.get("rodape", rodape_geral))
        else:
            img = slide_foto(fotos[s["foto"]], s["texto"],
                             s.get("pos", "baixo"), s.get("tam", 58),
                             s.get("rodape"),
                             tuple(s["fundo"]) if s.get("fundo") else BEGE,
                             tuple(s["cor"]) if s.get("cor") else DARK_TEAL,
                             tuple(s["destaque"]) if s.get("destaque")
                             else TIFFANY)
        img.save(png)
        mp4 = tmp / f"s{i}.mp4"
        anima(png, s.get("dur", 4.0), mp4, zoom=s.get("zoom", True))
        partes.append((mp4, s.get("dur", 4.0)))

    # crossfade encadeado: cada xfade come FADE do total
    entradas, filtros = [], []
    for mp4, _ in partes:
        entradas += ["-i", str(mp4)]
    corrente = "[0:v]"
    deslocamento = partes[0][1] - FADE
    for k in range(1, len(partes)):
        rotulo = f"[x{k}]"
        filtros.append(f"{corrente}[{k}:v]xfade=transition=fade:"
                       f"duration={FADE}:offset={deslocamento:.2f}{rotulo}")
        corrente = rotulo
        deslocamento += partes[k][1] - FADE
    filtros.append(f"{corrente}{FMT}[saida]")

    subprocess.run([
        "ffmpeg", "-v", "error", "-y", *entradas,
        "-filter_complex", ";".join(filtros), "-map", "[saida]",
        "-r", str(FPS), "-pix_fmt", "yuv420p", *COR,
        "-c:v", "libx264", "-crf", "17", "-movflags", "+faststart", saida,
    ], check=True)

    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", saida],
        capture_output=True, text=True, check=True)
    print(f"pronto: {saida} ({float(out.stdout.strip()):.1f}s)")


if __name__ == "__main__":
    main()
