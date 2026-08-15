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

FONT_BOLD = "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf"
FONT_SEMI = "/usr/share/fonts/truetype/montserrat/Montserrat-SemiBold.ttf"
FONT_MED = "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf"

W, H = 1920, 1080
FPS = 25
MARGEM = 140
COR = ["-color_range", "tv", "-colorspace", "bt709",
       "-color_primaries", "bt709", "-color_trc", "bt709"]
FMT = "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p"

# a legenda ocupa o rodapé; manchete e selo têm que ficar acima dela
RODAPE_LEGENDA = 210


def quebra(texto, fonte, largura):
    """Quebra respeitando o \\n do roteiro e medindo com a fonte real."""
    linhas = []
    for bruta in texto.split("\n"):
        atual = ""
        for palavra in bruta.split():
            teste = f"{atual} {palavra}".strip()
            if fonte.getlength(teste) <= largura or not atual:
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
          alinha=8, espaco=0):
    """Uma linha de texto posicionada, na cor e no tamanho pedidos."""
    esp = f"\\fsp{espaco}" if espaco else ""
    return (f"Dialogue: {camada},{hms(de)},{hms(ate)},base,,0,0,0,,"
            f"{{\\an{alinha}\\pos({x},{y})\\fnMontserrat {fonte}"
            f"\\fs{tam}\\c{ass_cor(cor)}\\bord0\\shad0{esp}"
            f"\\fad(180,180)}}{txt}")


def realce(txt, cor_base, cor_hl=None):
    """Troca **palavra** por mudança de cor inline no ASS."""
    hl = ass_cor(cor_hl or TIFFANY)
    return re.sub(r"\*\*([^*]+)\*\*",
                  lambda m: f"{{\\c{hl}}}{m.group(1)}{{\\c{ass_cor(cor_base)}}}",
                  txt)


def eventos_cartao(chapeu, titulo, sub, de, ate, fundo=DARK_TEAL, tarja=None,
                   rodape=None, hl=None):
    """Cartão de tela cheia — tapa um trecho ruim da imagem sem tocar no áudio.

    `tarja` põe o chapéu dentro de um retângulo colorido, em branco e num
    corpo maior — é o tratamento de chamada de atenção, forte demais pra
    usar em todo cartão.
    """
    ev = [caixa(0, 0, W, H, fundo, 0, 1, de, ate)]
    f_tit = ImageFont.truetype(FONT_BOLD, 96)
    linhas = quebra(titulo, f_tit, W - MARGEM * 2)
    tam_cha, esp_cha = (64, 10) if tarja else (46, 8)
    alt_cha = (tam_cha + 96) if chapeu else 0
    alt = len(linhas) * 124 + alt_cha + (116 if sub else 0)
    y = (H - alt) // 2 + 40
    if chapeu:
        txt = chapeu.upper()
        f_cha = ImageFont.truetype(FONT_SEMI, tam_cha)
        larg = f_cha.getlength(txt) + esp_cha * (len(txt) - 1)
        cor_cha = TIFFANY
        if tarja:
            pad_x, pad_y = 52, 26
            x0 = int((W - larg) / 2) - pad_x
            ev.append(caixa(x0, y - pad_y, int(x0 + larg) + pad_x * 2,
                            y + int(tam_cha * 1.18) + pad_y, tarja, 0, 1,
                            de, ate))
            cor_cha = BRANCO
        ev.append(texto(txt, W // 2, y, tam_cha, cor_cha, de, ate,
                        fonte="SemiBold", espaco=esp_cha))
        y += tam_cha + 96
    for linha in linhas:
        ev.append(texto(realce(linha, BRANCO, hl), W // 2, y, 96, BRANCO,
                        de, ate))
        y += 124
    if sub:
        ev.append(texto(realce(sub, BEGE, hl), W // 2, y + 26, 52, BEGE,
                        de, ate, fonte="Medium"))
    if rodape:
        # a assinatura sai do meio e vai pro pé do cartão, senão disputa
        # atenção com a chamada
        ev.append(texto(rodape, W // 2, H - 132, 44, TIFFANY, de, ate,
                        fonte="SemiBold"))
    return ev


def eventos_faixa(txt, de, ate):
    """Tarja de rodapé com a manchete, acima da linha de legenda."""
    f = ImageFont.truetype(FONT_BOLD, 68)
    linhas = quebra(txt, f, W - MARGEM * 2)
    alt = 88 * len(linhas) + 76
    y0 = H - RODAPE_LEGENDA - alt - 40
    ev = [caixa(0, y0, W, y0 + alt, TIFFANY, 0x14, 1, de, ate)]
    y = y0 + 38
    for linha in linhas:
        ev.append(texto(linha, W // 2, y, 68, BRANCO, de, ate))
        y += 88
    return ev


def eventos_selo(chapeu, txt, sub, de, ate):
    """Cartão de canto — o gene ou o exame que está sendo explicado."""
    f_txt = ImageFont.truetype(FONT_BOLD, 64)
    f_cha = ImageFont.truetype(FONT_SEMI, 30)
    f_sub = ImageFont.truetype(FONT_MED, 32)
    larg = max(f_txt.getlength(txt), f_cha.getlength(chapeu.upper()) + 4 * len(chapeu),
               f_sub.getlength(sub) if sub else 0) + 88
    alt = 176 + (48 if sub else 0)
    # no alto o cartão cobre o rosto assim que ela se move; embaixo cai
    # sobre a mesa e o jaleco, onde nada acontece
    x0, y0 = 96, H - RODAPE_LEGENDA - alt - 60
    ev = [caixa(x0, y0, x0 + larg, y0 + alt, BRANCO, 0x0D, 1, de, ate),
          caixa(x0, y0, x0 + 12, y0 + alt, TIFFANY, 0, 1, de, ate)]
    ev.append(texto(chapeu.upper(), x0 + 44, y0 + 30, 30, TIFFANY, de, ate,
                    fonte="SemiBold", alinha=7, espaco=4))
    ev.append(texto(txt, x0 + 44, y0 + 74, 64, DARK_TEAL, de, ate, alinha=7))
    if sub:
        ev.append(texto(sub, x0 + 44, y0 + 156, 32, (70, 90, 90), de, ate,
                        fonte="Medium", alinha=7))
    return ev


def eventos_painel(chapeu, titulo, sub, itens, de, ate):
    """Painel central grande — o formato de anúncio, que roda no mudo.

    O vídeo fica só como textura por trás, então aqui o texto é o
    conteúdo: nome do gene em corpo enorme e os pares rótulo/valor
    embaixo.
    """
    ev = []
    f_tit = ImageFont.truetype(FONT_BOLD, 132)
    linhas = quebra(titulo, f_tit, W - MARGEM * 2 - 120)
    alt = len(linhas) * 158 + (78 if chapeu else 0) + (86 if sub else 0)
    alt += len(itens or []) * 118
    y = (H - alt) // 2

    # painel atrás do bloco: só escurecer o vídeo inteiro não basta, o
    # texto branco ainda briga com a parede clara e a janela do consultório
    pad = 72
    ev.append(caixa(MARGEM - 40, y - pad, W - MARGEM + 40, y + alt + pad,
                    DARK_TEAL, 0x1A, 0, de, ate))

    if chapeu:
        ev.append(texto(chapeu.upper(), W // 2, y, 42, TIFFANY, de, ate,
                        fonte="SemiBold", espaco=9))
        y += 78
    for linha in linhas:
        ev.append(texto(realce(linha, BRANCO), W // 2, y, 132, BRANCO,
                        de, ate))
        y += 158
    if sub:
        ev.append(texto(realce(sub, BEGE), W // 2, y + 8, 54, BEGE, de, ate,
                        fonte="Medium"))
        y += 86
    for rotulo, valor in (itens or []):
        # rótulo e valor na mesma linha: o rótulo vira uma etiqueta curta
        # em Tiffany e o valor fica em branco, do lado
        f_rot = ImageFont.truetype(FONT_SEMI, 36)
        f_val = ImageFont.truetype(FONT_BOLD, 58)
        larg = f_rot.getlength(rotulo.upper()) + 4 * len(rotulo) + 32 \
            + f_val.getlength(valor)
        x = int((W - larg) / 2)
        ev.append(texto(rotulo.upper(), x, y + 18, 36, TIFFANY, de, ate,
                        fonte="SemiBold", alinha=7, espaco=4))
        ev.append(texto(valor, int(x + f_rot.getlength(rotulo.upper())
                                   + 4 * len(rotulo) + 32), y, 58, BRANCO,
                        de, ate, alinha=7))
        y += 118
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
Style: fala,Montserrat SemiBold,66,{base},&H00000000,&HC0000000,0,0,0,0,100,100,0,0,1,4,3,2,140,140,120,1
Style: caixa,Arial,20,{base},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: base,Montserrat Bold,54,{base},&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,8,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    linhas = list(manchetes)
    for ini, fim, txt in blocos:
        t = marca(txt, destaques, hl, base)
        # camada 3: a legenda fica por cima da tarja, nunca por baixo
        linhas.append(f"Dialogue: 3,{hms(ini + deslocamento)},"
                      f"{hms(fim + deslocamento)},fala,,0,0,0,,{t}")
    Path(caminho).write_text(cab + "\n".join(linhas) + "\n")


def clipe_cartao(tmp, nome, cfg, saida):
    """Abertura e fecho: cartão de tela cheia virando trecho de vídeo."""
    ass = tmp / f"{nome}.ass"
    faz_ass(ass, [], [], 0.0,
            eventos_cartao(cfg.get("chapeu"), cfg["titulo"], cfg.get("sub"),
                           0.0, cfg["dur"],
                           tarja=tuple(cfg["tarja"]) if cfg.get("tarja")
                           else None,
                           rodape=cfg.get("rodape"),
                           hl=tuple(cfg["hl"]) if cfg.get("hl") else None))
    caminho = str(ass).replace(":", r"\:")
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "lavfi",
        "-i", f"color=c=0x0E5959:s={W}x{H}:r={FPS}:d={cfg['dur']}",
        "-vf", f"subtitles='{caminho}':"
               f"fontsdir=/usr/share/fonts/truetype/montserrat," + FMT,
        "-pix_fmt", "yuv420p", *COR, "-c:v", "libx264", "-crf", "18",
        str(saida)], check=True)


def dur_video(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main():
    roteiro = json.loads(Path(sys.argv[1]).read_text())
    saida = sys.argv[2]
    tmp = Path(tempfile.mkdtemp())

    video = roteiro["video"]
    segs = json.loads(Path(roteiro["transcricao"]).read_text())
    destaques = [d.lower() for d in roteiro.get("destaques", [])]

    ab, fe = roteiro.get("abertura"), roteiro.get("fecho")
    dur_ab = ab["dur"] if ab else 0.0

    eventos = []
    for m in roteiro.get("manchetes", []):
        de, ate = m["de"] + dur_ab, m["ate"] + dur_ab
        if m["tipo"] == "cheia":
            eventos += eventos_cartao(
                m.get("chapeu"), m["texto"], m.get("sub"), de, ate,
                tarja=tuple(m["tarja"]) if m.get("tarja") else None,
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
    blocos = [] if roteiro.get("sem_legenda") else blocos_legenda(segs)
    # legendas próprias do roteiro: no anúncio mudo o texto não vem da
    # fala, é escrito pra ser lido
    blocos += [(l["de"], l["ate"], l["texto"])
               for l in roteiro.get("legendas", [])]
    blocos.sort(key=lambda b: b[0])
    faz_ass(ass, blocos, destaques, dur_ab, eventos)

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
               f"fontsdir=/usr/share/fonts/truetype/montserrat,"
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
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
        "-i", str(lista), "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", *COR,
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", saida,
    ], check=True)

    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", saida],
        capture_output=True, text=True, check=True)
    print(f"pronto: {saida} ({float(out.stdout.strip()):.1f}s)")


if __name__ == "__main__":
    main()
