# -*- coding: utf-8 -*-
"""Glifos vetoriais de alimentos, estilo flat. Coordenadas em 1x."""
import math
from core import SS

VERDE     = (74, 124, 89);   VERDE_C = (104, 150, 112)
BROC      = (86, 132, 92);   BROC_T  = (146, 172, 128)
SEM       = (206, 198, 138); SEM_B   = (146, 140, 84)
CACAU     = (92, 58, 46);    CACAU_C = (124, 84, 66)
CASCA     = (240, 222, 194); CASCA_S = (172, 142, 108); GEMA = (240, 186, 84)
AMEND     = (208, 162, 120); AMEND_B = (172, 124, 84)
LENT      = (214, 138, 84);  LENT_B  = (188, 110, 62)
PRATA     = (162, 178, 188); PRATA_S = (118, 138, 150)
QUEIJO    = (242, 208, 130); QUEIJO_B= (214, 172, 88)

def _rot(pts, ang, cx, cy):
    c, s = math.cos(ang), math.sin(ang)
    return [((px-cx)*c-(py-cy)*s+cx, (px-cx)*s+(py-cy)*c+cy) for px,py in pts]

def _P(pts):  # 1x -> 2x
    return [(x*SS, y*SS) for x,y in pts]

def _stroke(d, pts, color, w, a=255):
    """Contorno fechado com espessura real (polygon outline do PIL é 1px)."""
    p = _P(list(pts) + [pts[0]])
    d.line(p, fill=color+(a,), width=int(w*SS), joint="curve")

def _teardrop(cx, cy, w, h, ang=0, n=26):
    pts=[]
    for i in range(n):
        t = i/n*2*math.pi
        r = 1 - 0.32*math.cos(t)
        pts.append((cx + w*0.5*r*math.sin(t), cy - h*0.5*r*math.cos(t)))
    return _rot(pts, ang, cx, cy)

def _leaf(cx, cy, w, h, ang=0):
    pts=[]
    for i in range(24):
        t=i/23
        y = cy - h/2 + t*h
        k = math.sin(t*math.pi)**0.75
        pts.append((cx + w/2*k, y))
    for i in range(24):
        t=1-i/23
        y = cy - h/2 + t*h
        k = math.sin(t*math.pi)**0.75
        pts.append((cx - w/2*k, y))
    return _rot(pts, ang, cx, cy)

# ------------------------------------------------------------------ glifos
def semente_abobora(d, cx, cy, s, a=255):
    for dx, dy, ang, sc in [(-0.26,0.10,-0.35,1.0),(0.24,-0.06,0.28,1.05),(0.02,0.30,0.08,0.92)]:
        px, py = cx+dx*s, cy+dy*s
        w, h = 0.34*s*sc, 0.52*s*sc
        td = _teardrop(px,py,w,h,ang)
        d.polygon(_P(td), fill=SEM+(a,))
        _stroke(d, td, SEM_B, 4, a)
        d.polygon(_P(_teardrop(px,py,w*0.58,h*0.62,ang)), fill=SEM_B+(int(a*0.30),))

def espinafre(d, cx, cy, s, a=255):
    for dx, dy, ang, sc, col in [(-0.22,0.06,-0.55,1.0,VERDE),(0.24,0.02,0.5,0.95,VERDE_C),
                                 (0.0,-0.20,0.05,0.88,VERDE)]:
        px, py = cx+dx*s, cy+dy*s
        w, h = 0.42*s*sc, 0.66*s*sc
        d.polygon(_P(_leaf(px,py,w,h,ang)), fill=col+(a,))
        p0 = _rot([(px, py+h/2)], ang, px, py)[0]
        p1 = _rot([(px, py-h/2)], ang, px, py)[0]
        d.line(_P([p0,p1]), fill=(56,96,68)+(int(a*0.55),), width=int(3*SS))

def cacau(d, cx, cy, s, a=255):
    w = 0.72*s
    x0, y0 = cx-w/2, cy-w/2
    d.rounded_rectangle([(x0)*SS,(y0)*SS,(x0+w)*SS,(y0+w)*SS], radius=8*SS, fill=CACAU+(a,))
    for i in (1,2):
        d.line(_P([(x0+w*i/3, y0),(x0+w*i/3, y0+w)]), fill=CACAU_C+(a,), width=int(4*SS))
        d.line(_P([(x0, y0+w*i/3),(x0+w, y0+w*i/3)]), fill=CACAU_C+(a,), width=int(4*SS))
    d.rounded_rectangle([(x0)*SS,(y0)*SS,(x0+w)*SS,(y0+w*0.16)*SS], radius=6*SS,
                        fill=CACAU_C+(int(a*0.7),))

def ovo(d, cx, cy, s, a=255):
    w, h = 0.50*s, 0.66*s
    pts=[]
    for i in range(40):
        t=i/40*2*math.pi
        r = 1 - 0.16*math.cos(t)
        pts.append((cx + w*0.5*r*math.sin(t), cy - h*0.5*r*math.cos(t)))
    d.polygon(_P(pts), fill=CASCA+(a,))
    _stroke(d, pts, CASCA_S, 7, a)
    d.ellipse([(cx-w*0.30)*SS,(cy-h*0.22)*SS,(cx+w*0.06)*SS,(cy+h*0.10)*SS],
              fill=(252,244,232)+(int(a*0.75),))
    d.ellipse([(cx-w*0.44)*SS,(cy+h*0.10)*SS,(cx+w*0.44)*SS,(cy+h*0.42)*SS],
              fill=CASCA_S+(int(a*0.45),))

def amendoa(d, cx, cy, s, a=255):
    for dx, dy, ang, sc in [(-0.20,0.08,-0.42,1.0),(0.22,-0.04,0.38,0.98)]:
        px, py = cx+dx*s, cy+dy*s
        w, h = 0.36*s*sc, 0.56*s*sc
        d.polygon(_P(_leaf(px,py,w,h,ang)), fill=AMEND+(a,))
        p0=_rot([(px,py+h*0.34)],ang,px,py)[0]; p1=_rot([(px,py-h*0.30)],ang,px,py)[0]
        d.line(_P([p0,p1]), fill=AMEND_B+(int(a*0.55),), width=int(3*SS))

def lentilha(d, cx, cy, s, a=255):
    r = 0.13*s
    for dx, dy in [(-0.26,0.14),(0.0,0.20),(0.26,0.12),(-0.14,-0.10),(0.15,-0.12),(0.0,-0.32)]:
        px, py = cx+dx*s, cy+dy*s
        d.ellipse([(px-r)*SS,(py-r*0.86)*SS,(px+r)*SS,(py+r*0.86)*SS], fill=LENT+(a,))
        d.arc([(px-r)*SS,(py-r*0.86)*SS,(px+r)*SS,(py+r*0.86)*SS], 200, 340,
              fill=LENT_B+(a,), width=int(3*SS))

def sardinha(d, cx, cy, s, a=255):
    w, h = 0.78*s, 0.30*s
    body=[]
    for i in range(30):
        t=i/29
        body.append((cx-w/2+t*w, cy - h/2*math.sin(t*math.pi)**0.7))
    for i in range(30):
        t=1-i/29
        body.append((cx-w/2+t*w, cy + h/2*math.sin(t*math.pi)**0.7))
    d.polygon(_P(body), fill=PRATA+(a,))
    d.polygon(_P([(cx-w/2, cy),(cx-w/2-0.16*s, cy-0.16*s),(cx-w/2-0.16*s, cy+0.16*s)]),
              fill=PRATA_S+(a,))
    d.polygon(_P([(cx-0.02*s, cy-h*0.42),(cx+0.16*s, cy-h*0.92),(cx+0.20*s, cy-h*0.34)]),
              fill=PRATA_S+(a,))
    er=0.035*s
    d.ellipse([(cx+w*0.30-er)*SS,(cy-er-0.01*s)*SS,(cx+w*0.30+er)*SS,(cy+er-0.01*s)*SS],
              fill=(40,52,60)+(a,))
    d.line(_P([(cx-w*0.16, cy+h*0.10),(cx+w*0.24, cy+h*0.06)]),
           fill=PRATA_S+(int(a*0.7),), width=int(3*SS))

def queijo(d, cx, cy, s, a=255):
    w, h = 0.72*s, 0.52*s
    tri = [(cx-w/2, cy+h/2),(cx-w/2, cy-h*0.16),(cx+w/2, cy+h/2)]
    d.polygon(_P(tri), fill=QUEIJO+(a,))
    _stroke(d, tri, QUEIJO_B, 4, a)
    d.polygon(_P([(cx-w/2, cy-h*0.16),(cx-w/2+0.10*s, cy-h/2),(cx+w/2+0.06*s, cy+h*0.34),
                  (cx+w/2, cy+h/2)]), fill=QUEIJO_B+(a,))
    for dx, dy, rr in [(-0.14,0.20,0.045),(0.02,0.28,0.035),(-0.06,0.34,0.028)]:
        px,py,r = cx+dx*s, cy+dy*s, rr*s
        d.ellipse([(px-r)*SS,(py-r)*SS,(px+r)*SS,(py+r)*SS], fill=QUEIJO_B+(a,))

def brocolis(d, cx, cy, s, a=255):
    d.rounded_rectangle([(cx-0.08*s)*SS,(cy+0.02*s)*SS,(cx+0.08*s)*SS,(cy+0.38*s)*SS],
                        radius=6*SS, fill=BROC_T+(a,))
    for dx, dy, rr in [(-0.24,0.02,0.17),(0.24,0.02,0.17),(-0.10,-0.16,0.19),
                       (0.12,-0.16,0.19),(0.0,-0.30,0.16),(0.0,-0.02,0.18)]:
        px,py,r = cx+dx*s, cy+dy*s, rr*s
        d.ellipse([(px-r)*SS,(py-r)*SS,(px+r)*SS,(py+r)*SS], fill=BROC+(a,))
    for dx, dy, rr in [(-0.16,-0.14,0.07),(0.10,-0.22,0.06),(0.20,-0.02,0.055)]:
        px,py,r = cx+dx*s, cy+dy*s, rr*s
        d.ellipse([(px-r)*SS,(py-r)*SS,(px+r)*SS,(py+r)*SS], fill=BROC_T+(int(a*0.75),))

GLIFOS = {"semente_abobora":semente_abobora, "espinafre":espinafre, "cacau":cacau,
          "ovo":ovo, "amendoa":amendoa, "lentilha":lentilha, "sardinha":sardinha,
          "queijo":queijo, "brocolis":brocolis}
