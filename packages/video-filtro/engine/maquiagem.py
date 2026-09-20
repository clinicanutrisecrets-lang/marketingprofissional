import os
# -*- coding: utf-8 -*-
"""Batom e delineador por pontos faciais.

Dois efeitos so, e de proposito: labios e linha dos cilios sao regioes
pequenas e bem definidas, entao ficam estaveis. Brinco e cabelo novo pedem
CRIAR objeto e rastrear quadro a quadro — isso treme e fica 'quase certo',
que e pior que nao ter.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import mediapipe as mp
from mediapipe.tasks import python as mpy
from mediapipe.tasks.python import vision

_det = None
def detector(caminho=None):
    # 🔴 CAMINHO ABSOLUTO. Relativo so funciona quando alguem roda de dentro
    # desta pasta; no worker o cwd e a raiz do repo e o modelo "some".
    if caminho is None:
        caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "face_landmarker.task")
    global _det
    if _det is None:
        _det = vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=mpy.BaseOptions(model_asset_path=caminho),
                num_faces=1))
    return _det

LABIO_EXT = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185]
LABIO_INT = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191]
CILIO_E   = [33,246,161,160,159,158,157,173,133]
CILIO_D   = [362,398,384,385,386,387,388,466,263]

def pontos(im):
    a = np.asarray(im.convert("RGB"))
    r = detector().detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=a))
    if not r.face_landmarks: return None
    h, w = a.shape[:2]
    return [(p.x * w, p.y * h) for p in r.face_landmarks[0]]

def _mascara(tam, poligonos, blur=2.5, largura=0):
    m = Image.new("L", tam, 0)
    d = ImageDraw.Draw(m)
    for pol in poligonos:
        if largura: d.line(pol + [pol[0]] if False else pol, fill=255, width=largura, joint="curve")
        else: d.polygon(pol, fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32) / 255

def batom(im, pts, cor=(198, 66, 84), forca=0.55, brilho=0.05, escurecer=0.0):
    """Tinge o labio MANTENDO A LUMINANCIA.

    A versao anterior misturava o pixel com uma cor escura: o labio ficava mais
    escuro em vez de mais colorido, e por isso o efeito sumia num video de
    qualidade real (mediu 8 de 255). Batom de verdade muda a CROMATICIDADE e
    deixa o brilho quieto — e o brilho e onde mora a textura do labio, a linha
    e o reflexo. Por isso o resultado tem cor viva sem virar adesivo.

    🔴 SO A CROMATICIDADE NAO FAZ VINHO. Mantendo a luminancia, QUALQUER cor sai
    clara — e vinho claro le como rosa. Por isso existe 'escurecer': ele baixa a
    luz do labio um pouco ANTES de tingir, de forma proporcional (o reflexo
    continua sendo o ponto mais claro), que e o que separa vinho de rosa.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    ext = [pts[i] for i in LABIO_EXT]
    ini = [pts[i] for i in LABIO_INT]
    # 🔴 A ABERTURA DA BOCA SAI INTEIRA DA MASCARA. Antes eu subtraia so 55%
    # dela — os outros 45% caiam em cima do DENTE, que ficava vermelho quando
    # ela falava. E o clareador roda depois e nao recupera: ele procura pixel
    # claro E AMARELADO, e dente ja tingido de vermelho nao e mais amarelado.
    m = np.clip(_mascara(im.size, [ext]) - _mascara(im.size, [ini], blur=1.6) * 1.15, 0, 1)
    if m.max() < 0.05: return im

    y = (a * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    c = np.array(cor, dtype=np.float32)
    yc = float((c * [0.299, 0.587, 0.114]).sum())
    if escurecer:
        # proporcional, nunca subtracao: subtrair achata o reflexo e o labio
        # vira um adesivo fosco. Assim a textura sobrevive.
        y = y * (1.0 - escurecer)
    tingido = y * (c / max(yc, 1))          # mesma luz, cromaticidade do batom
    p = (m * forca)[..., None]
    out = a * (1 - p) + np.clip(tingido, 0, 255) * p
    out = out + (m * brilho * 40)[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


# canto EXTERNO de cada olho — e de onde sai a asa do gatinho
CANTO_EXT_E, CANTO_INT_E = 33, 133
CANTO_EXT_D, CANTO_INT_D = 263, 362

def _traco(linha, esp_max, perfil=(0.22, 0.55, 1.0, 0.10)):
    """Poligono de espessura VARIAVEL ao longo da linha.

    Traco de espessura constante engrossa ate a ponta e parece adesivo. O
    delineador de verdade nasce fino no canto interno, engrossa perto do canto
    externo e AFINA ate sumir na ponta da asa."""
    pts = [np.array(q, dtype=float) for q in linha]
    n = len(pts)
    ini, meio, canto, ponta = perfil
    cima, baixo = [], []
    for k, q in enumerate(pts):
        t = k / max(n - 1, 1)
        if t < 0.5:    e = ini + (meio - ini) * (t / 0.5)
        elif t < 0.82: e = meio + (canto - meio) * ((t - 0.5) / 0.32)
        else:          e = canto + (ponta - canto) * ((t - 0.82) / 0.18)
        d = pts[min(k+1, n-1)] - pts[max(k-1, 0)]
        norma = np.linalg.norm(d) or 1.0
        perp = np.array([-d[1], d[0]]) / norma * (esp_max * e / 2)
        cima.append(tuple(q + perp)); baixo.append(tuple(q - perp))
    return cima + baixo[::-1]

OLHO_TODO_E = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246]
OLHO_TODO_D = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398]

def _linha_gatinho(pts, cilios, i_ext, i_int, subir, asa, esp, levantar=0.30):
    """Linha do delineador ACIMA dos cilios, do canto INTERNO ao EXTERNO,
    terminando na ponta da asa.

    🔴 A ORDEM DA LISTA E O QUE IMPORTA. CILIO_E e CILIO_D vem do canto
    EXTERNO para o INTERNO; acrescentar a ponta da asa no fim dessa lista faz
    o traco ir ate o canto interno e VOLTAR ATRAVESSANDO O OLHO para alcancar
    a asa — foi o risco por cima do olho. Aqui os pontos sao reordenados pela
    distancia ao canto interno, entao a linha caminha numa direcao so e a asa
    e a continuacao natural dela.

    O deslocamento e medido EM ESPESSURAS: a linha dos cilios ja e a borda do
    olho, entao subir menos que meia espessura joga metade do traco dentro.
    """
    ext, int_ = np.array(pts[i_ext]), np.array(pts[i_int])
    eixo = ext - int_
    larg = np.linalg.norm(eixo) or 1.0
    u = eixo / larg
    n = np.array([u[1], -u[0]])
    if np.dot(n, np.array(pts[105 if i_ext == 33 else 334]) - ext) < 0:
        n = -n                                    # a normal aponta pra testa
    ordem = sorted(cilios, key=lambda i: np.linalg.norm(np.array(pts[i]) - int_))
    # RENTE ao cilio: so o suficiente pra borda de baixo do traco nao entrar
    # no olho. Subir mais que isso faz o delineador flutuar e virar sobrancelha.
    base = esp * 0.46 + larg * subir * 0.02
    linha = []
    for k, i in enumerate(ordem):
        t = k / max(len(ordem) - 1, 1)
        q = np.array(pts[i])
        linha.append(tuple(q + n * (base * (0.74 + 0.30 * t))))
    # A ASA SAI NA TANGENTE E DEPOIS LEVANTA. Duas tentativas falharam antes:
    # angulo fixo pra cima virou risco vertical, e tangente pura foi PRA BAIXO
    # — porque no canto externo a propria linha do cilio desce. Entao a asa tem
    # dois trechos: o primeiro continua a curva (por isso nao tem quina) e o
    # segundo sobe numa direcao garantida, montada a partir da normal.
    fim = np.array(linha[-1])
    tang = fim - np.array(linha[-3 if len(linha) >= 3 else 0])
    tang = tang / (np.linalg.norm(tang) or 1.0)
    comp = larg * asa
    meio = fim + tang * (comp * 0.30)
    # 'fora' vem do eixo do olho, nao da tangente: e o que impede a asa de
    # herdar a descida do cilio. levantar=0 segue a tangente, 1 sobe forte.
    direc = u + n * (0.18 + 1.05 * levantar)
    direc = direc / (np.linalg.norm(direc) or 1.0)
    ponta = meio + direc * (comp * 0.62)
    linha.append(tuple(meio))
    linha.append(tuple(ponta))
    return linha

def delineador(im, pts, forca=0.42, espessura=None, asa=0.44, subir=0.32, levantar=0.30):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    olho = abs(pts[133][0] - pts[33][0]) or 1
    esp = espessura or max(3, olho * 0.115)
    pol = [_traco(_linha_gatinho(pts, CILIO_E, 33, 133, subir, asa, esp, levantar), esp),
           _traco(_linha_gatinho(pts, CILIO_D, 263, 362, subir, asa, esp, levantar), esp)]
    m = _mascara(im.size, pol, blur=max(0.9, esp * 0.20))
    # trava mecanica: o traco NUNCA pinta dentro do olho. Mesmo que o calculo
    # erre, o globo ocular esta fora da mascara por construcao.
    olhos = _mascara(im.size, [[pts[i] for i in OLHO_TODO_E],
                               [pts[i] for i in OLHO_TODO_D]], blur=1.2)
    m = np.clip(m - olhos * 1.15, 0, 1)
    p = (m * forca)[..., None]
    return Image.fromarray(np.clip(a * (1 - p * 0.80), 0, 255).astype(np.uint8))

def aplicar(im, com_batom=True, com_delineador=True, **kw):
    pts = pontos(im)
    if pts is None: return im, False
    if com_delineador: im = delineador(im, pts, forca=kw.get("forca_delineador", 0.42))
    if com_batom: im = batom(im, pts, cor=kw.get("cor_batom", (176, 74, 82)),
                             forca=kw.get("forca_batom", 0.34))
    return im, True


def dentes(im, pts, forca=0.55, tirar_amarelo=0.62):
    """Clareia o dente dentro da abertura da boca.

    A mascara nao e so 'dentro dos labios': dentro dela ainda ha lingua, gengiva
    e sombra. O peso vem de DUAS coisas — o pixel ser claro (dente reflete mais
    que lingua) e ser AMARELADO (vermelho acima do azul). Assim lingua e gengiva,
    que sao escuras e rosadas, ficam de fora, e a boca fechada nao recebe nada.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    m = _mascara(im.size, [[pts[i] for i in LABIO_INT]], blur=1.6)
    if m.max() < 0.05: return im
    y = (a * [0.299, 0.587, 0.114]).sum(2)
    dentro = m > 0.25
    if dentro.sum() < 40: return im
    # dente = o terco mais claro de dentro da boca
    corte = np.percentile(y[dentro], 58)
    claro = np.clip((y - corte) / max(corte * 0.32, 1), 0, 1)
    amarelo = np.clip((a[..., 0] - a[..., 2]) / 46, 0, 1)
    peso = (m * claro * (0.45 + 0.55 * amarelo) * forca)[..., None]

    cinza = (a * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    alvo = cinza + (a - cinza) * (1 - tirar_amarelo)      # tira o amarelado
    alvo = np.clip(alvo * 1.10 + 12, 0, 255)              # e abre um pouco
    return Image.fromarray(np.clip(a * (1 - peso) + alvo * peso, 0, 255).astype(np.uint8))
