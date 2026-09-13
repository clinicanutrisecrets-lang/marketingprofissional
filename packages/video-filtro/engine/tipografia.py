# -*- coding: utf-8 -*-
"""A letra grande da Aline — uma fonte so, pro video e pra capa.

🔴 O TAMANHO NAO E FIXO, E DERIVADO DO TEXTO. Foi isso que ela apontou olhando
o perfil do Flavio Passos: "olha o tamanho e a fonte e a PROPORCAO". La a
palavra ocupa sempre a mesma fatia da tela — palavra curta sai gigante, frase
longa quebra em duas linhas e ocupa a mesma largura. Com `px` fixo (era 54) a
frase curta saia pequena e a longa vazava; a letra parecia de legenda de
Netflix, nao de capa.

🔴 CONTORNO, NUNCA TARJA. A Aline recusou tarja atras do texto.

⚠️ Anton nao tem negrito nem italico — ele JA e o peso. Pedir "bold" nele
devolve o mesmo desenho, entao nunca simular com stroke duplo.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontes")
TITULO = os.path.join(DIR, "Anton.ttf")            # capa e palavra-chave do reel
APOIO = os.path.join(DIR, "Montserrat-ExtraBold.ttf")  # linha de apoio, menor


def _quebrar(d, texto, fonte, larg):
    """Quebra em linhas. Espaco DURO (\u00a0) mantem as palavras juntas.

    🔴 Split em espaco COMUM, nao `texto.split()` sem argumento: aquele trata
    o espaco duro como separador tambem, e ai "vitamina C" quebra no meio e o
    "C" fica sozinho abrindo a segunda linha. Serve pra tudo que nao pode
    separar: "vitamina C", "10 mg", "COMT AA".
    """
    linhas, atual = [], ""
    for pal in [x for x in texto.split(" ") if x]:
        t = (atual + " " + pal).strip()
        if d.textlength(t, font=fonte) > larg and atual:
            linhas.append(atual); atual = pal
        else:
            atual = t
    if atual: linhas.append(atual)
    return linhas


def ajustar(d, texto, caminho, larg_alvo, max_linhas=2, teto=400, piso=28):
    """Maior corpo em que o texto cabe em `max_linhas` ocupando ~`larg_alvo`.

    Busca binaria: o corpo cresce ate a linha mais larga encostar no alvo.
    """
    lo, hi, melhor = piso, teto, None
    while lo <= hi:
        px = (lo + hi) // 2
        f = ImageFont.truetype(caminho, px)
        ls = _quebrar(d, texto, f, larg_alvo)
        cabe = len(ls) <= max_linhas and all(d.textlength(l, font=f) <= larg_alvo for l in ls)
        if cabe:
            melhor = (px, f, ls); lo = px + 1
        else:
            hi = px - 1
    if melhor is None:
        f = ImageFont.truetype(caminho, piso)
        melhor = (piso, f, _quebrar(d, texto, f, larg_alvo))
    return melhor


def escrever(im, texto, *, caminho=TITULO, ocupa=0.86, max_linhas=2,
             baixo=0.16, topo=None, cor=(255, 255, 255), contorno=(0, 0, 0),
             caixa_alta=True, entrelinha=1.14, espaco=0.0, sombra=0.30):
    """Escreve a frase grande. `ocupa` = fatia da largura que o bloco preenche.

    🔴 ENTRELINHA 1.14, NAO 1.06. Em portugues a caixa alta carrega acento
    (NAO, VOCE, GENETICA) e o circunflexo sobe ACIMA da altura das maiusculas.
    Com a entrelinha que o ingles aguenta, o acento de uma linha encosta na
    letra da linha de cima — e isso so aparece na frase certa, nunca no teste.
    """
    d = ImageDraw.Draw(im, "RGBA")
    W, H = im.size
    if caixa_alta: texto = texto.upper()
    larg = W * ocupa
    px, f, linhas = ajustar(d, texto, caminho, larg, max_linhas, teto=int(H * 0.42))

    # espacamento entre letras (Anton fechado demais em caixa alta grande)
    def larg_linha(ln):
        return d.textlength(ln, font=f) + espaco * px * max(0, len(ln) - 1)

    alt = int(px * entrelinha)
    bloco = alt * len(linhas)
    y = int(H * topo) if topo is not None else int(H * (1 - baixo)) - bloco
    borda = max(3, int(px * 0.055))

    for ln in linhas:
        x = (W - larg_linha(ln)) / 2
        if sombra:
            d_s = int(px * 0.045)
            _linha(d, x + d_s, y + d_s * 1.4, ln, f, espaco, px, (0, 0, 0, int(255 * sombra)))
        if contorno:
            passos = max(10, int(borda * 3))
            for k in range(passos):
                ang = 2 * np.pi * k / passos
                _linha(d, x + np.cos(ang) * borda, y + np.sin(ang) * borda, ln, f, espaco, px, contorno)
        _linha(d, x, y, ln, f, espaco, px, cor)
        y += alt
    return im


def _linha(d, x, y, texto, f, espaco, px, cor):
    if not espaco:
        d.text((x, y), texto, font=f, fill=cor); return
    for ch in texto:
        d.text((x, y), ch, font=f, fill=cor)
        x += d.textlength(ch, font=f) + espaco * px


def legenda_array(a, texto, **kw):
    im = Image.fromarray(a)
    return np.asarray(escrever(im, texto, **kw).convert("RGB"))
