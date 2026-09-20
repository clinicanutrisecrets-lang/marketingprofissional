# -*- coding: utf-8 -*-
"""Lifting: o unico efeito aqui que mexe na GEOMETRIA, nao na cor.

Os filtros do Instagram fazem isso — afinam a linha da mandibula e levantam o
canto do olho e da boca. A implementacao e um campo de deslocamento suave:
alguns pontos de controle puxam, e o resto da imagem acompanha com peso que
cai com a distancia. Duas cautelas que definem se fica bom ou grotesco:

1. O DESLOCAMENTO E MINUSCULO — 1 a 3% da largura do rosto. Acima disso o
   rosto deixa de ser o dela.
2. O campo MORRE FORA DO ROSTO. Sem isso a parede e a estante ondulam atras
   da cabeca quando ela se mexe, e o olho pega na hora.
"""
import numpy as np
import cv2

MANDIBULA_E = [172, 136, 150, 149, 176]
MANDIBULA_D = [397, 365, 379, 378, 400]
BOCHECHA_E, BOCHECHA_D = [123, 116, 117], [352, 345, 346]
OLHO_EXT_E, OLHO_EXT_D = 33, 263
BOCA_E, BOCA_D = 61, 291
QUEIXO = 152
OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,
        152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]

def campo(pts, tam, afinar=0.022, levantar=0.016, olho=0.010, boca=0.008, div=8):
    """Devolve o deslocamento (dx, dy) em resolucao reduzida."""
    W, H = tam
    largura = abs(pts[454][0] - pts[234][0]) or 1.0
    centro_x = (pts[454][0] + pts[234][0]) / 2
    ctrl, desl = [], []

    for lado, ids in ((-1, MANDIBULA_E), (1, MANDIBULA_D)):
        for i in ids:
            x, y = pts[i]
            # puxa pro eixo do rosto e sobe um pouco: e o que afina o contorno
            ctrl.append((x, y)); desl.append((np.sign(centro_x - x) * largura * afinar,
                                              -largura * levantar))
    for ids in (BOCHECHA_E, BOCHECHA_D):
        for i in ids:
            ctrl.append(pts[i]); desl.append((0.0, -largura * levantar * 0.75))
    for i in (OLHO_EXT_E, OLHO_EXT_D):
        ctrl.append(pts[i]); desl.append((0.0, -largura * olho))
    for i in (BOCA_E, BOCA_D):
        ctrl.append(pts[i]); desl.append((0.0, -largura * boca))
    ctrl.append(pts[QUEIXO]); desl.append((0.0, -largura * levantar * 0.5))

    c = np.array(ctrl, dtype=np.float32) / div
    d = np.array(desl, dtype=np.float32)
    w, h = W // div, H // div
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    sigma = (largura / div) * 0.30
    dx = np.zeros((h, w), np.float32); dy = np.zeros((h, w), np.float32)
    peso = np.zeros((h, w), np.float32)
    for (cx, cy), (ux, uy) in zip(c, d):
        r2 = (xs - cx) ** 2 + (ys - cy) ** 2
        g = np.exp(-r2 / (2 * sigma ** 2))
        dx += g * ux; dy += g * uy; peso += g
    peso = np.maximum(peso, 1e-6)
    return dx / peso * np.clip(peso, 0, 1), dy / peso * np.clip(peso, 0, 1)

def mascara_rosto(pts, tam, div=8, folga=1.10):
    W, H = tam
    w, h = W // div, H // div
    m = np.zeros((h, w), np.uint8)
    pol = np.array([pts[i] for i in OVAL], dtype=np.float32)
    c = pol.mean(0)
    pol = (c + (pol - c) * folga) / div
    cv2.fillPoly(m, [pol.astype(np.int32)], 255)
    return cv2.GaussianBlur(m, (0, 0), max(1, w * 0.03)).astype(np.float32) / 255

def aplicar(im, pts, forca=1.0, **kw):
    import numpy as np
    if pts is None or forca <= 0: return im
    a = np.asarray(im.convert("RGB"))
    H, W = a.shape[:2]
    div = 8
    dx, dy = campo(pts, (W, H), div=div, **kw)
    m = mascara_rosto(pts, (W, H), div=div)      # o campo morre fora do rosto
    dx *= m * forca; dy *= m * forca
    dxg = cv2.resize(dx, (W, H), interpolation=cv2.INTER_CUBIC)
    dyg = cv2.resize(dy, (W, H), interpolation=cv2.INTER_CUBIC)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    # remap puxa do lugar OPOSTO: para a feicao ir para d, amostra-se em -d
    out = cv2.remap(a, xs - dxg, ys - dyg, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    from PIL import Image
    return Image.fromarray(out)
