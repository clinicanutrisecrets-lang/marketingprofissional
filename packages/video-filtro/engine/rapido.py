# -*- coding: utf-8 -*-
"""Pipeline otimizado. Mesma imagem, tempo aceitavel para video.

Duas ideias carregam o ganho:

1. BATOM, DELINEADOR E DENTE SO EXISTEM NUM PEDACO DA IMAGEM. A boca ocupa uns
   5% do quadro, e estava sendo calculada nos 100% — mascara de 1080x1920,
   blur de 1080x1920, aritmetica em 6,2 milhoes de pixels, para pintar um
   labio. Agora cada efeito roda no recorte da sua propria regiao e e colado
   de volta.
2. BORRAO NAO PRECISA DE RESOLUCAO. O blur da limpeza de pele sai em 1/3 do
   tamanho e volta ampliado: o resultado e um borrao de qualquer jeito, e o
   olho nao distingue.
"""
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
import filtro3r as R
import maquiagem as M

def _caixa(pts, ids, tam, margem=0.45):
    xs = [pts[i][0] for i in ids]; ys = [pts[i][1] for i in ids]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    mx, my = w * margem + 6, h * margem + 6
    return (max(0, int(min(xs) - mx)), max(0, int(min(ys) - my)),
            min(tam[0], int(max(xs) + mx)), min(tam[1], int(max(ys) + my)))

def _local(im, pts, ids, fn, margem=0.45):
    """Roda fn no recorte da regiao e cola de volta."""
    cx = _caixa(pts, ids, im.size, margem)
    if cx[2] - cx[0] < 8 or cx[3] - cx[1] < 8: return im
    pedaco = im.crop(cx)
    deslocado = [(x - cx[0], y - cx[1]) for x, y in pts]
    tratado = fn(pedaco, deslocado)
    out = im.copy(); out.paste(tratado, (cx[0], cx[1]))
    return out

def limpar_rapido(im, pele, forca=0.30, raio=11, limiar=16, div=3):
    if forca <= 0: return np.asarray(im, dtype=np.float32)
    p = im.resize((im.width // div, im.height // div), Image.BILINEAR)
    p = p.filter(ImageFilter.GaussianBlur(max(1, raio / div)))
    borr = np.asarray(p.resize(im.size, Image.BILINEAR), dtype=np.float32)
    a = np.asarray(im, dtype=np.float32)
    dif = np.abs(a - borr).max(2)
    w = (np.clip(1 - dif / limiar, 0, 1) * pele * forca)[..., None]
    return a * (1 - w) + borr * w

def base(im, cabelo_contraste=0.30, cabelo_profundidade=0.22, limpeza=0.30, nitidez=52):
    im = im.convert("RGB")
    pele, cabelo = R.mascaras(im)
    a = limpar_rapido(im, pele, forca=limpeza)
    c = cabelo[..., None]
    if c.max() > 0.01:
        v = np.clip(a / 255, 0, 1)
        v = (v - 0.46) * (1 + cabelo_contraste) + 0.46
        v = np.clip(v, 0, 1) ** (1 + cabelo_profundidade * 0.5) * 255
        cinza = (v * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
        a = a * (1 - c) + np.clip(cinza + (v - cinza) * 0.88, 0, 255) * c
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return out.filter(ImageFilter.UnsharpMask(radius=1.4, percent=nitidez, threshold=3))

OLHOS = M.CILIO_E + M.CILIO_D
BOCA = M.LABIO_EXT

def aplicar_quadro(im, pts, p):
    out = base(im, p["cabelo_contraste"], p["cabelo_profundidade"],
               p["limpeza"], p["nitidez"])
    if pts is None: return out
    out = _local(out, pts, OLHOS, lambda q, d: M.delineador(q, d, p["forca_delineador"],
                                    asa=p.get("asa_delineador", 0.44),
                                    subir=p.get("subir_delineador", 0.32),
                                    levantar=p.get("levantar_delineador", 0.55)), 1.1)
    out = _local(out, pts, BOCA, lambda q, d: M.batom(q, d, p["cor_batom"], p["forca_batom"],
                                    escurecer=p.get("escurecer_batom", 0.0)))
    if p.get("forca_dentes", 0) > 0:
        out = _local(out, pts, M.LABIO_INT,
                     lambda q, d: M.dentes(q, d, p["forca_dentes"]), 0.35)
    return out
