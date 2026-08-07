# -*- coding: utf-8 -*-
"""Núcleo de renderização: personagem, cards, setas, hélice."""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SS = 2  # supersampling

# --- paleta semântica Scanner ---
PAPER   = (244, 237, 224)
INK     = (15, 26, 31)
TIFFANY = (45, 212, 191)
AMBER   = (245, 137, 76)
CORAL   = (232, 69, 69)
MUSTARD = (232, 197, 71)
ROXO    = (123, 63, 160)
ROSE    = (178, 58, 95)

SKIN      = (232, 185, 154)
SKIN_SHAD = (214, 162, 130)
HAIR      = (74, 50, 40)
HAIR_LT   = (96, 66, 52)
BLOUSE    = (38, 122, 118)
LIP       = (176, 96, 92)

import os as _os
_FDIR = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "fonts")
FRAUNCES = _os.path.join(_FDIR, "Fraunces.ttf")
INTER    = _os.path.join(_FDIR, "Inter.ttf")

_font_cache = {}
def F(path, size, variation=None):
    key = (path, size, variation)
    if key not in _font_cache:
        f = ImageFont.truetype(path, size)
        if variation:
            try: f.set_variation_by_name(variation)
            except Exception: pass
        _font_cache[key] = f
    return _font_cache[key]

def title_f(size):        return F(FRAUNCES, size*SS, "Bold")
def body_f(size, w="Regular"): return F(INTER, size*SS, w)

def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))

def ease_out(t):  return 1 - (1-t)**3
def ease_in_out(t): return t*t*(3-2*t)

def vgrad(top, bottom, w=W, h=H):
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    ys = np.linspace(0, 1, h)[:, None]
    for c in range(3):
        arr[:, :, c] = (top[c] + (bottom[c]-top[c])*ys).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")

def new_sharp():
    """Camada transparente em 2x para elementos nítidos."""
    img = Image.new("RGBA", (W*SS, H*SS), (0,0,0,0))
    return img, ImageDraw.Draw(img)

def flatten(sharp, base):
    small = sharp.reduce(SS)
    return Image.alpha_composite(base, small)

# ---------------------------------------------------------------- personagem
def draw_woman(d, cx, head_top, scale=1.0,
               flush=0.0, eye="open", undereye=0.0, brow_tilt=0.0,
               body_bottom=None):
    """Ilustração flat de mulher (busto). Coordenadas em espaço 2x."""
    s = scale*SS
    hr  = 100*s
    cyh = head_top*SS + hr
    bb  = (body_bottom*SS) if body_bottom else H*SS

    skin = lerp(SKIN, (238, 172, 150), flush*0.50)
    shad = lerp(SKIN_SHAD, (222, 140, 126), flush*0.45)

    # ---- cabelo (massa de trás) ----
    hw = hr*1.26
    d.ellipse([cx-hw, cyh-hr*1.22, cx+hw, cyh+hr*0.85], fill=HAIR)
    d.polygon([
        (cx-hw*1.00, cyh-hr*0.10),
        (cx-hw*1.06, cyh+hr*0.95),
        (cx-hw*0.86, cyh+hr*1.90),
        (cx-hw*0.42, cyh+hr*2.05),
        (cx-hw*0.30, cyh+hr*1.25),
        (cx+hw*0.30, cyh+hr*1.25),
        (cx+hw*0.42, cyh+hr*2.05),
        (cx+hw*0.86, cyh+hr*1.90),
        (cx+hw*1.06, cyh+hr*0.95),
        (cx+hw*1.00, cyh-hr*0.10),
    ], fill=HAIR)

    # ---- pescoço ----
    nw   = hr*0.50
    ntop = cyh + hr*0.76
    nbot = cyh + hr*1.56
    d.rounded_rectangle([cx-nw/2, ntop, cx+nw/2, nbot], radius=nw*0.32, fill=shad)

    # ---- ombros / blusa ----
    shw   = 196*s
    shtop = nbot - hr*0.12
    d.polygon([
        (cx-nw*0.60, shtop),
        (cx-shw*0.92, shtop+hr*0.66),
        (cx-shw, bb),
        (cx+shw, bb),
        (cx+shw*0.92, shtop+hr*0.66),
        (cx+nw*0.60, shtop),
    ], fill=BLOUSE)
    d.ellipse([cx-shw, shtop+hr*0.14, cx-shw*0.14, shtop+hr*1.22], fill=BLOUSE)
    d.ellipse([cx+shw*0.14, shtop+hr*0.14, cx+shw, shtop+hr*1.22], fill=BLOUSE)
    # decote em V suave
    d.polygon([(cx-nw*0.92, shtop-nw*0.10),
               (cx, shtop+nw*0.86),
               (cx+nw*0.92, shtop-nw*0.10)], fill=shad)

    # ---- rosto ----
    d.ellipse([cx-hr*0.92, cyh-hr*1.04, cx+hr*0.92, cyh+hr*1.06], fill=skin)

    # ---- franja lateral (só a testa) ----
    d.polygon([
        (cx-hr*0.94, cyh-hr*0.36),
        (cx-hr*1.02, cyh-hr*0.86),
        (cx-hr*0.52, cyh-hr*1.14),
        (cx+hr*0.34, cyh-hr*1.16),
        (cx+hr*0.92, cyh-hr*0.92),
        (cx+hr*1.00, cyh-hr*0.42),
        (cx+hr*0.86, cyh-hr*0.56),
        (cx+hr*0.40, cyh-hr*0.72),
        (cx-hr*0.30, cyh-hr*0.66),
        (cx-hr*0.74, cyh-hr*0.50),
    ], fill=HAIR)
    d.polygon([(cx-hr*0.34, cyh-hr*0.92),(cx+hr*0.26, cyh-hr*0.98),
               (cx+hr*0.16, cyh-hr*0.74),(cx-hr*0.28, cyh-hr*0.70)], fill=HAIR_LT)

    # ---- olhos ----
    ex = hr*0.38
    ey = cyh - hr*0.04
    ew, eh = hr*0.235, hr*0.150
    for sgn in (-1, 1):
        px = cx + sgn*ex
        if undereye > 0.02:
            d.ellipse([px-ew*1.10, ey+eh*0.60, px+ew*1.10, ey+eh*2.45],
                      fill=lerp(skin, (168, 122, 124), undereye*0.70))
        if eye == "closed":
            d.arc([px-ew, ey-eh, px+ew, ey+eh*1.4], 200, 340, fill=INK, width=int(5*s))
        elif eye == "tired":
            d.chord([px-ew, ey-eh*0.80, px+ew, ey+eh*1.10], 0, 180, fill=(252,252,252))
            d.ellipse([px-eh*0.60, ey-eh*0.06, px+eh*0.60, ey+eh*1.00], fill=INK)
            d.line([(px-ew, ey-eh*0.24),(px+ew, ey-eh*0.06)], fill=INK, width=int(6*s))
        else:
            d.ellipse([px-ew, ey-eh, px+ew, ey+eh], fill=(252,252,252))
            d.ellipse([px-eh*0.70, ey-eh*0.62, px+eh*0.70, ey+eh*0.80], fill=INK)
            d.line([(px-ew, ey-eh*0.88),(px+ew, ey-eh*0.74)], fill=INK, width=int(5*s))

    # ---- sobrancelhas ----
    for sgn in (-1, 1):
        px = cx + sgn*ex
        y0 = ey - hr*0.36 + sgn*brow_tilt*hr*0.055
        y1 = ey - hr*0.42 - sgn*brow_tilt*hr*0.055
        d.line([(px-ew*0.92, y0),(px+ew*0.92, y1)], fill=HAIR, width=int(7*s))

    # ---- nariz + boca ----
    d.arc([cx-hr*0.11, cyh+hr*0.16, cx+hr*0.13, cyh+hr*0.42], 250, 350,
          fill=shad, width=int(4*s))
    my = cyh + hr*0.60
    if eye == "tired":
        d.arc([cx-hr*0.19, my-hr*0.05, cx+hr*0.19, my+hr*0.17], 200, 340,
              fill=LIP, width=int(6*s))
    else:
        d.arc([cx-hr*0.19, my-hr*0.15, cx+hr*0.19, my+hr*0.11], 20, 160,
              fill=LIP, width=int(6*s))

    # ---- rubor ----
    if flush > 0.02:
        blush = lerp(skin, CORAL, min(0.55, flush*0.60))
        for sgn in (-1, 1):
            px = cx + sgn*hr*0.54
            py = cyh + hr*0.26
            d.ellipse([px-hr*0.25, py-hr*0.145, px+hr*0.25, py+hr*0.145], fill=blush)
        d.rounded_rectangle([cx-nw/2, ntop+nw*0.30, cx+nw/2, nbot],
                            radius=nw*0.32, fill=lerp(shad, CORAL, flush*0.40))

    return {
        "face":  (cx/SS, cyh/SS),
        "eyes":  ((cx - ex - ew*1.15)/SS, ey/SS),
        "neck":  (cx/SS, ((ntop+nbot)/2)/SS),
        "chest": (cx/SS, (shtop + hr*0.52)/SS),
        "spine": (cx/SS, (shtop + hr*1.50)/SS),
        "hr": hr/SS,
    }
