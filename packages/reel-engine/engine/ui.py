# -*- coding: utf-8 -*-
"""Cards laterais, setas indicativas, hélice de DNA, chips de nutrientes."""
import math
from PIL import Image, ImageDraw, ImageFilter
from core import *

# zona segura (UI do Reels cobre base e lateral direita)
SAFE_L, SAFE_R = 60, 950
SAFE_T, SAFE_B = 170, 1590

def tw(d, txt, f):
    b = d.textbbox((0,0), txt, font=f); return b[2]-b[0]
def th(d, txt, f):
    b = d.textbbox((0,0), txt, font=f); return b[3]-b[1]

def track_text(d, xy, txt, f, fill, track=6):
    """Texto com letter-spacing (para eyebrows em caixa alta)."""
    x, y = xy[0]*SS, xy[1]*SS
    for ch in txt:
        d.text((x, y), ch, font=f, fill=fill)
        x += tw(d, ch, f) + track*SS
    return (x/SS - track)

def wrap(d, txt, f, maxw):
    out, cur = [], ""
    for w in txt.split(" "):
        t = (cur+" "+w).strip()
        if tw(d, t, f) <= maxw*SS or not cur: cur = t
        else: out.append(cur); cur = w
    if cur: out.append(cur)
    return out

def para(d, x, y, txt, f, fill, maxw, lh=1.42):
    """Parágrafo com quebra. x,y em 1x. Retorna y final (1x)."""
    lines = wrap(d, txt, f, maxw)
    step = th(d, "Ag", f)*lh
    cy = y*SS
    for ln in lines:
        d.text((x*SS, cy), ln, font=f, fill=fill)
        cy += step
    return cy/SS

def card(d, x, y, w, title, body, accent, eyebrow=None, rs=None, alpha=255, fs=37):
    """Card lateral. Coords 1x. Retorna (bbox_1x, ponto_de_saida_da_seta_1x)."""
    pad = 34
    f_eb   = body_f(25, "Bold")
    f_ti   = body_f(48, "Bold")
    f_rs   = body_f(30, "Medium")
    f_bd   = body_f(fs, "Regular")

    inner = w - pad*2 - 10
    # medir altura
    hh = pad
    if eyebrow: hh += 38
    tl = wrap(d, title, f_ti, inner); hh += len(tl)*th(d,"Ag",f_ti)*1.22/SS + 8
    if rs: hh += 46
    bl = wrap(d, body, f_bd, inner); hh += len(bl)*th(d,"Ag",f_bd)*1.42/SS + 6
    hh += pad

    box = (x, y, x+w, y+hh)
    d.rounded_rectangle([x*SS, y*SS, (x+w)*SS, (y+hh)*SS], radius=22*SS,
                        fill=PAPER+(alpha,))
    d.rounded_rectangle([x*SS, y*SS, (x+10)*SS, (y+hh)*SS], radius=5*SS,
                        fill=accent+(alpha,))

    cy = y + pad - 4
    tx = x + pad + 10
    if eyebrow:
        track_text(d, (tx, cy), eyebrow.upper(), f_eb, accent+(alpha,), track=4)
        cy += 40
    for ln in tl:
        d.text((tx*SS, cy*SS), ln, font=f_ti, fill=INK+(alpha,))
        cy += th(d,"Ag",f_ti)*1.22/SS
    cy += 8
    if rs:
        d.rounded_rectangle([tx*SS, cy*SS, (tx+tw(d,rs,f_rs)/SS+32)*SS, (cy+40)*SS],
                            radius=10*SS, fill=accent+(int(alpha*0.20),))
        d.text(((tx+15)*SS, (cy+4)*SS), rs, font=f_rs, fill=accent+(alpha,))
        cy += 52
    for ln in bl:
        d.text((tx*SS, cy*SS), ln, font=f_bd, fill=lerp(INK,(90,104,108),0.35)+(alpha,))
        cy += th(d,"Ag",f_bd)*1.42/SS

    return box, (x+w, y+hh/2)

def arrow(d, p0, p1, color, prog=1.0, alpha=255, mode="h"):
    """Seta em cotovelo de p0 (card) até p1 (ponto anatômico). Coords 1x.
    mode='h' -> horizontal primeiro | mode='v' -> sobe pela margem e entra na horizontal."""
    prog = max(0.0, min(1.0, prog))
    x0,y0 = p0; x1,y1 = p1
    if mode == "v":
        pts = [(x0,y0), (x0,y1), (x1,y1)]
    else:
        mx = x0 + (x1-x0)*0.55
        pts = [(x0,y0), (mx,y0), (mx,y1), (x1,y1)]
    segs = [(pts[i], pts[i+1]) for i in range(len(pts)-1)]
    L = sum(math.dist(a,b) for a,b in segs) or 1
    want, acc, drawn = L*prog, 0.0, []
    for a,b in segs:
        sl = math.dist(a,b)
        if acc + sl <= want:
            drawn.append((a,b)); acc += sl
        else:
            r = (want-acc)/sl if sl else 0
            drawn.append((a, (a[0]+(b[0]-a[0])*r, a[1]+(b[1]-a[1])*r)))
            break
    for a,b in drawn:
        d.line([(a[0]*SS,a[1]*SS),(b[0]*SS,b[1]*SS)], fill=color+(alpha,), width=int(5.0*SS))
    if prog > 0.985:
        r = 11
        d.ellipse([(x1-r)*SS,(y1-r)*SS,(x1+r)*SS,(y1+r)*SS], fill=color+(alpha,))
        d.ellipse([(x1-r*2.4)*SS,(y1-r*2.4)*SS,(x1+r*2.4)*SS,(y1+r*2.4)*SS],
                  outline=color+(int(alpha*0.55),), width=int(2.5*SS))

def helix(d, cx, cy, hh, amp, rot, c1, c2, alpha=255):
    """Dupla-hélice. Coords 1x."""
    n, rungs = 64, 15
    top, bot = cy-hh/2, cy+hh/2
    A, B = [], []
    for p in range(n+1):
        fr = p/n
        y = top + fr*hh
        ph = fr*3.4*math.pi + rot
        A.append((cx+amp*math.sin(ph), y, math.cos(ph)))
        B.append((cx+amp*math.sin(ph+math.pi), y, math.cos(ph+math.pi)))
    for r in range(rungs+1):
        i = int((r/rungs)*n)
        xa,y,da = A[i]; xb,_,db = B[i]
        front = (da+db)/2 > 0
        col = c1 if r % 2 == 0 else c2
        a = alpha if front else int(alpha*0.45)
        d.line([(xa*SS,y*SS),(xb*SS,y*SS)], fill=col+(a,), width=int((6 if front else 4)*SS))
    for st in (A, B):
        for p in range(len(st)-1):
            x1,y1,d1 = st[p]; x2,y2,d2 = st[p+1]
            front = (d1+d2)/2 > 0
            a = alpha if front else int(alpha*0.5)
            d.line([(x1*SS,y1*SS),(x2*SS,y2*SS)], fill=INK+(a,),
                   width=int((10 if front else 6)*SS))

def chip(d, x, y, label, accent, alpha=255, filled=False):
    f = body_f(30, "SemiBold")
    wpx = tw(d, label, f)/SS
    w = wpx + 52; h = 60
    if filled:
        d.rounded_rectangle([x*SS,y*SS,(x+w)*SS,(y+h)*SS], radius=h/2*SS, fill=accent+(alpha,))
        d.text(((x+26)*SS,(y+13)*SS), label, font=f, fill=PAPER+(alpha,))
    else:
        d.rounded_rectangle([x*SS,y*SS,(x+w)*SS,(y+h)*SS], radius=h/2*SS,
                            outline=accent+(alpha,), width=int(2.5*SS))
        d.text(((x+26)*SS,(y+13)*SS), label, font=f, fill=INK+(alpha,))
    return w

def chip_rows(d, x, y, items, accent, maxw, prog=1.0, gap=14):
    """Distribui chips em linhas, com entrada escalonada."""
    cx, cy = x, y
    for i, (lab, fill) in enumerate(items):
        p = max(0.0, min(1.0, prog*len(items) - i))
        if p <= 0: continue
        a = int(255*ease_out(p))
        f = body_f(30, "SemiBold")
        wpx = tw(d, lab, f)/SS + 52
        if cx + wpx > x + maxw:
            cx = x; cy += 74
        chip(d, cx, cy + (1-ease_out(p))*14, lab, accent, alpha=a, filled=fill)
        cx += wpx + gap
    return cy + 74

def eyebrow(d, txt, accent, y=SAFE_T):
    f = body_f(24, "Bold")
    x = track_text(d, (SAFE_L, y), txt.upper(), f, accent, track=5)
    d.line([( (x+16)*SS, (y+16)*SS), (SAFE_R*SS, (y+16)*SS)], fill=accent+(90,), width=int(2*SS))

def headline(d, txt, y, size=64, fill=INK, maxw=None, accent_word=None):
    f = title_f(size)
    mw = maxw or (SAFE_R-SAFE_L)
    lines = wrap(d, txt, f, mw)
    step = th(d,"Ag",f)*1.20/SS
    cy = y
    for ln in lines:
        d.text((SAFE_L*SS, cy*SS), ln, font=f, fill=fill)
        cy += step
    return cy

def fade_bottom(layer, y0, y1):
    """Aplica fade vertical no alpha da camada (coords 1x)."""
    import numpy as np
    a = np.array(layer.split()[-1], dtype=np.float32)
    hh = a.shape[0]
    yy0, yy1 = int(y0*SS), int(y1*SS)
    ramp = np.ones(hh, dtype=np.float32)
    if yy1 > yy0:
        seg = np.linspace(1, 0, yy1-yy0)
        ramp[yy0:yy1] = seg
        ramp[yy1:] = 0
    a *= ramp[:, None]
    layer.putalpha(Image.fromarray(a.astype('uint8'), 'L'))
    return layer

# ------------------------------------------------- componentes v2 (skill)
def synergy_card(d, x, y, w, foods, why, accent, alpha=255):
    """Card de sinergia alimentar: alimentos+quantidades e o porquê lúdico."""
    pad = 30
    f_eb = body_f(22, "Bold"); f_fd = body_f(31, "SemiBold"); f_wy = body_f(28, "Regular")
    inner = w - pad*2
    hh = pad + 32 + len(foods)*44 + 10
    wl = wrap(d, why, f_wy, inner); hh += len(wl)*th(d,"Ag",f_wy)*1.42/SS + pad
    d.rounded_rectangle([x*SS,y*SS,(x+w)*SS,(y+hh)*SS], radius=20*SS,
                        fill=accent+(int(alpha*0.13),))
    d.rounded_rectangle([x*SS,y*SS,(x+w)*SS,(y+hh)*SS], radius=20*SS,
                        outline=accent+(int(alpha*0.55),), width=int(2*SS))
    cy = y + pad - 6; tx = x + pad
    track_text(d, (tx, cy), "SINERGIA NO PRATO", f_eb, accent+(alpha,), track=4)
    cy += 34
    for nome, qtd in foods:
        d.text((tx*SS, cy*SS), "+", font=f_fd, fill=accent+(alpha,))
        d.text(((tx+26)*SS, cy*SS), nome, font=f_fd, fill=INK+(alpha,))
        qw = tw(d, qtd, f_fd)/SS
        d.text(((x+w-pad-qw)*SS, cy*SS), qtd, font=f_fd, fill=accent+(alpha,))
        cy += 44
    cy += 10
    for ln in wl:
        d.text((tx*SS, cy*SS), ln, font=f_wy, fill=lerp(INK,(92,106,110),0.35)+(alpha,))
        cy += th(d,"Ag",f_wy)*1.42/SS
    return y+hh

def dir_chip(d, cx, cy, r, up, accent, alpha=255):
    """Círculo com seta para cima (alto) ou para baixo (baixo)."""
    d.ellipse([(cx-r)*SS,(cy-r)*SS,(cx+r)*SS,(cy+r)*SS], fill=accent+(alpha,))
    k = r*0.46
    if up:
        d.polygon([((cx)*SS,(cy-k*1.15)*SS),((cx-k)*SS,(cy+k*0.15)*SS),
                   ((cx+k)*SS,(cy+k*0.15)*SS)], fill=PAPER+(alpha,))
        d.rectangle([(cx-k*0.30)*SS,(cy+k*0.05)*SS,(cx+k*0.30)*SS,(cy+k*1.15)*SS],
                    fill=PAPER+(alpha,))
    else:
        d.polygon([((cx)*SS,(cy+k*1.15)*SS),((cx-k)*SS,(cy-k*0.15)*SS),
                   ((cx+k)*SS,(cy-k*0.15)*SS)], fill=PAPER+(alpha,))
        d.rectangle([(cx-k*0.30)*SS,(cy-k*1.15)*SS,(cx+k*0.30)*SS,(cy-k*0.05)*SS],
                    fill=PAPER+(alpha,))

def marker_row(d, x, y, w, up, nome, ludico, alavanca, accent, alpha=255):
    """Linha de parâmetro de exame ou bactéria."""
    r = 32
    dir_chip(d, x+r, y+r+6, r, up, accent, alpha)
    tx = x + r*2 + 28
    iw = w - (tx - x)
    f_n = body_f(43, "Bold"); f_l = body_f(35, "Regular"); f_a = body_f(32, "SemiBold")
    d.text((tx*SS, y*SS), nome, font=f_n, fill=INK+(alpha,))
    cy = y + 56
    cy = para(d, tx, cy, ludico, f_l, lerp(INK,(92,106,110),0.35), iw)
    cy += 6
    d.text((tx*SS, cy*SS), "↳ " + alavanca, font=f_a, fill=accent+(alpha,))
    return cy + 58

def para_reveal(d, x, y, txt, f, fill, maxw, sec, t0=0.0, passo=0.42, lh=1.50):
    """Parágrafo com revelação linha a linha (ritmo de leitura)."""
    lines = wrap(d, txt, f, maxw)
    step = th(d,"Ag",f)*lh
    cy = y*SS
    for i, ln in enumerate(lines):
        a = ease_out(max(0.0, min(1.0, (sec - (t0+i*passo))/0.40)))
        if a > 0.01:
            dx = (1-a)*16
            d.text((x*SS + dx*SS, cy), ln, font=f, fill=fill+(int(255*a),))
        cy += step
    return cy/SS

def callout(d, x, y, w, txt, accent, alpha=255, fs=36):
    """Caixa de nota com texto legível, não rodapé miúdo."""
    f = body_f(fs, "Regular")
    pad = 30
    lines = wrap(d, txt, f, w - pad*2 - 16)
    step = th(d,"Ag",f)*1.44/SS
    hh = pad*2 + len(lines)*step
    d.rounded_rectangle([x*SS, y*SS, (x+w)*SS, (y+hh)*SS], radius=20*SS,
                        fill=accent+(int(alpha*0.19),))
    d.rounded_rectangle([x*SS, y*SS, (x+9)*SS, (y+hh)*SS], radius=4*SS,
                        fill=accent+(alpha,))
    cy = y + pad - 4
    for ln in lines:
        d.text(((x+pad+16)*SS, cy*SS), ln, font=f, fill=lerp(INK,(76,90,94),0.20)+(alpha,))
        cy += step
    return y + hh
