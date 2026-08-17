#!/usr/bin/env python3
"""
Monta vídeo horizontal (YouTube) do Nutri Secrets: legenda queimada,
manchetes e selos por cima do vídeo original.

Uso:
    python3 montar-video-h.py roteiro.json saida.mp4

A legenda sai como arquivo .ass e entra pelo filtro `subtitles` — centenas
de `drawtext` num vídeo de 4 minutos em 1080p levariam uma eternidade.
As manchetes e os selos também são desenhados no ASS, como retângulos e
texto posicionado — compor uma dúzia de PNG 1080p com alfa em cada frame
não termina em tempo razoável.

Formato do roteiro (JSON):
{
  "video": "consulta.mp4",
  "transcricao": "transcricao_ok.json",
  "destaques": ["estrogênio", "ferritina"],
  "abertura": {"chapeu": "ATENÇÃO, NUTRICIONISTAS", "titulo": "...",
               "dur": 4.5},
  "fecho": {"chapeu": "...", "titulo": "...", "dur": 6.0},
  "manchetes": [
    {"de": 40.2, "ate": 42.0, "tipo": "cheia", "texto": "..."},
    {"de": 80.0, "ate": 86.0, "tipo": "faixa", "texto": "..."},
    {"de": 139.0, "ate": 146.0, "tipo": "selo", "chapeu": "GENE",
     "texto": "PPAR gama"}
  ]
}

`tipo` "cheia" cobre a tela inteira (serve pra tapar um trecho ruim da
imagem sem mexer no áudio), "faixa" é a tarja de rodapé e "selo" é o
cartão de canto.
"""

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import ImageFont

TIFFANY = (10, 186, 181)
DARK_TEAL = (14, 89, 89)
MAGENTA = (214, 51, 108)
BEGE = (245, 230, 211)
BRANCO = (255, 255, 255)

# nome de família como o fontconfig registra: só os pesos que ganharam
# família própria é que podem ser pedidos pelo nome. Bold é estilo de
# "Montserrat", não família, e vai com \b1
FAMILIA_MS = {"Bold": "Montserrat", "Regular": "Montserrat",
              "SemiBold": "Montserrat SemiBold", "Medium": "Montserrat Medium",
              "Light": "Montserrat Light", "Black": "Montserrat Black"}

FONT_BOLD = "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf"
FONT_LIGHT = "/usr/share/fonts/truetype/montserrat/Montserrat-Light.ttf"

# título de cartão em serifada de revista; o apoio e a legenda continuam
# em Montserrat, que é a fonte da marca e lê melhor em movimento
ED = "/usr/share/fonts/truetype/editorial/Playfair-%s.ttf"
FONTE_ED = {"Regular": "Playfair Display", "SemiBold": "Playfair Display SemiBold",
            "Black": "Playfair Display Black", "Italic": "Playfair Display Medium"}

W, H = 1920, 1080         # o roteiro pode trocar por 9:16 com "saida"
K = 1.0                   # fator de escala das medidas, derivado da largura
FPS = 25
MARGEM = 140


def k(v):
    """Escala a medida pro formato de saída escolhido."""
    return max(1, round(v * K))
COR = ["-color_range", "tv", "-colorspace", "bt709",
       "-color_primaries", "bt709", "-color_trc", "bt709"]
FMT = "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p"

# a legenda ocupa o rodapé; manchete e selo têm que ficar acima dela
RODAPE_LEGENDA = 210

# faixas verticais que manchete, selo e painel ocupam em cada instante.
# A legenda agora escolhe a própria altura e precisa saber o que já está
# na tela, senão vai parar em cima de uma manchete.
ZONAS = []


def ocupa(de, ate, y0, y1):
    ZONAS.append((de, ate, max(0, int(y0)), min(H, int(y1))))


def quebra(texto, fonte, largura):
    """Quebra respeitando o \\n do roteiro e medindo com a fonte real.

    Os `**` de destaque não são medidos: eles somam quatro caracteres por
    palavra e fariam a linha quebrar antes da hora, já que na tela viram
    tag de cor e não ocupam espaço.
    """
    linhas = []
    for bruta in texto.split("\n"):
        atual = ""
        for palavra in bruta.split():
            teste = f"{atual} {palavra}".strip()
            if fonte.getlength(teste.replace("**", "")) <= largura or not atual:
                atual = teste
            else:
                linhas.append(atual)
                atual = palavra
        linhas.append(atual)
    return linhas


def caixa(x0, y0, x1, y1, cor, alfa=0, camada=1, de=0.0, ate=0.0):
    """Retângulo desenhado no próprio ASS.

    Compor PNG 1080p com alfa por cima de cada frame custa caro — com uma
    dúzia de manchetes o render de 4 minutos não termina. Desenhar no ASS
    resolve tudo numa passagem só do filtro `subtitles`.
    """
    return (f"Dialogue: {camada},{hms(de)},{hms(ate)},caixa,,0,0,0,,"
            f"{{\\pos(0,0)\\c{ass_cor(cor)}\\alpha&H{alfa:02X}&"
            f"\\p1}}m {x0} {y0} l {x1} {y0} {x1} {y1} {x0} {y1}{{\\p0}}")


def texto(txt, x, y, tam, cor, de, ate, camada=2, fonte="Bold",
          alinha=8, espaco=0, italico=False, familia=None, negrito=False,
          sublinhado=False):
    """Uma linha de texto posicionada, na cor e no tamanho pedidos."""
    esp = f"\\fsp{espaco}" if espaco else ""
    # "Montserrat Bold" não existe como família: o negrito é estilo da
    # família "Montserrat". Pedir o nome errado fazia o libass cair numa
    # fonte de fallback — era por isso que o chapéu saía fino
    negrito = negrito or fonte == "Bold"
    it = ("\\i1" if italico else "") + ("\\b1" if negrito else "") \
        + ("\\u1" if sublinhado else "")
    fam = familia or FAMILIA_MS.get(fonte, "Montserrat")
    return (f"Dialogue: {camada},{hms(de)},{hms(ate)},base,,0,0,0,,"
            f"{{\\an{alinha}\\pos({x},{y})\\fn{fam}"
            f"\\fs{tam}\\c{ass_cor(cor)}\\bord0\\shad0{esp}{it}"
            f"\\fad(180,180)}}{txt}")


def espalha_realce(txt):
    """`**a b c**` vira `**a** **b** **c**`.

    O realce é aplicado depois da quebra de linha; se um destaque de
    várias palavras for partido em duas linhas, o regex não casa e os
    asteriscos aparecem crus na tela.
    """
    return re.sub(r"\*\*([^*]+)\*\*",
                  lambda m: " ".join(f"**{p}**" for p in m.group(1).split()),
                  txt)


def realce(txt, cor_base, cor_hl=None):
    """Troca **palavra** por mudança de cor inline no ASS."""
    hl = ass_cor(cor_hl or TIFFANY)
    return re.sub(r"\*\*([^*]+)\*\*",
                  lambda m: f"{{\\c{hl}}}{m.group(1)}{{\\c{ass_cor(cor_base)}}}",
                  txt)


def par_tarja(v):
    """Aceita `[r,g,b]` ou `[[fundo],[texto]]` e devolve o par."""
    if not v:
        return None
    if isinstance(v[0], (list, tuple)):
        return (tuple(v[0]), tuple(v[1]))
    return (tuple(v), BRANCO)


def linhas_titulo(titulo, base):
    """Normaliza o título em linhas com tamanho e peso próprios.

    Aceita string simples (todas as linhas iguais) ou lista de blocos
    `{"txt", "tam", "peso", "cor"}`. Os tamanhos são fatores do corpo
    base — é o que dá a hierarquia de capa de revista, com a palavra que
    importa muito maior que o resto.
    """
    if isinstance(titulo, str):
        # sem hierarquia declarada, todas as linhas saem num corpo médio:
        # o corpo base é calibrado pra palavra-herói de capa
        return [{"txt": l, "tam": round(base * 0.55), "peso": "SemiBold",
                 "cor": None, "tarja": None} for l in titulo.split("\n")]
    saida = []
    for b in titulo:
        saida.append({"txt": b["txt"],
                      "tam": max(1, round(base * b.get("tam", 1))),
                      "peso": b.get("peso", "SemiBold"),
                      "cor": tuple(b["cor"]) if b.get("cor") else None,
                      "tarja": par_tarja(b.get("tarja"))})
    return saida


def eventos_cartao(chapeu, titulo, sub, de, ate, fundo=DARK_TEAL, tarja=None,
                   rodape=None, hl=None):
    """Cartão de tela cheia.

    Também serve pra tapar um trecho ruim da imagem sem tocar no áudio.
    `tarja` põe o chapéu dentro de um retângulo colorido; sem ela o
    chapéu fica solto, entre dois filetes finos, que é o tratamento mais
    sóbrio.
    """
    ev = [caixa(0, 0, W, H, fundo, 0, 1, de, ate)]
    ocupa(de, ate, 0, H)
    # corpo base generoso: numa capa editorial a palavra-herói tem que
    # dominar o quadro, e o fator de cada linha parte daqui
    blocos = linhas_titulo(titulo, k(180))
    # o chapéu diz pra quem é o vídeo ("NUTRICIONISTA"). Em corpo fino e
    # pequeno ele some, e um reel que não diz isso na cara atrai paciente
    # em vez de nutricionista — então vai em negrito e grande
    tam_cha, esp_cha = (k(74), k(8)) if tarja else (k(68), k(10))

    alt = sum(round(b["tam"] * 1.34) for b in blocos)
    alt += (tam_cha + k(110)) if chapeu else 0
    alt += k(120) if sub else 0
    y = (H - alt) // 2

    if chapeu:
        txt = chapeu.upper()
        f_cha = ImageFont.truetype(FONT_BOLD, tam_cha)
        larg = f_cha.getlength(txt) + esp_cha * (len(txt) - 1)
        # chapéu longo num quadro estreito estoura a tarja pra fora da
        # tela; encolhe até caber com folga
        limite = W - k(MARGEM) * 2
        while larg > limite and tam_cha > k(30):
            tam_cha -= 2
            esp_cha = max(k(3), esp_cha - 1)
            f_cha = ImageFont.truetype(FONT_BOLD, tam_cha)
            larg = f_cha.getlength(txt) + esp_cha * (len(txt) - 1)
        cor_cha = tarja[1] if tarja else TIFFANY
        if tarja:
            pad_x, pad_y = k(46), k(22)
            x0 = int((W - larg) / 2) - pad_x
            ev.append(caixa(x0, y - pad_y, int(x0 + larg) + pad_x * 2,
                            y + int(tam_cha * 1.3) + pad_y, tarja[0], 0, 1,
                            de, ate))
        else:
            # dois filetes finos no lugar da tarja: o chapéu respira e o
            # cartão fica menos anúncio, mais capa
            fx = int((W - larg) / 2) - k(34)
            fw = int(larg) + k(68)
            for yy in (y - k(30), y + int(tam_cha * 1.3) + k(14)):
                ev.append(caixa(fx, yy, fx + fw, yy + k(4), TIFFANY, 0x18,
                                1, de, ate))
        ev.append(texto(txt, W // 2, y, tam_cha, cor_cha, de, ate,
                        fonte="Bold", espaco=esp_cha))
        y += tam_cha + k(110)

    for b in blocos:
        familia = FONTE_ED.get(b["peso"], FONTE_ED["SemiBold"])
        # linha que estoura a largura encolhe sozinha, senão a palavra
        # grande vaza pra fora do quadro
        arq = ED % ("Black" if b["peso"] == "Black" else
                    "SemiBold" if b["peso"] == "SemiBold" else "Regular")
        limpo = b["txt"].replace("**", "")
        while (b["tam"] > k(24) and ImageFont.truetype(arq, b["tam"])
               .getlength(limpo) > W - k(MARGEM) * 2):
            b["tam"] -= 3
        cor_linha = b["cor"] or BRANCO
        if b["tarja"]:
            # a linha-gancho ganha um retângulo atrás: é o que puxa o olho
            # antes da palavra grande
            larg_l = ImageFont.truetype(arq, b["tam"]).getlength(limpo)
            px, py = k(38), k(14)
            x0 = int((W - larg_l) / 2) - px
            ev.append(caixa(x0, y - py, int(x0 + larg_l) + px * 2,
                            y + int(b["tam"] * 1.24) + py, b["tarja"][0], 0,
                            1, de, ate))
            cor_linha = b["tarja"][1]
        ev.append(texto(realce(espalha_realce(b["txt"]), cor_linha, hl),
                        W // 2, y, b["tam"], cor_linha, de, ate,
                        familia=familia, italico=b["peso"] == "Italic"))
        y += round(b["tam"] * 1.34)

    if sub:
        # a chamada da aula sai destacada: é a linha que converte
        ev.append(texto(realce(espalha_realce(sub), BEGE, hl), W // 2,
                        y + k(34), k(52), BEGE, de, ate, fonte="SemiBold",
                        negrito=True, sublinhado=True))
    if rodape:
        # a assinatura sai do meio e vai pro pé do cartão, senão disputa
        # atenção com a chamada
        ev.append(texto(rodape, W // 2, H - k(120), k(38), TIFFANY, de, ate,
                        fonte="Medium", espaco=k(3)))
    return ev


def eventos_faixa(txt, de, ate):
    """Tarja de rodapé com a manchete, acima da linha de legenda."""
    f = ImageFont.truetype(FONT_BOLD, k(68))
    linhas = quebra(txt, f, W - k(MARGEM) * 2)
    alt = k(88) * len(linhas) + k(76)
    y0 = H - k(RODAPE_LEGENDA) - alt - k(40)
    ocupa(de, ate, y0 - k(20), y0 + alt + k(20))
    ev = [caixa(0, y0, W, y0 + alt, TIFFANY, 0x14, 1, de, ate)]
    y = y0 + k(38)
    for linha in linhas:
        ev.append(texto(linha, W // 2, y, k(68), BRANCO, de, ate))
        y += k(88)
    return ev


def eventos_selo(chapeu, txt, sub, de, ate):
    """Cartão de canto — o gene ou o exame que está sendo explicado."""
    f_txt = ImageFont.truetype(FONT_BOLD, k(64))
    f_cha = ImageFont.truetype(FONT_SEMI, k(30))
    f_sub = ImageFont.truetype(FONT_MED, k(32))
    larg = max(f_txt.getlength(txt), f_cha.getlength(chapeu.upper()) + k(4) * len(chapeu),
               f_sub.getlength(sub) if sub else 0) + k(88)
    alt = k(176) + (k(48) if sub else 0)
    # no alto o cartão cobre o rosto assim que ela se move; embaixo cai
    # sobre a mesa e o jaleco, onde nada acontece
    x0, y0 = k(96), H - k(RODAPE_LEGENDA) - alt - k(60)
    ocupa(de, ate, y0 - k(20), y0 + alt + k(20))
    ev = [caixa(x0, y0, x0 + larg, y0 + alt, BRANCO, 0x0D, 1, de, ate),
          caixa(x0, y0, x0 + k(12), y0 + alt, TIFFANY, 0, 1, de, ate)]
    ev.append(texto(chapeu.upper(), x0 + k(44), y0 + k(30), k(30), TIFFANY,
                    de, ate, fonte="SemiBold", alinha=7, espaco=k(4)))
    ev.append(texto(txt, x0 + k(44), y0 + k(74), k(64), DARK_TEAL, de, ate,
                    alinha=7))
    if sub:
        ev.append(texto(sub, x0 + k(44), y0 + k(156), k(32), (70, 90, 90),
                        de, ate, fonte="Medium", alinha=7))
    return ev


def eventos_painel(chapeu, titulo, sub, itens, de, ate):
    """Painel central grande — o formato de anúncio, que roda no mudo.

    O vídeo fica só como textura por trás, então aqui o texto é o
    conteúdo: nome do gene em corpo enorme e os pares rótulo/valor
    embaixo.
    """
    ev = []
    f_tit = ImageFont.truetype(FONT_BOLD, k(132))
    linhas = quebra(espalha_realce(titulo), f_tit, W - k(MARGEM) * 2 - k(120))
    alt = len(linhas) * k(158) + (k(78) if chapeu else 0) + (k(86) if sub else 0)
    alt += len(itens or []) * k(118)
    y = (H - alt) // 2

    # painel atrás do bloco: só escurecer o vídeo inteiro não basta, o
    # texto branco ainda briga com a parede clara e a janela do consultório
    pad = k(72)
    ocupa(de, ate, y - pad - k(20), y + alt + pad + k(20))
    ev.append(caixa(k(MARGEM) - k(40), y - pad, W - k(MARGEM) + k(40),
                    y + alt + pad,
                    DARK_TEAL, 0x1A, 0, de, ate))

    if chapeu:
        ev.append(texto(chapeu.upper(), W // 2, y, k(42), TIFFANY, de, ate,
                        fonte="SemiBold", espaco=k(9)))
        y += k(78)
    for linha in linhas:
        ev.append(texto(realce(linha, BRANCO), W // 2, y, k(132), BRANCO,
                        de, ate))
        y += k(158)
    if sub:
        ev.append(texto(realce(espalha_realce(sub), BEGE), W // 2, y + k(8),
                        k(54), BEGE, de, ate, fonte="Medium"))
        y += k(86)
    for rotulo, valor in (itens or []):
        # rótulo e valor na mesma linha: o rótulo vira uma etiqueta curta
        # em Tiffany e o valor fica em branco, do lado
        f_rot = ImageFont.truetype(FONT_SEMI, k(36))
        f_val = ImageFont.truetype(FONT_BOLD, k(58))
        larg = f_rot.getlength(rotulo.upper()) + k(4) * len(rotulo) + k(32) \
            + f_val.getlength(valor)
        x = int((W - larg) / 2)
        ev.append(texto(rotulo.upper(), x, y + k(18), k(36), TIFFANY, de, ate,
                        fonte="SemiBold", alinha=7, espaco=k(4)))
        ev.append(texto(valor, int(x + f_rot.getlength(rotulo.upper())
                                   + k(4) * len(rotulo) + k(32)), y, k(58),
                        BRANCO, de, ate, alinha=7))
        y += k(118)
    return ev


def ass_cor(rgb):
    """ASS usa BGR, não RGB."""
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}"


def hms(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def blocos_legenda(segs, limite=44, dur_max=3.4):
    """Reparte a fala em blocos curtos de legenda.

    Legenda de vídeo longo não pode carregar a frase inteira: quebra por
    largura e por duração, e corta preferencialmente na pontuação.
    """
    saida = []
    for s in segs:
        palavras = s["txt"].split()
        if not palavras:
            continue
        total = len(palavras)
        dur = max(0.4, s["fim"] - s["ini"])
        atual, ini_i = [], 0
        for i, p in enumerate(palavras):
            atual.append(p)
            linha = " ".join(atual)
            fecha_pontuacao = p.endswith((".", "?", "!", ":", ";"))
            passou = len(linha) >= limite
            fim_seg = i == total - 1
            if passou or fecha_pontuacao or fim_seg:
                ini = s["ini"] + dur * ini_i / total
                fim = s["ini"] + dur * (i + 1) / total
                # blocos longos demais cansam; deixa o corte acontecer
                if fim - ini > dur_max and not fim_seg:
                    fim = ini + dur_max
                saida.append((ini, fim, linha))
                atual, ini_i = [], i + 1
    # dois blocos no ar ao mesmo tempo se empilham na tela e ficam
    # ilegíveis; o anterior sempre sai antes do próximo entrar
    saida.sort(key=lambda b: b[0])
    ajustado = []
    for j, (ini, fim, txt) in enumerate(saida):
        if j + 1 < len(saida):
            fim = min(fim, saida[j + 1][0] - 0.03)
        if fim > ini:
            ajustado.append((ini, fim, txt))
    return ajustado


def marca(texto, destaques, cor_hl, cor_base):
    """Pinta as palavras-chave na cor de destaque, dentro da linha ASS."""
    saida = []
    for palavra in texto.split():
        limpo = palavra.strip(".,;:!?()").lower()
        if any(limpo == d or limpo.startswith(d) for d in destaques):
            saida.append(f"{{\\c{cor_hl}}}{palavra}{{\\c{cor_base}}}")
        else:
            saida.append(palavra)
    return " ".join(saida)


def faz_ass(caminho, blocos, destaques, deslocamento, manchetes):
    """Escreve legendas e manchetes num único arquivo ASS."""
    base, hl = ass_cor(BRANCO), ass_cor(TIFFANY)
    cab = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: fala,Montserrat SemiBold,{k(78)},{base},&H00000000,&HC0000000,0,0,0,0,100,100,0,0,1,{k(4)},{k(3)},2,{k(140)},{k(140)},{k(120)},1
Style: caixa,Arial,20,{base},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: base,Montserrat,54,{base},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linhas = list(manchetes)
    for bloco in blocos:
        ini, fim, txt = bloco[0], bloco[1], bloco[2]
        margem = bloco[3] if len(bloco) > 3 else 0
        t = marca(txt, destaques, hl, base)
        # camada 3: a legenda fica por cima da tarja, nunca por baixo
        linhas.append(f"Dialogue: 3,{hms(ini + deslocamento)},"
                      f"{hms(fim + deslocamento)},fala,,0,0,{margem},,{t}")
    Path(caminho).write_text(cab + "\n".join(linhas) + "\n")


def clipe_cartao(tmp, nome, cfg, saida):
    """Abertura e fecho: cartão de tela cheia virando trecho de vídeo."""
    ass = tmp / f"{nome}.ass"
    faz_ass(ass, [], [], 0.0,
            eventos_cartao(cfg.get("chapeu"), cfg["titulo"], cfg.get("sub"),
                           0.0, cfg["dur"],
                           tarja=par_tarja(cfg.get("tarja")),
                           rodape=cfg.get("rodape"),
                           hl=tuple(cfg["hl"]) if cfg.get("hl") else None))
    caminho = str(ass).replace(":", r"\:")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "lavfi",
        "-i", f"color=c=0x0E5959:s={W}x{H}:r={FPS}:d={cfg['dur']}",
        "-vf", f"subtitles='{caminho}':"
               f"fontsdir=/usr/share/fonts/truetype," + FMT,
        "-pix_fmt", "yuv420p", *COR, "-c:v", "libx264", "-crf", "18",
        str(saida)], check=True)


def dur_video(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def junta_clipes(clipes, tmp):
    """Recorta cada clipe e emenda tudo num vídeo só.

    Cada item aceita `trecho` e `velocidade`; a velocidade abaixo de 1
    alonga o clipe, o que salva um trecho curto demais pro texto que
    precisa caber nele.
    """
    partes = []
    avisa_repeticao(clipes)
    for i, c in enumerate(clipes):
        p = tmp / f"c{i}.mp4"
        corte = []
        if c.get("trecho"):
            de, ate = c["trecho"]
            corte = ["-ss", str(de), "-t", str(ate - de)]
        vf = [f"scale={W}:{H}:force_original_aspect_ratio=increase",
              f"crop={W}:{H}"]
        vel = c.get("velocidade", 1)
        if vel != 1:
            vf.append(f"setpts={1 / vel:.4f}*PTS")
        vf.append(f"fps={FPS}")
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", *corte, "-i", c["video"],
            "-vf", ",".join(vf) + "," + FMT, "-an",
            "-pix_fmt", "yuv420p", *COR, "-c:v", "libx264", "-crf", "18",
            str(p)], check=True)
        partes.append(p)
    lista = tmp / "clipes.txt"
    lista.write_text("".join(f"file '{p}'\n" for p in partes))
    juntos = tmp / "juntos.mp4"
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c", "copy", str(juntos)], check=True)
    return juntos


def cenas_de(video):
    """Onde estão os cortes internos de um clipe, em segundos.

    Vários clipes do banco são multi-cena: `lab` tem laboratório, café,
    balança e cozinha em 15 segundos. Tratar isso como um clipe só é o
    que fez o mesmo café aparecer duas vezes no reel da aveia.
    """
    mapa = Path(__file__).with_name("video") / "cenas.json"
    if not mapa.exists():
        return []
    tabela = json.loads(mapa.read_text())
    nome = Path(video).name
    for chave, cortes in tabela.items():
        if chave == nome or chave in str(video) or nome in str(chave):
            return cortes
    banco = Path(__file__).with_name("video") / "biblioteca.json"
    if banco.exists():
        for apelido, caminho in json.loads(banco.read_text()).items():
            if Path(caminho).name == nome:
                return tabela.get(apelido, [])
    return []


def _cena(cortes, t):
    """Índice da cena em que o instante cai."""
    return sum(1 for c in cortes if t >= c)


def avisa_repeticao(clipes):
    """Grita quando dois cortes voltam pro mesmo pedaço do mesmo clipe.

    Duas regras, e as duas nasceram de defeito que foi pro ar:

    - **Voltar atrás dentro da mesma cena.** Avançar numa tomada é
      montagem normal; voltar pra um ponto já passado dela é o vídeo
      "indo e voltando". Pega o trecho repetido e a continuidade
      invertida (o pote sem cobertura depois do pote coberto). Entre
      cenas diferentes a ordem é livre: são tomadas independentes que só
      por acaso moram no mesmo arquivo.
    - **Atravessar uma virada de cena.** Metade do banco é multi-cena:
      `lab` tem laboratório, café, balança e cozinha em 15 segundos. Um
      trecho que cruza o corte traz um pedaço da cena vizinha de brinde —
      foi assim que o mesmo café entrou duas vezes no reel da aveia.
    """
    fim_anterior = {}
    for i, c in enumerate(clipes):
        de, ate = c["trecho"] if c.get("trecho") else (0, dur_video(c["video"]))
        nome = Path(c["video"]).name
        cortes = cenas_de(c["video"])
        dentro = [x for x in cortes if de < x < ate]
        if dentro:
            print(f"aviso: o corte {i} atravessa uma virada de cena — "
                  f"{nome} {de}-{ate} passa por {dentro}", file=sys.stderr)
        chave = (c["video"], _cena(cortes, (de + ate) / 2))
        j, ate_j = fim_anterior.get(chave, (None, None))
        if j is not None and de < ate_j:
            print(f"aviso: o corte {i} volta atrás em {nome} — começa em "
                  f"{de}, e o corte {j} já tinha ido até {ate_j}",
                  file=sys.stderr)
        if ate_j is None or ate > ate_j:
            fim_anterior[chave] = (i, ate)


def main():
    global W, H, K
    roteiro = json.loads(Path(sys.argv[1]).read_text())
    if roteiro.get("saida"):
        W, H = roteiro["saida"]
        # em retrato a referência é 1080 de largura, não 1920: escalar
        # um vertical pela régua do horizontal deixa o texto minúsculo
        K = W / (1080 if H > W else 1920)
    saida = sys.argv[2]
    tmp = Path(tempfile.mkdtemp())

    tmp_c = Path(tempfile.mkdtemp())
    video = (junta_clipes(roteiro["clipes"], tmp_c) if roteiro.get("clipes")
             else roteiro["video"])
    # a transcrição passa pelo dicionário da marca antes de virar legenda:
    # nome de gene errado na tela é o tipo de erro que ninguém perdoa e
    # que não pode depender de eu lembrar de consertar à mão
    from corrige_transcricao import carrega
    segs = (carrega(roteiro["transcricao"])
            if roteiro.get("transcricao") else [])
    destaques = [d.lower() for d in roteiro.get("destaques", [])]

    ab, fe = roteiro.get("abertura"), roteiro.get("fecho")
    dur_ab = ab["dur"] if ab else 0.0

    eventos = []
    for m in roteiro.get("manchetes", []):
        de, ate = m["de"] + dur_ab, m["ate"] + dur_ab
        if m["tipo"] == "cheia":
            eventos += eventos_cartao(
                m.get("chapeu"), m["texto"], m.get("sub"), de, ate,
                tarja=par_tarja(m.get("tarja")),
                rodape=m.get("rodape"),
                hl=tuple(m["hl"]) if m.get("hl") else None)
        elif m["tipo"] == "faixa":
            eventos += eventos_faixa(m["texto"], de, ate)
        elif m["tipo"] == "painel":
            eventos += eventos_painel(m.get("chapeu"), m["texto"],
                                      m.get("sub"),
                                      [tuple(i) for i in m.get("itens", [])],
                                      de, ate)
        else:
            eventos += eventos_selo(m.get("chapeu", "gene"), m["texto"],
                                    m.get("sub"), de, ate)

    trecho = roteiro.get("trecho")
    mudo = roteiro.get("mudo", False)
    escurecer = roteiro.get("escurecer", 0)
    if escurecer:
        # véu preto do começo ao fim: com o vídeo servindo de fundo, o
        # texto só ganha contraste se a imagem descer alguns pontos
        dur = (trecho[1] - trecho[0]) if trecho else dur_video(video)
        alfa = int(255 * (1 - escurecer))
        eventos.insert(0, caixa(0, 0, W, H, (0, 0, 0), alfa, 0,
                                dur_ab, dur_ab + dur + 0.5))

    ass = tmp / "legenda.ass"
    # com narração própria o áudio toca desde o primeiro frame, inclusive
    # por cima do cartão de abertura; deslocar a legenda pela abertura a
    # atrasaria em relação à fala
    desloc = 0.0 if roteiro.get("audio") else dur_ab
    blocos = [] if roteiro.get("sem_legenda") else blocos_legenda(segs)
    # legendas próprias do roteiro: no anúncio mudo o texto não vem da
    # fala, é escrito pra ser lido
    blocos += [(l["de"], l["ate"], l["texto"],
                k(l["margem"]) if l.get("margem") else 0)
               for l in roteiro.get("legendas", [])]
    blocos.sort(key=lambda b: b[0])

    if blocos and roteiro.get("desvia_do_rosto", True):
        # a legenda se posiciona sozinha: nunca em cima do rosto e, se
        # sobrar vão no meio do quadro, ela vai pro meio em vez do
        # rodapé — num plano com ela em cima e o prato embaixo, o rodapé
        # é justamente onde está a comida
        from detecta_rosto import margens_por_bloco
        base_t = trecho[0] if trecho else 0.0
        # com narração os tempos já são do vídeo final e o cartão de
        # abertura precisa ser descontado; sem narração eles são do vídeo
        # de origem e o desconto seria erro de sinal
        off = dur_ab - desloc
        janelas = [(b[0] - off + base_t, b[1] - off + base_t)
                   for b in blocos]
        # manchete e legenda no mesmo lugar seria trocar um tapa-buraco
        # por outro; cada bloco recebe as faixas já ocupadas no seu tempo
        bloq = [[(z[2], z[3]) for z in ZONAS
                 if z[1] > b[0] + desloc and z[0] < b[1] + desloc]
                for b in blocos]
        margens = margens_por_bloco(video, janelas, H, round(k(78) * 2.3),
                                    k(120), bloqueios=bloq)
        blocos = [(b[0], b[1], b[2], m) for b, m in zip(blocos, margens)]
    if roteiro.get("audio"):
        # o cartão de abertura já diz o que ela fala nesses segundos;
        # legenda por cima dele seria repetição
        blocos = [b for b in blocos if b[1] > dur_ab]
        blocos = [(max(b[0], dur_ab),) + tuple(b[1:]) for b in blocos]
    faz_ass(ass, blocos, destaques, desloc, eventos)

    partes = []
    if ab:
        mp4 = tmp / "abertura.mp4"
        clipe_cartao(tmp, "abertura", ab, mp4)
        partes.append(mp4)

    # os tempos do ASS já vêm deslocados, então o miolo entra com um atraso
    # igual à abertura pra tudo cair no lugar
    caminho = str(ass).replace(":", r"\:")
    miolo = tmp / "miolo.mp4"
    corte = ["-ss", str(trecho[0]), "-t", str(trecho[1] - trecho[0])] \
        if trecho else []
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", *corte, "-i", video,
        "-vf", f"setpts=PTS+{dur_ab}/TB,"
               f"subtitles='{caminho}':"
               f"fontsdir=/usr/share/fonts/truetype,"
               f"setpts=PTS-{dur_ab}/TB," + FMT,
        "-r", str(FPS), "-pix_fmt", "yuv420p", *COR,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        *(["-an"] if mudo else ["-c:a", "aac", "-b:a", "192k"]),
        str(miolo)], check=True)
    partes.append(miolo)

    if fe:
        mp4 = tmp / "fecho.mp4"
        clipe_cartao(tmp, "fecho", fe, mp4)
        partes.append(mp4)

    # os cartões não têm áudio; o concat precisa de trilha em todos
    finais = []
    for p in partes:
        tem = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a",
             "-show_entries", "stream=index", "-of", "csv=p=0", str(p)],
            capture_output=True, text=True).stdout.strip()
        if tem:
            finais.append(p)
            continue
        mudo = tmp / (p.stem + "_a.mp4")
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(p),
            "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
            "-shortest", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            str(mudo)], check=True)
        finais.append(mudo)

    lista = tmp / "lista.txt"
    lista.write_text("".join(f"file '{p}'\n" for p in finais))
    alvo = (tmp / "sem_narracao.mp4") if roteiro.get("audio") else Path(saida)
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", *COR,
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(alvo),
    ], check=True)

    if roteiro.get("audio"):
        # a narração substitui a trilha inteira; o vídeo já foi calibrado
        # pra duração dela, então shortest só apara a sobra de arredondamento
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(alvo),
            "-i", roteiro["audio"], "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            "-shortest", "-movflags", "+faststart", saida], check=True)

    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", saida],
        capture_output=True, text=True, check=True)
    print(f"pronto: {saida} ({float(out.stdout.strip()):.1f}s)")


if __name__ == "__main__":
    main()
