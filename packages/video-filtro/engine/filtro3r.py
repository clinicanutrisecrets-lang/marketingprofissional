# -*- coding: utf-8 -*-
"""Mesma aparencia do filtro3, mas rapido o bastante para video longo.

O teste em 1080x1920 rodava a ~2s por quadro: um video de 3 minutos levaria
mais de tres horas. O ganho vem de uma observacao simples — MASCARA NAO
PRECISA DE RESOLUCAO. Ela e uma superficie suave; calcular em 1/4 do tamanho
e ampliar da o mesmo resultado visual por uma fracao do custo. O que continua
em resolucao cheia e o que o olho le como nitidez: o pixel da imagem.
"""
import numpy as np
from PIL import Image, ImageFilter

ESCALA = 4  # divisor para o calculo das mascaras

def _ycbcr(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (0.299*r + 0.587*g + 0.114*b,
            -0.169*r - 0.331*g + 0.500*b + 128,
            0.500*r - 0.419*g - 0.081*b + 128)

def mascaras(im):
    p = im.resize((im.width // ESCALA, im.height // ESCALA), Image.BILINEAR)
    a = np.asarray(p, dtype=np.float32)
    y, cb, cr = _ycbcr(a)
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    pele = ((cb > 80) & (cb < 132) & (cr > 134) & (cr < 176)
            & (y > 95) & (sat < 0.45))
    cabelo = (y < 105) & (sat > 0.10)
    def acabar(m, raio):
        im_m = Image.fromarray((m * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(max(1, raio / ESCALA)))
        return np.asarray(im_m.resize(im.size, Image.BILINEAR), dtype=np.float32) / 255
    mp_ = acabar(pele.astype(np.float32), 5)
    mc = acabar((cabelo & ~pele).astype(np.float32), 3)
    return mp_, mc

def aplicar(im, cabelo_contraste=0.30, cabelo_profundidade=0.22,
            limpeza=0.30, nitidez=52):
    im = im.convert("RGB")
    pele, cabelo = mascaras(im)
    a = np.asarray(im, dtype=np.float32)

    if limpeza > 0:
        borr = np.asarray(im.filter(ImageFilter.GaussianBlur(11)), dtype=np.float32)
        dif = np.abs(a - borr).max(2)
        w = (np.clip(1 - dif / 16, 0, 1) * pele * limpeza)[..., None]
        a = a * (1 - w) + borr * w

    c = cabelo[..., None]
    if c.max() > 0.01:
        v = np.clip(a / 255, 0, 1)
        v = (v - 0.46) * (1 + cabelo_contraste) + 0.46
        v = np.clip(v, 0, 1) ** (1 + cabelo_profundidade * 0.5) * 255
        cinza = (v * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
        v = cinza + (v - cinza) * 0.88
        a = a * (1 - c) + np.clip(v, 0, 255) * c

    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=nitidez, threshold=3))
