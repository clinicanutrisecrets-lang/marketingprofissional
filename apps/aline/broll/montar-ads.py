#!/usr/bin/env python3
"""Monta o anúncio vertical a partir de um vídeo de avatar 16:9.

O vídeo de avatar chega 9:16 com tarja branca em cima e em baixo. Em vez
de cortar as laterais pra preencher, aqui a tarja vira fundo de marca: o
16:9 fica no meio, o título mora em cima e a legenda embaixo, grande.

A legenda é karaokê palavra a palavra, que é o que segura atenção em
anúncio: cada palavra acende na cor da marca no instante em que é dita.
Tudo desenhado num .ass só, consumido pelo filtro `subtitles`, porque
compor PNG quadro a quadro nunca terminou um render de quatro minutos.

Uso:
    python3 montar-ads.py roteiro-ads.json
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1080, 1920
FPS = 25

# paleta da marca
TIFFANY = "&H00B5BA0A"
BRANCO = "&H00FFFFFF"
CREME = "&H00D3E6F5"
FUNDO = "0x0E5959"
SOMBRA = "&H00000000"

# famílias que existem mesmo: "Montserrat Bold" não é família, é estilo
FAM = "Montserrat"
FAM_BLACK = "Montserrat Black"

MAX_CHARS = 17          # por linha de legenda
# palavra de ligação sozinha no fim do bloco fica órfã na tela; vai junto
# com a próxima
LIGACAO = {"e", "ou", "de", "da", "do", "a", "o", "que", "para",
           "com", "em", "no", "na", "se", "um", "uma", "as", "os", "mas"}
MAX_PALAVRAS = 3        # por bloco
PAUSA = 0.38            # silêncio que quebra o bloco, em segundos


def hhmmss(t):
    t = max(0.0, t)
    return f"{int(t)//3600:d}:{(int(t)%3600)//60:02d}:{t%60:05.2f}"


def escapa(txt):
    return txt.replace("{", "(").replace("}", ")").replace("\n", "\\N")


def blocos_de(segmentos, correcoes):
    """Agrupa as palavras em blocos curtos, quebrando em pausa e em frase."""
    saida = []
    for seg in segmentos:
        atual = []
        anterior = None
        for w in seg.get("palavras", []):
            p = w["p"].strip()
            if not p:
                continue
            for errado, certo in correcoes.items():
                p = re.sub(rf"\b{re.escape(errado)}\b", certo, p, flags=re.I)
            quebra = (
                len(atual) >= MAX_PALAVRAS
                or (anterior is not None and w["i"] - anterior > PAUSA)
                or sum(len(x["p"]) + 1 for x in atual) + len(p) > MAX_CHARS
            )
            if atual and quebra:
                saida.append(atual)
                atual = []
            atual.append({"p": p, "i": w["i"], "f": w["f"]})
            anterior = w["f"]
            # ponto final fecha o bloco: a frase seguinte começa limpa
            if p.endswith((".", "!", "?")):
                saida.append(atual)
                atual = []
        if atual:
            saida.append(atual)
    # empurra a ligação órfã pro bloco seguinte
    for i in range(len(saida) - 1):
        while (len(saida[i]) > 1
               and saida[i][-1]["p"].strip(",.;:!?").lower() in LIGACAO):
            saida[i + 1].insert(0, saida[i].pop())
    return [b for b in saida if b]


def cabecalho():
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,{FAM_BLACK},86,{BRANCO},{BRANCO},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,5,0,5,60,60,60,1
Style: Titulo,{FAM_BLACK},96,{BRANCO},{BRANCO},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,0,0,8,60,60,60,1
Style: Chapeu,{FAM},40,{TIFFANY},{TIFFANY},{SOMBRA},{SOMBRA},1,0,0,0,100,100,10,0,1,0,0,8,60,60,60,1
Style: Cartao,{FAM_BLACK},150,{TIFFANY},{TIFFANY},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,6,0,5,60,60,60,1
Style: Apoio,{FAM},48,{CREME},{CREME},{SOMBRA},{SOMBRA},1,0,0,0,100,100,0,0,1,4,0,5,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def evento(de, ate, estilo, texto, layer=0):
    return (f"Dialogue: {layer},{hhmmss(de)},{hhmmss(ate)},{estilo},,0,0,0,,{texto}\n")


def linhas_do_bloco(bloco):
    """Quebra o bloco em até duas linhas, sem partir palavra."""
    linhas, atual = [], []
    for w in bloco:
        if atual and sum(len(x) + 1 for x in atual) + len(w["p"]) > MAX_CHARS:
            linhas.append(atual)
            atual = []
        atual.append(w["p"])
    if atual:
        linhas.append(atual)
    return linhas


def legenda(blocos, y, destaques):
    """Karaokê: um evento por palavra, a palavra do instante em tiffany."""
    fora = []
    for bloco in blocos:
        palavras = [w["p"] for w in bloco]
        grande = any(re.sub(r"\W", "", p).lower() in destaques for p in palavras)
        tam = 128 if grande else 96
        linhas = linhas_do_bloco(bloco)
        fim_bloco = bloco[-1]["f"] + 0.12
        for k, w in enumerate(bloco):
            de = w["i"] if k else max(0, w["i"] - 0.06)
            ate = bloco[k + 1]["i"] if k + 1 < len(bloco) else fim_bloco
            if ate - de < 0.08:
                ate = de + 0.08
            corpo, n = [], 0
            for linha in linhas:
                peca = []
                for p in linha:
                    ativa = n == k
                    peca.append(
                        f"{{\\c{TIFFANY}}}{escapa(p)}{{\\c{BRANCO}}}" if ativa
                        else escapa(p))
                    n += 1
                corpo.append(" ".join(peca))
            entrada = "\\fscx88\\fscy88\\t(0,110,\\fscx100\\fscy100)" if k == 0 else ""
            tags = (f"{{\\an5\\pos({W // 2},{y})\\fs{tam}\\bord5\\blur6"
                    f"\\c{BRANCO}{entrada}}}")
            fora.append(evento(de, ate, "Legenda", tags + "\\N".join(corpo)))
    return fora


def main():
    cfg = json.loads(Path(sys.argv[1]).read_text())
    base = Path(sys.argv[1]).parent
    origem = Path(cfg["video"])
    fala = json.loads((base / cfg["transcricao"]).read_text())
    destaques = {p.lower() for p in cfg.get("destaques", [])}
    correcoes = cfg.get("correcoes", {})

    # o 16:9 mora no meio; o resto do quadro é fundo de marca
    faixa = cfg["faixa"]                     # [y0, y1] no vídeo de origem
    alt_fonte = faixa[1] - faixa[0] + 1
    larg_fonte = cfg.get("largura_origem", 720)
    alt_video = round(W * alt_fonte / larg_fonte)
    topo_video = cfg.get("topo_video", 545)

    ass = [cabecalho()]
    dur = cfg["duracao"]

    # título fixo, que é o que o anúncio precisa pra quem chega no meio
    cha = cfg["chapeu"]
    tit = cfg["titulo"]
    y_tit = cfg.get("y_titulo", 250)
    ass.append(evento(0, dur, "Chapeu",
                      f"{{\\an8\\pos({W // 2},{y_tit})\\fad(300,0)}}{escapa(cha)}"))
    ass.append(evento(0, dur, "Titulo",
                      f"{{\\an8\\pos({W // 2},{y_tit + 55})\\fad(300,0)\\fs104"
                      f"\\c{BRANCO}}}{escapa(tit)}"))
    # régua fina embaixo do título: fecha o bloco e tira o ar de slide solto
    larg = 260
    ass.append(evento(0, dur, "Titulo",
                      f"{{\\an7\\pos({(W - larg) // 2},{y_tit + 185})\\fad(300,0)"
                      f"\\c{TIFFANY}\\p1}}m 0 0 l {larg} 0 l {larg} 6 l 0 6{{\\p0}}"))

    # gancho: ocupa a área da legenda antes da legenda começar
    g = cfg.get("gancho")
    if g:
        y = g.get("y", 1420)
        for i, (linha, tam, cor) in enumerate(g["linhas"]):
            de = g["de"] + i * g.get("passo", 0.45)
            ass.append(evento(
                de, g["ate"], "Legenda",
                f"{{\\an5\\pos({W // 2},{y + i * g.get('altura', 120)})"
                f"\\fs{tam}\\bord5\\blur6\\c{cor}\\fad(220,260)"
                f"\\fscx90\\fscy90\\t(0,160,\\fscx100\\fscy100)}}{escapa(linha)}"))

    blocos = [b for b in blocos_de(fala, correcoes)
              if b[-1]["f"] > cfg.get("legenda_de", 0)
              and b[0]["i"] < cfg.get("legenda_ate", dur)]
    ass += legenda(blocos, cfg.get("y_legenda", 1430), destaques)

    # cartão final: a chamada não pode depender de a pessoa ouvir até o fim
    c = cfg.get("chamada")
    if c:
        ass.append(evento(c["de"], dur, "Apoio",
                          f"{{\\an5\\pos({W // 2},{c['y'] - 150})\\fad(260,0)}}"
                          f"{escapa(c['acima'])}"))
        ass.append(evento(c["de"], dur, "Cartao",
                          f"{{\\an5\\pos({W // 2},{c['y']})\\fad(260,0)\\fs{c.get('tam', 150)}"
                          f"\\c{TIFFANY}}}{escapa(c['linha'])}"))
        ass.append(evento(c["de"], dur, "Apoio",
                          f"{{\\an5\\pos({W // 2},{c['y'] + 140})\\fad(260,0)}}"
                          f"{escapa(c['abaixo'])}"))

    # assinatura no rodapé: o quadro sobra embaixo e perfil sem marca é desperdício
    rod = cfg.get("rodape")
    if rod:
        ass.append(evento(0, dur, "Chapeu",
                          f"{{\\an2\\pos({W // 2},{cfg.get('y_rodape', 1855)})"
                          f"\\fs36\\fsp8\\fad(400,0)\\c{TIFFANY}}}{escapa(rod)}"))

    tmp = Path(tempfile.mkdtemp())
    legenda_ass = tmp / "ads.ass"
    legenda_ass.write_text("".join(ass), encoding="utf-8")

    vf = (
        f"[0:v]crop=iw:{alt_fonte}:0:{faixa[0]},scale={W}:{alt_video}"
        f",setsar=1[faixa];"
        f"color=c={FUNDO}:s={W}x{H}:r={FPS}:d={dur}[bg];"
        f"[bg][faixa]overlay=0:{topo_video}:shortest=1[base];"
        f"[base]subtitles={legenda_ass}:fontsdir=/usr/share/fonts[fim]"
    )
    saida = Path(cfg["saida"])
    saida.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-v", "error", "-stats", "-y", "-i", str(origem),
        "-filter_complex", vf, "-map", "[fim]", "-map", "0:a?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709",
        "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(saida)]
    subprocess.run(cmd, check=True)
    print(saida)


if __name__ == "__main__":
    main()
