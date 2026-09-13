# -*- coding: utf-8 -*-
"""Chroma key: recorte quando o fundo tem cor conhecida.

E por isto que o cinema usa verde. Com fundo qualquer, o computador tem que
ADIVINHAR onde a pessoa termina. Com verde ele CALCULA: verde e a cor mais
distante de pele e de cabelo, entao "quanto deste pixel e fundo" vira uma conta
por pixel — e e isso que preenche o vao entre dois fios de cabelo com o cenario.

Duas etapas, e a segunda e a que quase todo mundo esquece:

1. A CHAVE. alpha sai de quanto o verde excede o maior dos outros dois canais.
   Os limiares nao sao chutados: saem da propria distribuicao do quadro.
2. O DERRAME (despill). O pano verde REFLETE nela: a borda do cabelo e do ombro
   fica esverdeada. Sem tirar isso, a pessoa entra no cenario novo com um
   contorno verde — o mesmo halo de antes, so que verde.
"""
import numpy as np, cv2

def chave(a, suavizar=1.2, aperto=None):
    """a: RGB float32 0-255. Devolve (alpha 0-1, imagem sem derrame).

    🔴 OS LIMIARES SAEM DO PROPRIO QUADRO. Chutei (0,10 / 0,35) na primeira
    versao e o verde do HeyGen, que e escuro (6,91,24 => d = 0,26), caiu no MEIO
    da rampa: o fundo inteiro virou 36% opaco e quase metade do quadro ficou
    como "borda". Pano verde varia com marca, luz e compressao — medir e a
    unica forma de nao errar em todo material novo.
    """
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    outro = np.maximum(r, b)
    d = (g - outro) / 255.0                      # quanto de verde sobra
    if aperto is None:
        alto = d[d > 0.10]
        pico = float(np.median(alto)) if alto.size > d.size * 0.02 else 0.30
        lo, hi = 0.03, max(0.06, pico * 0.55)
    else:
        lo, hi = aperto
    al = 1.0 - np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    al = cv2.GaussianBlur(al.astype(np.float32), (0, 0), suavizar)

    # despill: onde o verde passa dos outros, ele volta pro nivel deles
    exc = np.clip(g - outro, 0, None)
    g2 = g - exc * 0.92
    lim = a.copy(); lim[..., 1] = g2
    return np.clip(al, 0, 1), lim

def compor(a, alpha, fundo):
    p = alpha[..., None]
    return np.clip(a * p + fundo * (1 - p), 0, 255).astype(np.uint8)
