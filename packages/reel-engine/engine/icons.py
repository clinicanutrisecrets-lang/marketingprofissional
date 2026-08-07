# -*- coding: utf-8 -*-
"""Glifos vetoriais: aviãozinho (compartilhar) e marcador (salvar)."""
from core import SS

PLANE_BODY = [(0.96,0.07),(0.05,0.45),(0.43,0.57)]
PLANE_FIN  = [(0.96,0.07),(0.43,0.57),(0.56,0.96)]
BOOKMARK   = [(0.25,0.05),(0.75,0.05),(0.75,0.95),(0.50,0.68),(0.25,0.95)]

def _map(poly, cx, cy, size):
    return [((cx + (px-0.5)*size)*SS, (cy + (py-0.5)*size)*SS) for px,py in poly]

def badge(d, cx, cy, r, fill, alpha=255):
    d.ellipse([(cx-r)*SS,(cy-r)*SS,(cx+r)*SS,(cy+r)*SS], fill=fill+(alpha,))

def plane(d, cx, cy, size, color, alpha=255):
    d.polygon(_map(PLANE_BODY, cx, cy, size), fill=color+(alpha,))
    d.polygon(_map(PLANE_FIN,  cx, cy, size), fill=color+(int(alpha*0.72),))

def bookmark(d, cx, cy, size, color, alpha=255):
    d.polygon(_map(BOOKMARK, cx, cy, size), fill=color+(alpha,))
