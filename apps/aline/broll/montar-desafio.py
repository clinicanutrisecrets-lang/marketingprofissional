#!/usr/bin/env python3
"""Monta o anúncio do Desafio a partir de um vídeo de celular 9:16.

Mesmo desenho do anúncio da formação (`montar-ads.py`): fundo de marca,
título fixo em cima, karaokê palavra a palavra embaixo e assinatura no
rodapé. O que muda é a origem. Lá o vídeo chegava 16:9 com tarja; aqui
chega 9:16 de celular, tela cheia. Se o vídeo ocupar o quadro inteiro não
sobra lugar pro texto, e texto por cima do rosto num anúncio de três
minutos cansa. Então o vídeo vira uma faixa quase quadrada no meio, com
recorte escolhido pra não cortar o queixo nem o topo da cabeça.

Três coisas que este script faz e o de ads não fazia:

1. **Corta trechos do vídeo.** Serve pra tirar uma palavra que não pode
   ir ao ar sem regravar. O corte leva áudio e imagem junto e a
   transcrição é reancorada, senão a legenda inteira sai do lugar.
2. **Corrige frase, não só palavra.** O whisper troca "nutrigenético" por
   "noutro e genético": três tokens no lugar de um. Correção palavra a
   palavra não alcança isso.
3. **Fecha com um cartão de chamada.** Um dos vídeos termina sem CTA
   falado, e mesmo o que termina não pode depender de a pessoa ouvir até
   o fim.

Também corrige um defeito do `montar-ads.py`: lá o último evento de um
bloco terminava em `fim + 0.12` sem olhar o bloco seguinte, então quando
a fala emendava rápido duas legendas apareciam empilhadas na mesma linha.
Aqui o fim de bloco é limitado pelo começo do próximo.

Uso:
    python3 montar-desafio.py roteiro-desafio-4338.json
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1080, 1920

# paleta da marca, a mesma do anúncio da formação
TIFFANY = "&H00B5BA0A"
BRANCO = "&H00FFFFFF"
CREME = "&H00D3E6F5"
FUNDO = "0x0E5959"
SOMBRA = "&H00000000"

FAM = "Montserrat"
FAM_BLACK = "Montserrat Black"

MAX_CHARS = 17
MAX_PALAVRAS = 3
PAUSA = 0.38
LIGACAO = {"e", "ou", "de", "da", "do", "a", "o", "que", "para",
           "com", "em", "no", "na", "se", "um", "uma", "as", "os", "mas"}


def hhmmss(t):
    t = max(0.0, t)
    return f"{int(t)//3600:d}:{(int(t)%3600)//60:02d}:{t%60:05.2f}"


def escapa(txt):
    return txt.replace("{", "(").replace("}", ")").replace("\n", "\\N")


# ---------------------------------------------------------------- transcrição

def aplicar_cortes(palavras, cortes):
    """Tira os trechos cortados e reancora o que vem depois.

    Sem isto a legenda continua marcada no tempo do vídeo original e vai
    ficando cada vez mais adiantada depois de cada corte."""
    saida = []
    for w in palavras:
        desloc = 0.0
        dentro = False
        for de, ate in cortes:
            if w["f"] <= de:
                continue
            if w["t"] >= ate:
                desloc += ate - de
            else:
                dentro = True
                break
        if dentro:
            continue
        saida.append({"t": round(w["t"] - desloc, 2),
                      "f": round(w["f"] - desloc, 2), "p": w["p"]})
    return saida


def corrigir_frases(palavras, frases):
    """Troca sequências inteiras, repartindo o tempo entre as novas palavras."""
    for errado, certo in frases:
        alvo = errado.split()
        novo = certo.split()
        i = 0
        while i <= len(palavras) - len(alvo):
            trecho = [re.sub(r"[^\wÀ-ÿ]", "", palavras[i + k]["p"]).lower()
                      for k in range(len(alvo))]
            if trecho == [a.lower() for a in alvo]:
                de = palavras[i]["t"]
                ate = palavras[i + len(alvo) - 1]["f"]
                # pontuação que vinha grudada na última palavra continua lá
                cauda = re.sub(r"[\wÀ-ÿ]", "", palavras[i + len(alvo) - 1]["p"])
                passo = (ate - de) / max(1, len(novo))
                trocado = []
                for k, p in enumerate(novo):
                    if k == len(novo) - 1:
                        p += cauda
                    trocado.append({"t": round(de + k * passo, 2),
                                    "f": round(de + (k + 1) * passo, 2), "p": p})
                palavras[i:i + len(alvo)] = trocado
                i += len(novo)
            else:
                i += 1
    return palavras


def blocos_de(palavras, correcoes):
    """Agrupa em blocos curtos, quebrando em pausa e em fim de frase."""
    saida, atual, anterior = [], [], None
    for w in palavras:
        p = w["p"].strip()
        if not p:
            continue
        for errado, certo in correcoes.items():
            p = re.sub(rf"\b{re.escape(errado)}\b", certo, p, flags=re.I)
        quebra = (len(atual) >= MAX_PALAVRAS
                  or (anterior is not None and w["t"] - anterior > PAUSA)
                  or sum(len(x["p"]) + 1 for x in atual) + len(p) > MAX_CHARS)
        if atual and quebra:
            saida.append(atual)
            atual = []
        atual.append({"p": p, "t": w["t"], "f": w["f"]})
        anterior = w["f"]
        if p.endswith((".", "!", "?")):
            saida.append(atual)
            atual = []
    if atual:
        saida.append(atual)
    for i in range(len(saida) - 1):
        while (len(saida[i]) > 1
               and saida[i][-1]["p"].strip(",.;:!?").lower() in LIGACAO):
            saida[i + 1].insert(0, saida[i].pop())
    return [b for b in saida if b]


# ----------------------------------------------------------------------- ass

def cabecalho():
    return f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Legenda,{FAM_BLACK},86,{BRANCO},{BRANCO},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,5,0,5,50,50,60,1
Style: Titulo,{FAM_BLACK},96,{BRANCO},{BRANCO},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,0,0,5,50,50,60,1
Style: Chapeu,{FAM},40,{TIFFANY},{TIFFANY},{SOMBRA},{SOMBRA},1,0,0,0,100,100,10,0,1,0,0,5,50,50,60,1
Style: Cartao,{FAM_BLACK},120,{BRANCO},{BRANCO},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,0,0,5,50,50,60,1
Style: Apoio,{FAM},52,{CREME},{CREME},{SOMBRA},{SOMBRA},1,0,0,0,100,100,0,0,1,0,0,5,50,50,60,1
Style: Desenho,{FAM},40,{TIFFANY},{TIFFANY},{SOMBRA},{SOMBRA},0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def evento(de, ate, estilo, texto, layer=0):
    return f"Dialogue: {layer},{hhmmss(de)},{hhmmss(ate)},{estilo},,0,0,0,,{texto}\n"


def linhas_do_bloco(bloco):
    linhas, atual = [], []
    for w in bloco:
        if atual and sum(len(x) + 1 for x in atual) + len(w["p"]) > MAX_CHARS:
            linhas.append(atual)
            atual = []
        atual.append(w["p"])
    if atual:
        linhas.append(atual)
    return linhas


def legenda(blocos, y, destaques, limite):
    """Karaokê: um evento por palavra, a do instante acesa em tiffany."""
    fora = []
    for b, bloco in enumerate(blocos):
        palavras = [w["p"] for w in bloco]
        grande = any(re.sub(r"\W", "", p).lower() in destaques for p in palavras)
        tam = 118 if grande else 88
        linhas = linhas_do_bloco(bloco)
        # o bloco não pode sobrar por cima do próximo: era o que empilhava
        # duas legendas na mesma linha no anúncio da formação
        proximo = blocos[b + 1][0]["t"] if b + 1 < len(blocos) else limite
        fim_bloco = min(bloco[-1]["f"] + 0.12, proximo - 0.02, limite)
        for k, w in enumerate(bloco):
            de = w["t"] if k else max(0, w["t"] - 0.06)
            ate = bloco[k + 1]["t"] if k + 1 < len(bloco) else fim_bloco
            if ate - de < 0.08:
                ate = de + 0.08
            corpo, n = [], 0
            for linha in linhas:
                peca = []
                for p in linha:
                    peca.append(f"{{\\c{TIFFANY}}}{escapa(p)}{{\\c{BRANCO}}}"
                                if n == k else escapa(p))
                    n += 1
                corpo.append(" ".join(peca))
            entrada = "\\fscx88\\fscy88\\t(0,110,\\fscx100\\fscy100)" if k == 0 else ""
            tags = (f"{{\\an5\\pos({W//2},{y})\\fs{tam}\\bord5\\blur6"
                    f"\\c{BRANCO}{entrada}}}")
            fora.append(evento(de, ate, "Legenda", tags + "\\N".join(corpo)))
    return fora


def cartao(de, ate, c):
    """A chamada de ação, em tela cheia de marca no fim."""
    ev = []
    ev.append(evento(de, ate, "Chapeu",
                     f"{{\\an5\\pos({W//2},700)\\fad(320,0)}}{escapa(c['chapeu'])}"))
    ev.append(evento(de, ate, "Cartao",
                     f"{{\\an5\\pos({W//2},860)\\fad(320,0)\\fs{c.get('tam', 118)}"
                     f"\\c{BRANCO}\\fscx90\\fscy90"
                     f"\\t(0,280,\\fscx100\\fscy100)}}{escapa(c['linha1'])}"))
    ev.append(evento(de, ate, "Cartao",
                     f"{{\\an5\\pos({W//2},1060)\\fad(420,0)\\fs{c.get('tam2', 92)}"
                     f"\\c{TIFFANY}}}{escapa(c['linha2'])}"))
    larg = 300
    ev.append(evento(de + 0.3, ate, "Desenho",
                     f"{{\\an7\\pos({(W-larg)//2},1230)\\fad(320,0)"
                     f"\\c{TIFFANY}\\p1}}m 0 0 l {larg} 0 l {larg} 6 l 0 6{{\\p0}}"))
    ev.append(evento(de + 0.4, ate, "Apoio",
                     f"{{\\an5\\pos({W//2},1350)\\fad(320,0)}}{escapa(c['abaixo'])}"))
    return ev


# --------------------------------------------------------------------- render

def main():
    cfg = json.loads(Path(sys.argv[1]).read_text())
    base = Path(sys.argv[1]).parent
    origem = Path(cfg["video"])

    palavras = json.loads((base / cfg["transcricao"]).read_text())
    cortes = [tuple(c) for c in cfg.get("cortes", [])]
    palavras = aplicar_cortes(palavras, cortes)
    palavras = corrigir_frases(palavras, [tuple(f) for f in cfg.get("frases", [])])

    dur_fala = cfg["duracao"] - sum(a - d for d, a in cortes)
    dur_cartao = cfg.get("cartao", {}).get("segundos", 4.5)
    dur = dur_fala + dur_cartao

    rec = cfg.get("recorte", [720, 707, 0, 200])     # w, h, x, y na origem
    alt_faixa = round(W * rec[1] / rec[0])
    topo = cfg.get("topo", 430)

    ass = [cabecalho()]

    # título fixo: quem chega no meio do anúncio precisa saber do que se trata
    ass.append(evento(0, dur_fala, "Chapeu",
                      f"{{\\an5\\pos({W//2},150)\\fad(300,300)}}{escapa(cfg['chapeu'])}"))
    ass.append(evento(0, dur_fala, "Titulo",
                      f"{{\\an5\\pos({W//2},{cfg.get('y_titulo', 250)})\\fad(300,300)"
                      f"\\fs{cfg.get('tam_titulo', 92)}\\c{BRANCO}}}"
                      f"{escapa(cfg['titulo'])}"))
    larg = 260
    ass.append(evento(0, dur_fala, "Desenho",
                      f"{{\\an7\\pos({(W-larg)//2},{cfg.get('y_regua', 370)})"
                      f"\\fad(300,300)\\c{TIFFANY}\\p1}}"
                      f"m 0 0 l {larg} 0 l {larg} 6 l 0 6{{\\p0}}"))

    blocos = [b for b in blocos_de(palavras, cfg.get("correcoes", {}))
              if b[0]["t"] < dur_fala]
    ass += legenda(blocos, cfg.get("y_legenda", 1640),
                   {p.lower() for p in cfg.get("destaques", [])}, dur_fala)

    ass.append(evento(0, dur_fala, "Chapeu",
                      f"{{\\an5\\pos({W//2},1862)\\fs34\\fsp8\\fad(400,300)"
                      f"\\c{TIFFANY}}}{escapa(cfg.get('rodape', '@nutri_secrets'))}"))

    if cfg.get("cartao"):
        ass += cartao(dur_fala + 0.15, dur, cfg["cartao"])
        ass.append(evento(dur_fala + 0.6, dur, "Chapeu",
                          f"{{\\an5\\pos({W//2},1720)\\fs34\\fsp8\\fad(400,0)"
                          f"\\c{TIFFANY}}}{escapa(cfg.get('rodape', '@nutri_secrets'))}"))

    tmp = Path(tempfile.mkdtemp())
    arq_ass = tmp / "desafio.ass"
    arq_ass.write_text("".join(ass), encoding="utf-8")

    # os cortes viram trim + concat; sem corte, uma passagem direta
    if cortes:
        pedacos, t0 = [], 0.0
        for de, ate in cortes:
            pedacos.append((t0, de))
            t0 = ate
        pedacos.append((t0, cfg["duracao"]))
        v = "".join(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];"
                    f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}];"
                    for i, (a, b) in enumerate(pedacos))
        v += "".join(f"[v{i}][a{i}]" for i in range(len(pedacos)))
        v += f"concat=n={len(pedacos)}:v=1:a=1[vc][ac];"
        entrada_v, entrada_a = "[vc]", "[ac]"
    else:
        v = ""
        entrada_v, entrada_a = "[0:v]", "[0:a]"

    v += (
        f"{entrada_v}crop={rec[0]}:{rec[1]}:{rec[2]}:{rec[3]},"
        f"scale={W}:{alt_faixa}:flags=lanczos,setsar=1,fps=30[faixa];"
        f"color=c={FUNDO}:s={W}x{H}:r=30:d={dur}[bg];"
        f"[bg][faixa]overlay=0:{topo}:eof_action=pass[base0];"
    )

    # insertos: durante a janela, a faixa do rosto some e entra um B-roll.
    # Serve pra tapar um defeito de filtro sem regravar, e de quebra troca
    # o plano, que num anúncio de três minutos já vale por si.
    anterior = "[base0]"
    for n, ins in enumerate(cfg.get("insertos", [])):
        de, ate = ins["de"], ins["ate"]
        # tapa a faixa inteira de fundo de marca antes, senão o rosto
        # aparece nas laterais do B-roll, que é mais estreito que a faixa
        v += (f"{anterior}drawbox=x=0:y={topo}:w={W}:h={alt_faixa}:"
              f"color={FUNDO}@1:t=fill:enable='between(t,{de},{ate})'[tapa{n}];")
        larg_ins = cfg.get("largura_inserto", 596)
        v += (f"[{n+1}:v]scale={larg_ins}:{alt_faixa}:flags=lanczos,setsar=1,fps=30,"
              f"setpts=PTS-STARTPTS+{de}/TB[ins{n}];"
              f"[tapa{n}][ins{n}]overlay={(W - larg_ins)//2}:{topo}:"
              f"eof_action=pass:enable='between(t,{de},{ate})'[base{n+1}];")
        anterior = f"[base{n+1}]"

    v += (
        f"{anterior}subtitles={arq_ass}:fontsdir=/usr/share/fonts,"
        f"format=yuv420p[fim];"
        # o cartão final é silêncio: a fala acaba antes do vídeo
        f"{entrada_a}apad=pad_dur={dur_cartao + 0.3}[som]"
    )

    saida = Path(cfg["saida"])
    saida.parent.mkdir(parents=True, exist_ok=True)
    entradas = ["-i", str(origem)]
    for ins in cfg.get("insertos", []):
        entradas += ["-i", str(ins["clipe"])]
    subprocess.run(
        ["ffmpeg", "-v", "error", "-stats", "-y", *entradas,
         "-filter_complex", v, "-map", "[fim]", "-map", "[som]",
         "-t", f"{dur:.2f}",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-color_range", "tv", "-colorspace", "bt709",
         "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(saida)],
        check=True)
    print(saida)


if __name__ == "__main__":
    main()
