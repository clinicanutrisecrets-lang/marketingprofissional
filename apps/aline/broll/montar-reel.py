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

from PIL import Image, ImageFont

# Paleta Nutri Secrets
TIFFANY = "0xABAB5"[0:0] or "#0ABAB5"
DARK_TEAL = "#0E5959"
MAGENTA = "#D6336C"
BEGE = "#F5E6D3"
BRANCO = "#FFFFFF"

FONT_BOLD = "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf"
FONT_LIGHT = "/usr/share/fonts/truetype/montserrat/Montserrat-Light.ttf"
# serifada italic pro destaque, no estilo das referências que a Aline mandou
FONT_SERIF_IT = "/usr/share/fonts/opentype/ebgaramond/EBGaramond12-Italic.otf"

W, H = 720, 1280          # 9:16
# faixa/matriz de cor iguais em TODOS os pedaços — senão o concat mistura
# marcações e o congelamento sai lavado ao lado do vídeo
COR = ["-color_range", "tv", "-colorspace", "bt709",
       "-color_primaries", "bt709", "-color_trc", "bt709"]
FMT = "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p"
FPS = 30
MARGEM = 72               # margem lateral segura
RODAPE_SEGURO = 260       # área de baixo que a UI do Instagram cobre


def esc(txt):
    """Escapa texto pro drawtext do ffmpeg.

    O `%` precisa de barra dupla: o filtergraph come uma e o drawtext
    precisa da outra pra não tentar expandir `%{...}` — com uma só, o
    ffmpeg avisa "Stray %" e não desenha nada.
    """
    return (txt.replace("\\", "\\\\").replace(":", "\\:")
               .replace("'", "’").replace("%", "\\\\%"))


def drawtext(texto, fonte, tam, cor, y, enable=None, box=False,
             box_cor="black@0.55", box_pad=18, line_spacing=10,
             sombra=False, x=None):
    partes = [
        f"fontfile={fonte}",
        f"text='{esc(texto)}'",
        f"fontsize={tam}",
        f"fontcolor={cor}",
        x if x else "x=(w-text_w)/2",
        f"y={y}",
        f"line_spacing={line_spacing}",
    ]
    if sombra:
        # sombra dupla: dá leitura sobre qualquer fundo sem precisar de caixa
        partes += ["shadowcolor=black@0.75", "shadowx=0", "shadowy=4",
                   "borderw=2", "bordercolor=black@0.35"]
    if box:
        partes += ["box=1", f"boxcolor={box_cor}", f"boxborderw={box_pad}"]
    if enable:
        partes.append(f"enable='{enable}'")
    return "drawtext=" + ":".join(partes)


def bloco_hero(pre, palavra, pos, y_centro, enable, cor_palavra=BRANCO,
               risco=None, tam_palavra=104, tam_apoio=44, fonte="serif"):
    """Texto grande no centro, sem caixa — estilo das referências.

    `pre` entra pequeno em cima, `palavra` grande em serifada italic no
    meio, `pos` pequeno embaixo. `risco` desenha uma linha por cima da
    palavra (o efeito do 'Energia' riscado de vermelho).
    """
    # sigla de gene em sans: a serifada italic usa algarismo antigo e o "1"
    # de FADS1 sai parecendo "i"
    fonte_pal = FONT_BOLD if fonte == "sans" else FONT_SERIF_IT
    f_pal = ImageFont.truetype(fonte_pal, tam_palavra)
    larg_pal = f_pal.getlength(palavra)

    filtros = []
    y = y_centro - tam_palavra // 2
    if pre:
        filtros.append(drawtext(pre, FONT_MED, tam_apoio, BRANCO,
                                y - tam_apoio - 14, enable=enable,
                                sombra=True))
    filtros.append(drawtext(palavra, fonte_pal, tam_palavra, cor_palavra,
                            y, enable=enable, sombra=True))
    if risco:
        y_risco = y + int(tam_palavra * 0.52)
        x0 = int((W - larg_pal) / 2) - 14
        filtros.append(
            f"drawbox=x={x0}:y={y_risco}:w={int(larg_pal) + 28}:h=7"
            f":color={risco}:t=fill:enable='{enable}'")
    if pos:
        filtros.append(drawtext(pos, FONT_LIGHT, tam_apoio, BRANCO,
                                y + int(tam_palavra * 1.05), enable=enable,
                                sombra=True))
    return filtros


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


def degrade_png(caminho, y, alt, opacidade=0.72, cor_filete=None):
    """Gera o degradê como PNG, pixel a pixel.

    Desenhar o degradê com faixas de `drawbox` deixa listras visíveis; a
    imagem gerada aqui tem rampa contínua e some suave nas duas pontas.
    """
    margem = int(alt * 0.34)
    topo, base = y - margem, y + alt + margem
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()
    for yy in range(max(0, topo), min(H, base)):
        if yy < y:                        # rampa de entrada
            f = (yy - topo) / max(1, y - topo)
        elif yy > y + alt:                # rampa de saída
            f = (base - yy) / max(1, base - (y + alt))
        else:
            f = 1.0
        a = int(255 * opacidade * max(0.0, min(1.0, f)) ** 1.4)
        if a <= 0:
            continue
        for xx in range(W):
            px[xx, yy] = (0, 0, 0, a)
    if cor_filete:
        rgb = tuple(int(cor_filete.lstrip("#")[i:i + 2], 16)
                    for i in (0, 2, 4))
        for yy in range(max(0, y - 4), max(0, y - 1)):
            for xx in range(W):
                px[xx, yy] = rgb + (235,)
    img.save(caminho)


def faz_cartela(clipe, t, dur, saida, chapeu=None, titulo=None,
                corpo=None, rodape=None, escurecer=0.0,
                cor_apoio=None):
    """Congela o frame em `t` e escreve o texto dentro de um painel."""
    # alturas de cada bloco, pra dimensionar o painel
    H_CHAPEU, TAM_CHAPEU = 46, 30
    TAM_TITULO, LH_TITULO = 48, 64
    TAM_CORPO, LH_CORPO = 34, 46
    PAD = 44

    cor_apoio = cor_apoio or TIFFANY
    painel_x, painel_w = 30, W - 60
    texto_w = painel_w - PAD * 2          # largura útil dentro do painel

    linhas_tit = quebra(titulo, FONT_BOLD, TAM_TITULO, texto_w) if titulo else []
    # corpo reflui como parágrafo: quebra do roteiro vira espaço, senão
    # sobram linhas órfãs de uma palavra
    linhas_cor = (quebra(" ".join(corpo.split("\n")), FONT_MED, TAM_CORPO,
                         texto_w) if corpo else [])

    linhas_cha = quebra(chapeu.upper(), FONT_SEMI, TAM_CHAPEU,
                        texto_w) if chapeu else []

    alt = PAD * 2
    alt += (H_CHAPEU * len(linhas_cha)) + 16 if chapeu else 0
    alt += LH_TITULO * len(linhas_tit) + (18 if corpo else 0) if titulo else 0
    alt += LH_CORPO * len(linhas_cor) if corpo else 0

    # painel na metade de baixo: sai de cima do rosto e ainda fica
    # acima da faixa que a UI do Instagram cobre
    painel_y = int(H * 0.56) - alt // 2

    filtros = []
    if escurecer:
        filtros.append(
            f"drawbox=x=0:y=0:w={W}:h={H}:color=black@{escurecer}:t=fill")
    grad = str(saida) + ".grad.png"
    degrade_png(grad, painel_y, alt, cor_filete=cor_apoio)

    # revelação escalonada: cada bloco entra um pouco depois do anterior
    passo = 0.20
    quando = 0.0

    y = painel_y + PAD
    for linha in linhas_cha:
        filtros.append(drawtext(linha, FONT_SEMI, TAM_CHAPEU, cor_apoio, y,
                                enable=f"gte(t,{quando:.2f})", sombra=True))
        y += H_CHAPEU
    if linhas_cha:
        y += 16
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

    corrente = [f"[0:v]{zoom}[base]", "[base][1:v]overlay=0:0[fundo]"]
    corrente.append("[fundo]" + ",".join(filtros or ["null"]) + ","
                    + FMT + "[saida]")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y",
        "-loop", "1", "-i", str(saida) + ".png",
        "-loop", "1", "-i", grad, "-t", str(dur),
        "-filter_complex", ";".join(corrente), "-map", "[saida]",
        "-r", str(FPS), "-pix_fmt", "yuv420p",
        *COR, "-c:v", "libx264", "-crf", "18", str(saida),
    ], check=True)


def prepara_clipe(clipe, legendas, saida, ate=None, trechos=None,
                  velocidade=None):
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
                "-vf", f"scale={W}:{H},fps={FPS}," + FMT, "-an",
                "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                *COR, str(p)], check=True)
            partes.append(p)
        lista = tmpdir / f"{Path(saida).stem}_lista.txt"
        lista.write_text("".join(f"file '{p}'\n" for p in partes))
        fonte = tmpdir / f"{Path(saida).stem}_juntos.mp4"
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
            "-i", str(lista), "-c", "copy", str(fonte)], check=True)

    filtros = [f"scale={W}:{H}"]
    if velocidade and velocidade != 1:
        # setpts alonga o tempo; os tempos das legendas já vêm na base lenta
        filtros.append(f"setpts={1 / velocidade:.4f}*PTS")
    filtros.append(f"fps={FPS}")
    for leg in legendas:
        quando = f"between(t,{leg['de']},{leg['ate']})"

        if leg.get("estilo") == "selo":
            # retângulo Tiffany com texto branco — chamada final
            tam = leg.get("tam", 46)
            f = ImageFont.truetype(FONT_BOLD, tam)
            larg = int(f.getlength(leg["texto"]))
            pad_x, pad_y = 34, 22
            cx = (W - larg) // 2 - pad_x
            cy = leg.get("y", int(H * 0.63))
            filtros.append(
                f"drawbox=x={cx}:y={cy}:w={larg + pad_x * 2}"
                f":h={tam + pad_y * 2}:color={leg.get('cor', TIFFANY)}"
                f":t=fill:enable='{quando}'")
            filtros.append(drawtext(
                leg["texto"], FONT_BOLD, tam, BRANCO,
                cy + pad_y - int(tam * 0.12), enable=quando))
            continue

        if leg.get("estilo") == "hero":
            filtros += bloco_hero(
                leg.get("pre"), leg["palavra"], leg.get("pos"),
                leg.get("y", int(H * 0.60)), quando,
                cor_palavra=leg.get("cor", BRANCO),
                risco=leg.get("risco"),
                tam_palavra=leg.get("tam", 104),
                fonte=leg.get("fonte", "serif"))
            continue

        # texto grande centralizado, sem caixa — legibilidade pela sombra
        tam = leg.get("tam", 62)
        cor = MAGENTA if leg.get("destaque") else BRANCO
        linhas = quebra(" ".join(leg["texto"].split("\n")), FONT_BOLD, tam,
                        W - 120)
        alt_linha = int(tam * 1.2)
        y0 = leg.get("y", int(H * 0.62)) - alt_linha * len(linhas) // 2
        for k, linha in enumerate(linhas):
            filtros.append(drawtext(
                linha, FONT_BOLD, tam, cor, y0 + alt_linha * k,
                enable=quando, sombra=True))
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(fonte)]
    if ate is not None:
        cmd += ["-t", str(ate)]
    cmd += ["-vf", ",".join(filtros) + "," + FMT, "-an",
            "-r", str(FPS), "-pix_fmt", "yuv420p",
            *COR, "-c:v", "libx264", "-crf", "18", str(saida)]
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
                      trechos=roteiro.get("trechos", {}).get(str(i)),
                      velocidade=roteiro.get("velocidade", {}).get(str(i)))
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
                    *COR, str(trecho)], check=True)
                pedacos.append(trecho)
            cart_mp4 = tmp / f"c{i}_cart{j}.mp4"
            faz_cartela(base, t, cart["dur"], cart_mp4,
                        chapeu=cart.get("chapeu"),
                        cor_apoio=cart.get("cor_apoio"),
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
                "-pix_fmt", "yuv420p", *COR, str(resto)], check=True)
            pedacos.append(resto)

    lista = tmp / "lista.txt"
    lista.write_text("".join(f"file '{p}'\n" for p in pedacos))
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c:v", "libx264", "-crf", "18",
        "-pix_fmt", "yuv420p", *COR, "-movflags", "+faststart", saida,
    ], check=True)
    print(f"pronto: {saida} ({dur_video(saida):.1f}s)")


if __name__ == "__main__":
    main()
