# -*- coding: utf-8 -*-
"""Filtro elegante: NAO clareia, NAO apaga, NAO borra.

O que deu errado nas versoes anteriores, e que esta corrigido aqui:

1. A mascara de pele em YCbCr pega CABELO CASTANHO CLARO — a faixa de tom e a
   mesma. O cabelo estava sendo suavizado como se fosse rosto, e por isso
   ficava desfocado. Agora a pele exclui explicitamente o que for escuro o
   bastante para ser cabelo.
2. Clarear e dessaturar a pele em cima de um video que JA saiu filtrado do
   Instagram empilha os dois efeitos e produz o "po de arroz". A pele aqui
   nao ganha luz nem perde saturacao.
3. Cabelo escuro NAO se satura — saturar castanho escuro puxa pro vermelho.
   O que da "vida" e CONTRASTE: sombra mais funda e reflexo mais alto, que e
   o que o olho le como brilho.
"""
import numpy as np
from PIL import Image, ImageFilter

def _ycbcr(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (0.299*r + 0.587*g + 0.114*b,
            -0.169*r - 0.331*g + 0.500*b + 128,
            0.500*r - 0.419*g - 0.081*b + 128)

def _suave(m, raio):
    return np.asarray(Image.fromarray((np.clip(m,0,1)*255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32)/255

def mascaras(a):
    y, cb, cr = _ycbcr(a)
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    # pele: faixa de tom E clara o bastante. O piso de luminancia (>95) e o que
    # mantem a mecha castanha fora — sem ele o cabelo entra e vira borrao.
    pele = ((cb > 80) & (cb < 132) & (cr > 134) & (cr < 176)
            & (y > 95) & (sat < 0.45)).astype(np.float32)
    cabelo = ((y < 105) & (sat > 0.10)).astype(np.float32)
    cabelo = cabelo * (1 - _suave(pele, 3))
    return _suave(pele, 5), _suave(cabelo, 3)

def cabelo_com_vida(a, cabelo, contraste=0.30, profundidade=0.22, desavermelhar=0.88):
    """Sombra mais funda, reflexo mais alto, menos vermelho. E isso que le
    como 'preto com brilho' — nao saturacao."""
    c = cabelo[..., None]
    v = np.clip(a/255, 0, 1)
    v = (v - 0.46) * (1 + contraste) + 0.46           # contraste: cria o brilho
    v = v ** (1 + profundidade * 0.5)                  # aprofunda o preto
    tratado = np.clip(v, 0, 1) * 255
    cinza = (tratado * [0.299,0.587,0.114]).sum(2, keepdims=True)
    tratado = cinza + (tratado - cinza) * desavermelhar
    return a * (1 - c) + np.clip(tratado, 0, 255) * c

def limpar_mancha(im, pele, forca=0.30, raio=11, limiar=16):
    """Opcional e FRACO: so tira mancha de contraste muito baixo. Nao e
    'suavizar pele' — a textura fica."""
    if forca <= 0: return np.asarray(im, dtype=np.float32)
    a = np.asarray(im, dtype=np.float32)
    borr = np.asarray(im.filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32)
    dif = np.abs(a - borr).max(2)
    peso = (np.clip(1 - dif/limiar, 0, 1) * pele * forca)[..., None]
    return a * (1 - peso) + borr * peso

def aplicar(im, cabelo_contraste=0.30, cabelo_profundidade=0.22,
            limpeza=0.30, nitidez=52):
    im = im.convert("RGB")
    a0 = np.asarray(im, dtype=np.float32)
    pele, cabelo = mascaras(a0)
    a = limpar_mancha(im, pele, forca=limpeza)
    a = cabelo_com_vida(a, cabelo, cabelo_contraste, cabelo_profundidade)
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    # nitidez no fim devolve a definicao que qualquer mistura tira
    return out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=nitidez, threshold=3))

def medir(im):
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    pele, cabelo = mascaras(a)
    y, _, _ = _ycbcr(a)
    borr = np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(3)), dtype=np.float32)
    yb, _, _ = _ycbcr(borr)
    mp_, mc = pele > 0.6, cabelo > 0.6
    def sat(m):
        if m.sum() < 200: return 0.0
        r,g,b = a[...,0][m].mean(), a[...,1][m].mean(), a[...,2][m].mean()
        return float((max(r,g,b)-min(r,g,b))/max(r,g,b)*100)
    def nit(m):
        return float(np.abs(y-yb)[m].mean()) if m.sum() else 0
    return dict(pele_luz=round(float(y[mp_].mean()),1) if mp_.sum() else 0,
                pele_sat=round(sat(mp_),1), pele_textura=round(nit(mp_),2),
                cabelo_luz=round(float(y[mc].mean()),1) if mc.sum() else 0,
                cabelo_sat=round(sat(mc),1), cabelo_nitidez=round(nit(mc),2))
