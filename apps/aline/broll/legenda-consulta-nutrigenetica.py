# Legenda do video "o que voce recebe numa consulta nutrigenetica".
#
# Gera o .ass inteiro; o video se monta com
#
#   python3 legenda-consulta-nutrigenetica.py texto.ass
#   ffmpeg -i base-com-dna.mp4 -vf "fps=24,subtitles=texto.ass:fontsdir=/usr/share/fonts,format=yuv420p" \
#     -r 24 -an -c:v libx264 -crf 22 -preset medium -movflags +faststart saida.mp4
#
# O fps=24 no filtro e o -r 24 nao sao enfeite: sem eles a saida vira 25 fps
# e todo o tempo da legenda anda junto.
#
# Duas decisoes que valem pros proximos videos:
#
#   1. Legenda de baixo nao leva retangulo escuro. Leva halo: a mesma frase
#      desenhada duas vezes, a de tras preta com bord24 blur16, a da frente
#      branca. O escuro segue a forma da letra em vez de tapar a cena, e a
#      mesa continua aparecendo.
#   2. O fecho nao tem @ nem nome nem CRN, e e todo branco. Assim o mesmo
#      video serve pra qualquer profissional do Scanner, nao so pra ela.
#      Cor de marca so entra em peca que so ela usa.

import sys

W, H = 1080, 1920
FIM = 66.90          # duracao do base-com-dna.mp4
DNA = 59.20          # helice entra em 58.92 e termina de aparecer em 59.5

BRANCO = "&H00FFFFFF"
PRETO  = "&H00000000"

Y_PE = 1570          # centro da legenda de baixo


def hh(s):
    m, s = divmod(s, 60)
    return f"0:{int(m):02d}:{s:05.2f}"


def faixa(de, ate, y0, y1, alfa="A0", fade="250,250"):
    """Retangulo escuro. Continua em cima, onde a parede e clara."""
    return (f"Dialogue: 0,{hh(de)},{hh(ate)},Fundo,,0,0,0,,"
            f"{{\\an7\\pos(0,{y0})\\1a&H{alfa}&\\c{PRETO}\\p1\\fad({fade})}}"
            f"m 0 0 l {W} 0 l {W} {y1-y0} l 0 {y1-y0}{{\\p0}}\n")


def chapeu(de, ate, txt, y=195, fade="250,250"):
    return (f"Dialogue: 1,{hh(de)},{hh(ate)},Chapeu,,0,0,0,,"
            f"{{\\an8\\pos(540,{y})\\fad({fade})}}{txt}\n")


def titulo(de, ate, txt, fs=88, y=250, fade="250,250"):
    return (f"Dialogue: 1,{hh(de)},{hh(ate)},Titulo,,0,0,0,,"
            f"{{\\an8\\pos(540,{y})\\fs{fs}\\c{BRANCO}\\fad({fade})"
            f"\\fscx92\\fscy92\\t(0,160,\\fscx100\\fscy100)}}{txt}\n")


def legenda(de, ate, txt, fs, y=Y_PE, an=5, fade="260,260"):
    """Duas camadas: o halo preto borrado embaixo, a letra branca em cima.

    E o que substitui o retangulo. O halo tem a forma das letras, entao
    escurece so o que precisa e a mesa continua aparecendo por tras.
    """
    base = f"\\an{an}\\pos(540,{y})\\fs{fs}\\fad({fade})"
    return (f"Dialogue: 1,{hh(de)},{hh(ate)},Pe,,0,0,0,,"
            f"{{{base}\\c{PRETO}\\3c{PRETO}\\bord24\\blur16\\alpha&H30&}}{txt}\n"
            f"Dialogue: 2,{hh(de)},{hh(ate)},Pe,,0,0,0,,"
            f"{{{base}\\c{BRANCO}\\3c{PRETO}\\bord5\\blur1}}{txt}\n")


cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Titulo,Montserrat Black,88,{BRANCO},{BRANCO},{PRETO},{PRETO},0,0,0,0,100,100,0,0,1,5,0,8,70,70,60,1
Style: Chapeu,Montserrat,38,{BRANCO},{BRANCO},{PRETO},{PRETO},1,0,0,0,100,100,10,0,1,4,0,8,70,70,60,1
Style: Pe,Montserrat,66,{BRANCO},{BRANCO},{PRETO},{PRETO},1,0,0,0,100,100,0,0,1,5,0,5,40,40,60,1
Style: Fundo,Montserrat,40,{PRETO},{PRETO},{PRETO},{PRETO},0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

ev = []

# ---- abertura -------------------------------------------------------------
ev += [faixa(0.4, 4.7, 0, 560),
       chapeu(0.5, 4.6, "CONSULTA NUTRIGENÉTICA", y=210),
       titulo(0.6, 4.6, "NÃO É SÓ\\NUMA DIETA", fs=112, y=265),
       legenda(1.2, 4.6, "é o manual do seu corpo", 90)]

# ---- 1 de 5: plano alimentar ---------------------------------------------
ev += [faixa(4.9, 20.0, 0, 500),
       chapeu(4.9, 20.0, "O QUE VOCÊ RECEBE · 1 DE 5"),
       titulo(5.0, 20.0, "SEU PLANO ALIMENTAR"),
       legenda(5.2, 8.1, "não é cardápio pronto:\\Né o seu metabolismo", 84),
       legenda(8.5, 11.7, "os seus exames de sangue,\\Nno valor ideal\\Ne não no de referência", 76),
       legenda(12.1, 15.3, "os sintomas que você marcou\\Ne me contou na consulta", 78),
       legenda(15.7, 19.9, "tudo isso entra\\Nno mesmo prato", 96)]

# ---- 2 de 5: suplementacao ------------------------------------------------
ev += [faixa(20.3, 26.0, 0, 500),
       chapeu(20.3, 26.0, "O QUE VOCÊ RECEBE · 2 DE 5"),
       titulo(20.4, 26.0, "SUA SUPLEMENTAÇÃO"),
       legenda(20.7, 25.9, "cada item com o motivo\\Nescrito do lado", 86)]

# ---- 3 de 5: teste genetico ----------------------------------------------
ev += [faixa(26.3, 38.5, 0, 500),
       chapeu(26.3, 38.5, "O QUE VOCÊ RECEBE · 3 DE 5"),
       titulo(26.4, 38.5, "O QUE O TESTE\\NGENÉTICO MOSTRA"),
       legenda(26.7, 32.4, "cada gene tem dois alelos:\\Num do pai, um da mãe", 82),
       legenda(32.9, 38.4, "gene de risco não é sentença:\\Nele pode estar ligado\\Nou silenciado", 74)]

# ---- 4 de 5: manual -------------------------------------------------------
ev += [faixa(38.9, 46.4, 0, 500),
       chapeu(38.9, 46.4, "O QUE VOCÊ RECEBE · 4 DE 5"),
       titulo(39.0, 46.4, "O MANUAL DO\\NSEU METABOLISMO"),
       legenda(39.3, 46.3, "não é informação:\\Né o seu corpo explicado", 86)]

# ---- 5 de 5: trilha -------------------------------------------------------
ev += [faixa(46.8, 58.5, 0, 500),
       chapeu(46.8, 58.5, "O QUE VOCÊ RECEBE · 5 DE 5"),
       titulo(46.9, 58.5, "A SUA TRILHA"),
       legenda(47.2, 52.3, "o mapa inteiro já é seu:\\Nhoje a gente abre\\Nos 10 primeiros", 76),
       legenda(52.7, 58.4, "e a cada consulta\\Na gente sobe um degrau", 86)]

# ---- fecho ----------------------------------------------------------------
# Quadro inteiro escurecido de uma vez, sem borda de faixa aparecendo.
ev.append(f"Dialogue: 0,{hh(DNA-0.3)},{hh(FIM)},Fundo,,0,0,0,,"
          f"{{\\an7\\pos(0,0)\\1a&HB0&\\c{PRETO}\\p1\\fad(300,0)}}"
          f"m 0 0 l {W} 0 l {W} {H} l 0 {H}{{\\p0}}\n")

# A helice e clara bem no meio do quadro, entao o chapeu do fecho leva
# borda mais grossa e borrada que os de cima, que sentam na faixa escura.
ev.append(chapeu(DNA, FIM, "NUTRIÇÃO TERAPÊUTICA E NUTRIGENÔMICA",
                 y=660, fade="300,0")
          .replace("\\an8", "\\an5")
          .replace("\\fad(300,0)}", "\\fad(300,0)\\3c&H00000000\\bord7\\blur3}"))
ev.append(f"Dialogue: 1,{hh(DNA+0.1)},{hh(FIM)},Titulo,,0,0,0,,"
          f"{{\\an8\\pos(540,730)\\fs108\\c{BRANCO}\\3c{PRETO}\\bord7\\blur2"
          f"\\fad(300,0)\\fscx90\\fscy90\\t(0,260,\\fscx100\\fscy100)}}"
          f"AGENDE A SUA\\NCONSULTA\n")
ev.append(f"Dialogue: 1,{hh(DNA+0.4)},{hh(FIM)},Titulo,,0,0,0,,"
          f"{{\\an7\\pos(390,1035)\\fad(300,0)\\c{BRANCO}\\bord0\\p1}}"
          f"m 0 0 l 300 0 l 300 6 l 0 6{{\\p0}}\n")
ev.append(legenda(DNA + 0.5, FIM,
                  "precisão na sua saúde,\\Nexcelência no seu cuidado",
                  70, y=1180, an=8, fade="300,0"))

saida = sys.argv[1] if len(sys.argv) > 1 else "texto.ass"
open(saida, "w", encoding="utf-8").write(cab + "".join(ev))
print(saida)
