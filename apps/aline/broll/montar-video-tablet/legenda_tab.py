# Legenda dos videos montados no tablet frontal.
#
# Aqui o tablet ocupa quase o quadro inteiro: a tela vai de y=375 a
# y=1575. Sobra uma faixa de 340px em cima, na estante desfocada, e uma
# de 345px embaixo, na mesa. O texto mora nessas duas faixas e nunca
# entra na tela, senao tapa justamente o que o video esta mostrando.
#
# Consequencia pratica: titulo de uma linha so. Duas linhas nao cabem em
# 340px junto com o chapeu, e encolher a letra derrota o proposito.
#
# Tudo branco, e o escuro atras vem de halo e nao de retangulo: a mesma
# frase desenhada duas vezes, a de tras preta com bord borrado.

import sys

W, H = 1080, 1920
BRANCO = "&H00FFFFFF"
PRETO = "&H00000000"

Y_CHAPEU = 118
Y_TITULO = 232
Y_PE = 1722


def hh(s):
    m, s = divmod(s, 60)
    return f"0:{int(m):02d}:{s:05.2f}"


def halo(camada, de, ate, estilo, tags, txt, fade):
    """Duas camadas: halo preto borrado atras, letra branca na frente."""
    base = f"{tags}\\fad({fade})"
    return (f"Dialogue: {camada},{hh(de)},{hh(ate)},{estilo},,0,0,0,,"
            f"{{{base}\\c{PRETO}\\3c{PRETO}\\bord26\\blur17\\alpha&H28&}}{txt}\n"
            f"Dialogue: {camada+1},{hh(de)},{hh(ate)},{estilo},,0,0,0,,"
            f"{{{base}\\c{BRANCO}\\3c{PRETO}\\bord5\\blur1}}{txt}\n")


def chapeu(de, ate, txt, y=Y_CHAPEU, fade="250,250"):
    return halo(1, de, ate, "Chapeu", f"\\an5\\pos(540,{y})", txt, fade)


def titulo(de, ate, txt, fs=76, y=Y_TITULO, fade="250,250", pop=True):
    t = f"\\an5\\pos(540,{y})\\fs{fs}"
    if pop:
        t += "\\fscx92\\fscy92\\t(0,160,\\fscx100\\fscy100)"
    return halo(1, de, ate, "Titulo", t, txt, fade)


def legenda(de, ate, txt, fs, y=Y_PE, fade="260,260"):
    return halo(3, de, ate, "Pe", f"\\an5\\pos(540,{y})\\fs{fs}", txt, fade)


CABECALHO = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Titulo,Montserrat Black,76,{BRANCO},{BRANCO},{PRETO},{PRETO},0,0,0,0,100,100,0,0,1,5,0,5,30,30,40,1
Style: Chapeu,Montserrat,34,{BRANCO},{BRANCO},{PRETO},{PRETO},1,0,0,0,100,100,9,0,1,4,0,5,30,30,40,1
Style: Pe,Montserrat,72,{BRANCO},{BRANCO},{PRETO},{PRETO},1,0,0,0,100,100,0,0,1,5,0,5,36,36,40,1
Style: Fundo,Montserrat,40,{PRETO},{PRETO},{PRETO},{PRETO},0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def fecho(ev, dna, fim, linha1, linha2, chamada="AGENDE A SUA\\NCONSULTA"):
    """O bloco final sobre a helice. Sem @ e sem nome: serve a qualquer
    profissional. A helice e clara no meio do quadro, entao aqui entra
    um escurecimento do quadro inteiro, sem borda de faixa aparecendo."""
    ev.append(f"Dialogue: 0,{hh(dna-0.3)},{hh(fim)},Fundo,,0,0,0,,"
              f"{{\\an7\\pos(0,0)\\1a&HB0&\\c{PRETO}\\p1\\fad(300,0)}}"
              f"m 0 0 l {W} 0 l {W} {H} l 0 {H}{{\\p0}}\n")
    ev.append(halo(1, dna, fim, "Chapeu", "\\an5\\pos(540,660)", linha1, "300,0"))
    ev.append(f"Dialogue: 1,{hh(dna+0.1)},{hh(fim)},Titulo,,0,0,0,,"
              f"{{\\an8\\pos(540,730)\\fs108\\c{BRANCO}\\3c{PRETO}\\bord7\\blur2"
              f"\\fad(300,0)\\fscx90\\fscy90\\t(0,260,\\fscx100\\fscy100)}}{chamada}\n")
    ev.append(f"Dialogue: 1,{hh(dna+0.4)},{hh(fim)},Titulo,,0,0,0,,"
              f"{{\\an7\\pos(390,1035)\\fad(300,0)\\c{BRANCO}\\bord0\\p1}}"
              f"m 0 0 l 300 0 l 300 6 l 0 6{{\\p0}}\n")
    ev.append(halo(1, dna+0.5, fim, "Pe", "\\an8\\pos(540,1180)\\fs70",
                   linha2, "300,0"))


def escrever(ev, caminho):
    open(caminho, "w", encoding="utf-8").write(CABECALHO + "".join(ev))
    print(caminho)
