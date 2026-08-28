#!/usr/bin/env python3
"""Vídeo de memória (aniversário, mesversário, retrospectiva).

Uso:
    python3 montar-memoria.py roteiro.json saida.mp4


Nada a ver com o motor de b-roll: ali o corte é seco de propósito, porque
é conteúdo. Aqui a passagem entre um momento e outro é a coisa, então as
cenas se dissolvem uma na outra (`xfade`) em vez de cortar.

Sem marca, sem CTA, sem cor de identidade. Só o texto e as imagens.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

# o detector de rosto mora ao lado deste arquivo
sys.path.insert(0, str(Path(__file__).parent))

from PIL import ImageFont

W, H, FPS = 1080, 1920, 30
CRUZA = 0.7                       # duração de cada dissolve

CREME = (244, 237, 230)      # fundo dos cartões
ESCURO = (58, 50, 44)        # texto sobre o creme
# o texto sobre imagem sai num creme quente, não em branco puro: o branco
# bate de frente com céu e com lençol claro e some
CREME_TXT = (250, 244, 234)
BRANCO = (255, 255, 255)

# EB Garamond no lugar da Playfair: a Playfair tem contraste de revista,
# ótimo pra manchete de conteúdo e frio pra isso aqui. A Garamond é
# humanista, tem a suavidade que o assunto pede.
GAR = {"Regular": "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Regular.otf",
       "SemiBold": "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf",
       "Black": "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Bold.otf",
       "Italic": "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Italic.otf"}
FAM = {k: "EB Garamond" for k in GAR}
NEGRITO = {"SemiBold", "Black"}
ITALICO = {"Italic"}


def hms(t):
    return f"{int(t//3600)}:{int((t%3600)//60):02d}:{t%60:05.2f}"


def cor(rgb):
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}"


def caixa(x0, y0, x1, y1, rgb, de, ate, alfa=0):
    return (f"Dialogue: 0,{hms(de)},{hms(ate)},caixa,,0,0,0,,"
            f"{{\\pos(0,0)\\c{cor(rgb)}\\alpha&H{alfa:02X}&\\p1}}"
            f"m {x0} {y0} l {x1} {y0} {x1} {y1} {x0} {y1}{{\\p0}}")


def linha(txt, y, tam, rgb, de, ate, peso="Regular", alinha=8, esp=0,
          sombra=True, entra=500, sai=500):
    """Uma linha centrada, com fade generoso: aqui a leitura é lenta."""
    # halo escuro desfocado no lugar de sombra deslocada: sombra com
    # offset lê como a mesma letra impressa duas vezes, que foi o que ela
    # viu. O halo some no fundo e só sustenta o contraste.
    sh = ("\\bord9\\blur18\\3c&H00000000&\\shad0" if sombra
          else "\\bord0\\shad0")
    e = f"\\fsp{esp}" if esp else ""
    est = ("\\b1" if peso in NEGRITO else "") + \
          ("\\i1" if peso in ITALICO else "")
    return (f"Dialogue: 2,{hms(de)},{hms(ate)},base,,0,0,0,,"
            f"{{\\an{alinha}\\pos({W//2},{y})\\fn{FAM[peso]}\\fs{tam}"
            f"{est}\\c{cor(rgb)}{sh}{e}\\fad({entra},{sai})}}{txt}")


def quebra(txt, arq, tam, largura):
    f = ImageFont.truetype(arq, tam)
    saida = []
    for bruta in txt.split("\n"):
        atual = ""
        for p in bruta.split():
            t = f"{atual} {p}".strip()
            if f.getlength(t) <= largura or not atual:
                atual = t
            else:
                saida.append(atual)
                atual = p
        saida.append(atual)
    return saida


def bloco(txt, de, ate, tam, y, rgb=BRANCO, peso="Regular", alinha=8,
          sombra=True):
    """Parágrafo curto sobre a imagem, quebrado na largura real."""
    linhas = quebra(txt, GAR[peso], tam, W - 200)
    passo = round(tam * 1.34)
    ev = []
    for i, l in enumerate(linhas):
        ev.append(linha(l, y + i * passo, tam, rgb, de, ate, peso, alinha,
                        sombra=sombra))
    return ev


def ass(caminho, eventos):
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: caixa,Arial,20,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: base,EB Garamond,60,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,0,0,8,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    Path(caminho).write_text(cab + "\n".join(eventos) + "\n")


def cartao(tmp, nome, dur, eventos, fundo, saida):
    a = tmp / f"{nome}.ass"
    ass(a, eventos)
    c = str(a).replace(":", r"\:")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "lavfi",
        "-i", f"color=c=0x{fundo[0]:02X}{fundo[1]:02X}{fundo[2]:02X}:"
              f"s={W}x{H}:r={FPS}:d={dur}",
        "-vf", f"subtitles='{c}':fontsdir=/usr/share/fonts,"
               f"format=yuv420p",
        "-c:v", "libx264", "-crf", "17", *COR, str(saida)], check=True)


HDR = "arib-std-b67"
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,"
           "format=yuv420p")
COR = ["-colorspace", "bt709", "-color_primaries", "bt709",
       "-color_trc", "bt709", "-color_range", "tv"]


def eh_hdr(caminho):
    """iPhone grava em HLG/bt2020. Jogar isso pra bt709 sem tone mapping
    lava a imagem e puxa pro azul — era o 'azulado' do primeiro corte."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=color_transfer", "-of",
         "default=nw=1:nk=1", str(caminho)],
        capture_output=True, text=True).stdout.strip()
    return out == HDR


def veu(vf, esc):
    if esc:
        # véu preto leve: texto branco sobre foto clara desaparece, e um
        # contorno duro estragaria a delicadeza que a peça pede
        vf.append(f"drawbox=x=0:y=0:w={W}:h={H}:color=black@{esc}:t=fill")
    return vf


def prepara(c, i, tmp):
    """Recorta, escala pro 9:16 e ajusta a velocidade de um clipe."""
    p = tmp / f"p{i}.mp4"
    de, ate = c["trecho"]
    vf = [TONEMAP] if eh_hdr(c["video"]) else []
    vf += [f"scale={W}:{H}:force_original_aspect_ratio=increase",
           f"crop={W}:{H}"]
    vel = c.get("velocidade", 1)
    if vel != 1:
        vf.append(f"setpts={1/vel:.4f}*PTS")
    vf.append(f"fps={FPS}")
    z = c.get("zoom")
    if z:
        # aproximação lenta num ponto do quadro. Tem que vir depois do
        # setpts e do fps: o zoompan reescreve a base de tempo, e esticar o
        # PTS depois dele multiplica a duração.
        #
        # O ponto pode andar (px,py) -> (px2,py2): num plano em que o
        # assunto atravessa o quadro, centro fixo perde ele no caminho.
        quadros = round((ate - de) / vel * FPS)
        px2, py2 = z.get("px2", z["px"]), z.get("py2", z["py"])
        cx = f"({z['px']}+{px2 - z['px']:+.4f}*on/{quadros})"
        cy = f"({z['py']}+{py2 - z['py']:+.4f}*on/{quadros})"
        vf.append(
            f"zoompan=z='1+{z['para']-1:.3f}*on/{quadros}'"
            f":x='clip(iw*{cx}-(iw/zoom)/2,0,iw-iw/zoom)'"
            f":y='clip(ih*{cy}-(ih/zoom)/2,0,ih-ih/zoom)'"
            f":d=1:s={W}x{H}:fps={FPS}")
    cong = c.get("congela", 0)
    if cong:
        # segura o último quadro: o beijo é o fim do clipe, e sem a pausa
        # ele seria justamente o pedaço que a dissolvência come
        vf.append(f"tpad=stop_mode=clone:stop_duration={cong}")
    vf = veu(vf, c.get("escurecer", 0))
    vf.append("format=yuv420p")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(de), "-t", str(ate - de),
        "-i", c["video"], "-vf", ",".join(vf), "-an",
        "-c:v", "libx264", "-crf", "17", *COR, str(p)], check=True)
    return p


def prepara_foto(c, i, tmp):
    """Foto vira clipe com um zoom lento.

    Foto parada no meio de vídeo trava a peça: o olho percebe que ali
    nada acontece. Um zoom de 8% ao longo do plano resolve sem virar
    efeito.

    `foco` desloca o recorte na horizontal (0 esquerda, 1 direita): a
    foto é 3:4 e o 9:16 come um quarto da largura, então quem manda é
    onde está o assunto, não o centro geométrico.
    """
    p = tmp / f"p{i}.mp4"
    d = c["dur"]
    quadros = round(d * FPS)
    foco = c.get("foco", 0.5)
    # o recorte sai de uma cópia grande, senão o zoom mostra o pixel
    vf = [f"scale=-2:{H*2}",
          f"crop={W*2}:{H*2}:'(iw-ow)*{foco}':0",
          f"zoompan=z='min(1+0.08*on/{quadros},1.08)'"
          f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
          f":d=1:s={W}x{H}:fps={FPS}"]
    if c.get("nitidez"):
        # foto com desfoque de movimento não fica nítida, mas a borda
        # ganha definição suficiente pra não parecer erro de arquivo
        vf.append(f"unsharp=5:5:{c['nitidez']}:3:3:0")
    vf = veu(vf, c.get("escurecer", 0))
    vf.append("format=yuv420p")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS),
        "-t", str(d), "-i", c["foto"], "-vf", ",".join(vf),
        "-c:v", "libx264", "-crf", "17", *COR, str(p)], check=True)
    return p


def dur(p):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(p)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def altura_do_texto(bl, tam, cenas, partes, tempos):
    """Onde a frase cabe nesse trecho, medindo o quadro.

    Mesmo critério do motor de b-roll: nunca em cima de rosto, e onde
    sobra vão no meio do quadro é lá que ela vai, não no rodapé. Aqui isso
    pesa mais ainda, porque a frase é grande e é o que carrega a peça.
    """
    from detecta_rosto import margens_por_bloco

    meio = (bl["de"] + bl["ate"]) / 2
    i = max(j for j, t in enumerate(tempos) if t <= meio)
    if cenas[i].get("cartao"):
        return round(H * 0.42)
    linhas = quebra(bl["txt"], GAR[bl.get("peso", "Regular")], tam, W - 200)
    alt = len(linhas) * round(tam * 1.34)
    de, ate = bl["de"] - tempos[i], bl["ate"] - tempos[i]
    margem = margens_por_bloco(partes[i], [(max(0, de), ate)], H, alt,
                               round(H * 0.155))[0]
    # margens_por_bloco fala em distância do pé do quadro até a base do
    # texto; aqui o texto é ancorado pelo topo
    return max(round(H * 0.05), H - margem - alt)


def main():
    roteiro = json.loads(Path(sys.argv[1]).read_text())
    saida = sys.argv[2]
    tmp = Path(tempfile.mkdtemp())

    partes, tempos = [], []
    t = 0.0
    for i, c in enumerate(roteiro["cenas"]):
        if c.get("cartao"):
            p = tmp / f"c{i}.mp4"
            cartao(tmp, f"c{i}", c["dur"], [], c.get("fundo", CREME), p)
        elif c.get("foto"):
            p = prepara_foto(c, i, tmp)
        else:
            p = prepara(c, i, tmp)
        partes.append(p)
        tempos.append(t)
        # cada dissolve consome CRUZA do fim de um e do começo do outro
        t += dur(p) - (CRUZA if i < len(roteiro["cenas"]) - 1 else 0)
    total = t

    # cadeia de xfade: v0 cruza com v1, o resultado cruza com v2, e assim
    # por diante. O offset é sempre o instante em que a próxima entra.
    entradas = []
    for p in partes:
        entradas += ["-i", str(p)]
    filtros, atual, off = [], "0:v", 0.0
    for i in range(1, len(partes)):
        off = tempos[i]
        rot = f"x{i}"
        filtros.append(f"[{atual}][{i}:v]xfade=transition=fade:"
                       f"duration={CRUZA}:offset={off:.3f}[{rot}]")
        atual = rot
    cadeia = ";".join(filtros)

    # o texto entra por cima da cadeia já montada, pra atravessar dissolve
    eventos = []
    for bl in roteiro["texto"]:
        tam = bl.get("tam", 62)
        y = bl.get("y")
        if y is None:
            y = altura_do_texto(bl, tam, roteiro["cenas"], partes, tempos)
        eventos += bloco(bl["txt"], bl["de"], bl["ate"], tam, y,
                         tuple(bl.get("cor", CREME_TXT)),
                         bl.get("peso", "Regular"), bl.get("alinha", 8),
                         bl.get("sombra", True))
    a = tmp / "texto.ass"
    ass(a, eventos)
    cam = str(a).replace(":", r"\:")
    vf = f"[{atual}]subtitles='{cam}':fontsdir=/usr/share/fonts[v]"

    subprocess.run([
        "ffmpeg", "-v", "error", "-y", *entradas,
        "-filter_complex", f"{cadeia};{vf}", "-map", "[v]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", *COR, "-r", str(FPS), "-movflags", "+faststart",
        saida], check=True)
    print(f"pronto: {saida} ({total:.1f}s)")


if __name__ == "__main__":
    main()
