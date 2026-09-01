# -*- coding: utf-8 -*-
"""Motor genérico de reels Nutri Secrets, dirigido por SPEC declarativo."""
import math, os, re, sys, shutil, subprocess, tempfile, time
from PIL import Image, ImageDraw, ImageFilter
from core import *
from ui import *
from icons import badge, plane, bookmark
from foods import GLIFOS

FPS = 20
ROT = 2*math.pi/6.0
MODO_ANUNCIO = False
CARIMBO = ("IMERSÃO EM NUTRIGENÉTICA", "AULA GRATUITA PARA NUTRICIONISTAS")
# Handle exibido na assinatura — parametrizável por marca/franqueada
HANDLE = "@nutri_secrets"
HEAD_TOP, BODY_BOTTOM = 566, 1560
CARD_X, CARD_W = 62, 452
FADE_Y0 = 1330  # altura em que a figura começa a dissolver no fundo

# ------------------------------------------------- enquadramento da figura
# 🔴 A posição horizontal da figura era número mágico repetido cena a cena
# (762 no sintoma, 556 no gancho, 742 no close). A personagem PULAVA de lugar
# a cada corte, e foi isso que a Aline viu como "o vídeo não ficou
# centralizado" (01/09/2026). Agora ela é CALCULADA a partir do layout da
# cena: cena com card e cena sem card têm, cada uma, UM lugar só.
FOLGA_CARD = 60  # respiro entre o card de texto e a faixa livre da figura
                 # (a mesma margem lateral da zona segura, SAFE_L = 60)


def cx_figura(com_card):
    """Centro horizontal da figura, derivado do layout da cena.

    - cena SEM card (gancho): centro do canvas, W/2 = 540.
    - cena COM card: centro da faixa livre à direita do card, que vai de
      CARD_X + CARD_W + FOLGA_CARD = 62 + 452 + 60 = 574 até SAFE_R = 950,
      logo (574 + 950)/2 = 762 — exatamente o valor que estava escrito à mão.
      A conta fecha porque a faixa foi desenhada pro tamanho dela: a figura
      padrão (escala 0.92) tem meia-largura de 196*0.92 = 180 px nos ombros
      (core.draw_woman: shw = 196*s), então 762 + 180 = 942, 8 px dentro de
      SAFE_R, e 762 - 180 = 582, 8 px à direita do início da faixa.
    """
    if not com_card:
        return W/2
    return (CARD_X + CARD_W + FOLGA_CARD + SAFE_R)/2


CX_FIG = cx_figura(True)  # 762 — default de figure(), mantido por compatibilidade

# --- close-up (cena de sintoma com close=True) ---
# 🔴 Era scale=1.44 + head_top=392 + cx=742: a figura ficava 57% maior que a
# padrão, os ombros (meia-largura 196*1.44 = 282 px) INVADIAM o card de texto
# pela esquerda (742-282 = 460, e o card termina em 514) e estouravam 74 px
# além de SAFE_R pela direita (742+282 = 1024). Era o "zoom estranho" que a
# Aline relatou.
#
# A escala nova é DERIVADA, não chutada: é o maior close que ainda não encosta
# no card, com o centro vindo de cx_figura(True) = 762.
#   762 - 196*escala >= (CARD_X + CARD_W) + 16 de respiro = 530
#   196*escala <= 232  ->  escala <= 1.183
CLOSE_SCALE = 1.18   # meia-largura 196*1.18 = 231 -> borda esquerda em 531
# ⚠️ Pela direita os ombros ainda passam de SAFE_R (762+231 = 993, +43 px).
# Com o centro em 762 isso é inevitável em QUALQUER close (só escala <= 0.96
# caberia inteira, o que não é close nenhum). São 43 px de blusa chapada
# embaixo da coluna de botões do Reels: nenhum rosto, texto ou card se perde.
# Antes eram 74 px, e o card ainda ficava por cima do corpo.
#
# Topo do cabelo = head_top - 0.22*hr, com hr = 100*escala = 118 px:
#   470 - 26 = 444, ou seja 274 px abaixo de SAFE_T (170) e da linha do
#   eyebrow (186). Antes: 392 - 32 = 360.
CLOSE_HEAD_TOP = 470
# Com a figura maior, dissolver a partir de 1330 comia o busto bem na altura
# do card. O fade começa 70 px mais abaixo e termina no mesmo BODY_BOTTOM
# (1560), 30 px acima de SAFE_B.
CLOSE_FADE_Y0 = 1400

# --- teto de duração (pedido da Juliana, 01/09/2026: reel até 1min30) ---
DUR_MAX_TOTAL = 90.0  # soma das cenas
DUR_MAX_CENA = 20.0   # nenhuma cena sozinha passa disso

COR = {"AMBER":AMBER,"CORAL":CORAL,"MUSTARD":MUSTARD,"TIFFANY":TIFFANY,
       "ROXO":ROXO,"ROSE":ROSE,"INK":INK}

def cor(nome, fb=MUSTARD):
    """Cor por nome, com fallback. O SPEC vem de modelo: nome de cor inventado
    não pode derrubar 10 minutos de render (mesma classe do KeyError 'belly'
    de 18/08/2026 e do KeyError 'alto' de 24/08/2026)."""
    return COR.get(str(nome or ""), fb)

def bg_warm(k): return vgrad(lerp(PAPER,(252,230,212),k), lerp((233,222,205),(244,204,180),k))
def bg_cool():  return vgrad(PAPER, (231,224,210))
def bg_ink():   return vgrad((17,30,35), (11,20,24))

def figure(cx=CX_FIG, head_top=HEAD_TOP, scale=0.92, fade=(FADE_Y0,BODY_BOTTOM), **kw):
    lay = Image.new("RGBA", (W*SS, H*SS), (0,0,0,0)); d = ImageDraw.Draw(lay)
    A = draw_woman(d, cx*SS, head_top, scale=scale, body_bottom=BODY_BOTTOM, **kw)
    fade_bottom(lay, *fade)
    return lay, A

def heat(o, t, inten):
    lay = Image.new("RGBA",(W,H),(0,0,0,0)); d = ImageDraw.Draw(lay)
    for i in range(4):
        ph=(t+i/4)%1.0; r=ph*(300+110*inten); a=max(0,int(115*(1-ph)**1.35))
        d.ellipse([o[0]-r,o[1]-r*.8,o[0]+r,o[1]+r*.8],
                  outline=lerp(AMBER,CORAL,min(1,ph*1.25))+(a,), width=11)
    return lay.filter(ImageFilter.GaussianBlur(9))

def sparks(o, fi, n=16, life=46):
    lay = Image.new("RGBA",(W,H),(0,0,0,0)); d = ImageDraw.Draw(lay)
    for p in range(n):
        sd=p*137; t=((fi+sd)%life)/life
        px=o[0]+math.sin(sd)*118+math.sin(fi*.11+sd)*16; py=o[1]-t*300-(sd%40)
        r=3.5+4*(1-t)
        d.ellipse([px-r,py-r,px+r,py+r],
                  fill=lerp(AMBER,CORAL,.35+.35*math.sin(sd))+(int(150*(1-t)),))
    return lay.filter(ImageFilter.GaussianBlur(2))

def sig(d, c=INK, a=170):
    if MODO_ANUNCIO:
        fh=body_f(25,"SemiBold"); t=HANDLE
        d.text(((SAFE_R-tw(d,t,fh)/SS)*SS, 104*SS), t, font=fh, fill=c+(int(a*0.85),))
        fc=body_f(22,"Bold")
        d.line([((W/2-190)*SS, 1516*SS), ((W/2+190)*SS, 1516*SS)], fill=c+(int(a*0.42),), width=int(2*SS))
        for i, linha in enumerate(CARIMBO):
            largura = sum(tw(d,ch,fc)/SS + 3 for ch in linha) - 3
            x = (W - largura)/2
            track_text(d, (x, 1544 + i*34), linha, fc, c+(int(a*(0.92 if i==0 else 0.68)),), track=3)
    else:
        f=body_f(26,"SemiBold"); t=HANDLE
        d.text(((SAFE_R-tw(d,t,f)/SS)*SS, 1636*SS), t, font=f, fill=c+(a,))

def fx(sec, t0, dur=0.45):   return ease_out(max(0.0, min(1.0,(sec-t0)/dur)))

# ============================================================ TIPOS DE CENA
def fit_title(d, txt, maxw, smax=148, smin=84):
    for s in range(smax, smin-1, -4):
        f = title_f(s)
        if tw(d, txt, f)/SS <= maxw:
            return f, s
    return title_f(smin), smin

def c_hook(S, c, fi, n):
    sec=fi/FPS
    base=bg_cool()
    # O gancho não desenha card: o texto ocupa o topo inteiro e a figura fica
    # embaixo. Logo, centro do canvas (540) — e não 556, que deixava a
    # personagem 16 px fora do eixo, o "quase centralizado" que salta aos olhos.
    lay,A=figure(cx=cx_figura(False), head_top=c.get("head_top",756), scale=0.94,
                 flush=.12+.05*math.sin(sec*1.8), eye="open", fade=(1400,BODY_BOTTOM))
    base=Image.alpha_composite(base, lay.reduce(SS))
    sh,d=new_sharp()
    ac = cor(S.get("cor_tema"), ROSE)
    a=int(255*fx(sec,0,0.40))
    ft, ts = fit_title(d, S["tema"], SAFE_R-SAFE_L)
    d.text((SAFE_L*SS, 236*SS), S["tema"], font=ft, fill=INK+(a,))
    ry = 236 + ts*1.34
    d.line([(SAFE_L*SS, ry*SS), ((SAFE_L+300)*SS, ry*SS)], fill=ac+(a,), width=int(7*SS))
    a2=int(255*fx(sec,0.45)); a3=int(255*fx(sec,0.80))
    if c.get("sub"):
        headline(d, c["sub"], ry+58, c.get("sub_size",60), INK+(a2,), maxw=780)
    else:
        fh=title_f(52)
        d.text((SAFE_L*SS, (ry+56)*SS), c["l1"], font=fh, fill=INK+(a2,))
        d.text((SAFE_L*SS, (ry+136)*SS), c["l2"], font=fh, fill=ac+(a3,))
    sig(d)
    return flatten(sh, base)

def c_sintoma(S, c, fi, n):
    sec=fi/FPS; ac=cor(c.get("cor"), AMBER)
    calor = c.get("calor", False)
    inten=(math.sin(sec*2*math.pi/2.6-math.pi/2)+1)/2 if calor else 0
    base = bg_warm(.35+.55*inten) if calor else bg_cool()
    fkw = dict(c.get("figura", {}))
    if calor: fkw["flush"]=.35+.6*inten
    if fkw.pop("olheira_anim", False): fkw["undereye"]=.55+.35*min(1,sec/2.2)
    close = c.get("close", False)
    # Cena com card: o close e o plano aberto compartilham o MESMO centro
    # (cx_figura(True) = 762). Só muda o tamanho e a altura da cabeça, então a
    # personagem não escorrega de lado no corte.
    lay,A = figure(cx=cx_figura(True),
                   head_top=CLOSE_HEAD_TOP if close else HEAD_TOP,
                   scale=CLOSE_SCALE if close else 0.92,
                   fade=((CLOSE_FADE_Y0 if close else FADE_Y0), BODY_BOTTOM),
                   **fkw)
    if calor:
        base=Image.alpha_composite(base, heat((A["neck"][0],A["neck"][1]+30),(sec/2.4)%1.0,inten).convert("RGBA"))
    base=Image.alpha_composite(base, lay.reduce(SS))
    if calor:
        base=Image.alpha_composite(base, sparks((A["neck"][0],A["neck"][1]),fi).convert("RGBA"))
    sh,d=new_sharp()
    eyebrow(d, c.get("eyebrow","sintoma"), ac)
    ap=int(255*fx(sec,0))
    cy = c.get("card_y", 946)
    card(d, CARD_X, cy, CARD_W, c.get("titulo",""), c.get("texto",""), ac,
         eyebrow=c.get("card_eb","o que você sente"), alpha=ap)
    # O roteiro é gerado por modelo e já chegou com alvo fora do mapa da figura
    # ("belly", 18/08/2026 — matou o render inteiro com KeyError e o reel da
    # Viviane ficou em "erro"). Alias pros nomes que o gerador usa + fallback
    # no tronco: alvo desconhecido aponta a seta pro corpo, nunca derruba o job.
    ALVO_ALIAS = {"head": "face", "belly": "spine", "hips": "spine",
                  "cabeca": "face", "barriga": "spine", "quadril": "spine"}
    alvo = str(c.get("alvo", "chest"))
    tgt = A.get(alvo) or A.get(ALVO_ALIAS.get(alvo, ""), A["chest"])
    off = c.get("alvo_off", (-30, 18))
    arrow(d, (CARD_X+CARD_W, cy), (tgt[0]+off[0], tgt[1]+off[1]), ac,
          prog=(sec-0.75)/0.85, alpha=ap, mode="v")
    sig(d)
    return flatten(sh, base)

def c_gene(S, c, fi, n):
    sec=fi/FPS; ac=cor(c.get("cor"), MUSTARD)
    base=bg_cool(); sh,d=new_sharp()
    eyebrow(d, c.get("eyebrow","por que acontece"), ac)
    helix(d, 838, 940, 900, 108, (sec*ROT)*c.get("giro",1), ac, cor(c.get("cor2"), TIFFANY))
    ap=int(255*fx(sec,0))
    card(d, CARD_X, 380, CARD_W+30, c.get("gene",""), c.get("texto",""), ac,
         eyebrow="gene", rs=c.get("rs",""), alpha=ap, fs=40)
    sig(d)
    return flatten(sh, base)

def c_sinergia(S, c, fi, n):
    """Revelação sequencial: ilustração -> nome -> quantidade -> frequência."""
    sec=fi/FPS; ac=cor(c.get("cor"), TIFFANY)
    base=bg_cool(); sh,d=new_sharp()
    eyebrow(d, "sinergia no prato", ac)
    a0=int(255*fx(sec,0,0.40))
    headline(d, c.get("titulo",""), 248, 60, INK+(a0,), maxw=820)

    itens = c.get("itens") or []; passo = c.get("passo", 3.0); t0 = 0.75
    for i,it in enumerate(itens):
        ini = t0 + i*passo
        ent = fx(sec, ini, 0.45)
        sai = 1.0 if i == len(itens)-1 else (1 - fx(sec, ini+passo-0.35, 0.35))
        vis = ent*sai
        if vis <= 0.02: continue
        av = int(255*vis)
        yb = 640 + (1-ent)*40
        # prato
        d.ellipse([(540-215)*SS,(yb-215)*SS,(540+215)*SS,(yb+215)*SS], fill=ac+(int(34*vis),))
        # Glifo inventado pelo modelo NÃO derruba o render: fica o prato sem
        # ilustração, com nome/quantidade/frequência intactos.
        _gl = GLIFOS.get(it.get("glifo",""))
        if _gl: _gl(d, 540, yb + math.sin(sec*1.9+i)*7, 360*(0.90+0.10*ent), av)
        # nome
        fn_=body_f(54,"Bold"); nm=it.get("nome","")
        d.text(((W-tw(d,nm,fn_)/SS)/2*SS, 920*SS), nm, font=fn_, fill=INK+(av,))
        # quantidade
        aq=int(255*vis*fx(sec, ini+0.55, 0.35))
        fq=title_f(82); q=it.get("qtd","")
        d.text(((W-tw(d,q,fq)/SS)/2*SS, 1000*SS), q, font=fq, fill=ac+(aq,))
        # frequência
        af=int(255*vis*fx(sec, ini+1.05, 0.35))
        ff=body_f(38,"SemiBold"); fr=it.get("freq","")
        fw=tw(d,fr,ff)/SS
        d.rounded_rectangle([((W-fw)/2-30)*SS, 1136*SS, ((W+fw)/2+30)*SS, 1204*SS],
                            radius=34*SS, outline=ac+(int(af*0.75),), width=int(2.5*SS))
        d.text(((W-fw)/2*SS, 1152*SS), fr, font=ff, fill=lerp(INK,(92,106,110),0.2)+(af,))

    sig(d)
    return flatten(sh, base)

def c_nota(S, c, fi, n):
    """Cena só de texto: o porquê da combinação, em corpo grande."""
    sec=fi/FPS; ac=cor(c.get("cor"), TIFFANY)
    base=bg_cool(); sh,d=new_sharp()
    eyebrow(d, c.get("eyebrow","por que essa combinação"), ac)

    glifos = c.get("glifos", [])
    if glifos:
        n_g = len(glifos); passo_x = 236; x0 = 540 - passo_x*(n_g-1)/2
        for i,g in enumerate(glifos):
            gp = fx(sec, 0.15+i*0.22, 0.42)
            if gp<=0.02: continue
            gx, gy = x0+i*passo_x, 400 + (1-gp)*24
            d.ellipse([(gx-104)*SS,(gy-104)*SS,(gx+104)*SS,(gy+104)*SS],
                      fill=ac+(int(30*gp),))
            _gl = GLIFOS.get(g)
            if _gl: _gl(d, gx, gy, 176*(0.9+0.1*gp), int(255*gp))
        ty = 600
    else:
        ty = 380

    ft = body_f(c.get("fs",50), "Regular")
    d.line([(SAFE_L*SS, (ty-10)*SS), (SAFE_L*SS, (ty+300)*SS)],
           fill=ac+(int(255*fx(sec,0.55,0.4)),), width=int(8*SS))
    para_reveal(d, SAFE_L+38, ty, c["texto"], ft,
                lerp(INK,(58,72,76),0.10), SAFE_R-SAFE_L-38,
                sec, t0=0.75, passo=0.46, lh=1.52)
    sig(d)
    return flatten(sh, base)

def c_marcadores(S, c, fi, n):
    sec=fi/FPS; ac=cor(c.get("cor"), ROXO)
    base=bg_cool(); sh,d=new_sharp()
    eyebrow(d, c.get("eyebrow","exame de sangue"), ac)
    a=int(255*fx(sec,0,0.40))
    y=headline(d, c.get("titulo",""), 250, 60, INK+(a,), maxw=820)
    y += 40
    itens = c.get("itens") or []
    for i,it in enumerate(itens):
        ap=int(255*fx(sec, 0.45+i*0.42, 0.5))
        if ap<=2: continue
        # 🔴 O prompt do agente gerava itens {"nome","faixa"} enquanto esta
        # cena exigia {"alto","nome","ludico","alavanca"} — KeyError('alto')
        # matou o render de 24/08/2026 no frame 9/12 (reel da endometriose da
        # Juliana). A cena agora aceita as duas formas: sem "ludico" a linha
        # descritiva some, e a "faixa" antiga vira a alavanca (↳ faixa ideal).
        alto = bool(it.get("alto", True))
        nome = it.get("nome", "")
        ludico = it.get("ludico") or ""
        alavanca = it.get("alavanca") or it.get("faixa") or ""
        y = marker_row(d, SAFE_L, y, SAFE_R-SAFE_L, alto, nome,
                       ludico, alavanca, ac, alpha=ap)
    if c.get("nota"):
        na=int(255*fx(sec, 0.55+len(itens)*0.42+0.6, 0.55))
        if na>2:
            callout(d, SAFE_L, min(y+28, 1276), SAFE_R-SAFE_L, c["nota"], ac, alpha=na)
    sig(d)
    return flatten(sh, base)

def _virada_linhas(c):
    """Devolve (l1, l2, corpo) da cena de virada a partir do que o agente mandou.

    Aceita as duas formas: {l1, l2, texto} (o desenho original) e {texto}
    sozinho (o que o prompt vinha gerando). No segundo caso, quebra a frase na
    fronteira de sentença mais próxima do meio — a virada é sempre 1-2 frases,
    então isso cai naturalmente em duas linhas grandes.
    """
    l1 = (c.get("l1") or "").strip()
    l2 = (c.get("l2") or "").strip()
    corpo = (c.get("texto") or "").strip()
    if l1:
        return l1, l2, corpo
    if not corpo:
        return "", "", ""
    partes = [p.strip() for p in re.split(r'(?<=[.!?])\s+', corpo) if p.strip()]
    if len(partes) >= 2:
        meio = len(partes) // 2
        return " ".join(partes[:meio]), " ".join(partes[meio:]), ""
    return corpo, "", ""


def c_virada(S, c, fi, n):
    sec=fi/FPS
    base=bg_ink(); sh,d=new_sharp()
    helix(d, 800, 1080, 900, 130, sec*ROT, MUSTARD, TIFFANY, alpha=70)
    a=int(255*fx(sec,0)); a2=int(255*fx(sec,1.05)); a3=int(210*fx(sec,2.0,0.5))
    # 🔴 Esta cena exigia l1 + l2 + texto, mas o prompt do agente só mandava
    # "texto" — resultado: KeyError('l1') e o reel INTEIRO morria, em toda
    # geração (a virada está nos dois formatos, 30s e 60s). O prompt foi
    # corrigido, e aqui a cena passou a se virar com o que chegar: sem l1/l2,
    # ela parte o texto em duas linhas grandes. Cena de vídeo não pode derrubar
    # 10 minutos de render por um campo que o modelo esqueceu.
    l1, l2, corpo = _virada_linhas(c)
    headline(d, l1, 470, 62, PAPER+(a,), maxw=760)
    if l2:
        headline(d, l2, 626, 62, MUSTARD+(a2,), maxw=760)
    f=body_f(31,"Regular")
    if corpo:
        para(d, SAFE_L, 830, corpo, f, PAPER+(a3,), 700)
    sig(d, PAPER, 150)
    return flatten(sh, base)

def _acao_f(d, txt, x):
    """Fonte da etiqueta de ação, encolhida até caber entre o ícone e a margem."""
    for s in range(40, 23, -2):
        f = body_f(s, "Bold")
        if tw(d, txt, f)/SS <= (SAFE_R - x):
            return f
    return body_f(24, "Bold")


def c_cta(S, c, fi, n):
    sec=fi/FPS
    base=vgrad(ROSE,(150,44,78)); sh,d=new_sharp()
    helix(d, 830, 1180, 860, 120, sec*ROT, PAPER, PAPER, alpha=34)
    eyebrow(d, "leva com você", PAPER)
    # 🔴 Esta cena desenhava as quatro frases FIXAS no código e ignorava o que o
    # agente escrevia — o convite de investigação da linha editorial ("Quer
    # investigar sua saúde com precisão? Me chama no direct") nunca chegava ao
    # vídeo. Agora o SPEC manda: l1/l2 são as perguntas, acao1/acao2 as
    # etiquetas ao lado dos ícones. Os ícones seguem fixos (avião = enviar/
    # direct, marcador = salvar), então a etiqueta deve combinar com o gesto.
    # Sem os campos, cai no texto de sempre — reel antigo não muda de cara.
    l1 = (c.get("l1") or "").strip() or "Conhece alguém que precisa saber disso?"
    l2 = (c.get("l2") or "").strip() or "Vai querer consultar depois?"
    acao1 = ((c.get("acao1") or "").strip() or "COMPARTILHE").upper()
    acao2 = ((c.get("acao2") or "").strip() or "SALVE").upper()
    a1=int(255*fx(sec,0))
    headline(d, l1, 300, 56, PAPER+(a1,), maxw=720)
    ap=fx(sec,0.55,0.55)
    if ap>0:
        aa=int(255*ap); icx=118+(1-ap)*-90+math.sin(sec*2.4)*7
        badge(d, icx, 620, 52, PAPER, aa); plane(d, icx+3, 620, 52, ROSE, aa)
        d.text(((icx+80)*SS, 594*SS), acao1, font=_acao_f(d, acao1, icx+80), fill=PAPER+(aa,))
    a2=int(255*fx(sec,1.25))
    headline(d, l2, 830, 56, PAPER+(a2,), maxw=720)
    bp=fx(sec,1.85,0.55)
    if bp>0:
        ba=int(255*bp); icy=1090+(1-bp)*-70+math.sin(sec*2.4+1.2)*5
        badge(d, 118, icy, 52, PAPER, ba); bookmark(d, 118, icy, 50, ROSE, ba)
        d.text((198*SS,(icy-26)*SS), acao2, font=_acao_f(d, acao2, 198), fill=PAPER+(ba,))
    a3=int(255*fx(sec,2.5,0.5)); f3=body_f(25,"Regular")
    d.text((SAFE_L*SS,1380*SS), S["assinatura"], font=f3, fill=PAPER+(int(a3*.72),))
    d.text((SAFE_L*SS,1418*SS), "Conteúdo educativo · avaliação individualizada",
           font=f3, fill=PAPER+(int(a3*.55),))
    sig(d, PAPER, 190)
    return flatten(sh, base)

def c_cta_anuncio(S, c, fi, n):
    """Variação publicitária do fecho: convite para a aula gratuita."""
    sec=fi/FPS
    base=vgrad(ROSE,(150,44,78)); sh,d=new_sharp()
    helix(d, 838, 1200, 880, 118, sec*ROT, PAPER, PAPER, alpha=32)

    eyebrow(d, c.get("eyebrow","aula gratuita"), PAPER)

    a1=int(255*fx(sec,0,0.45))
    headline(d, "Quer aprender sobre nutrigenética e nutrigenômica?",
             290, 62, PAPER+(a1,), maxw=760)

    a2=int(255*fx(sec,0.70,0.45))
    f2=body_f(40,"SemiBold")
    y2 = para(d, SAFE_L, 640, "Aula exclusiva para nutricionistas.",
              f2, PAPER+(a2,), 740, lh=1.34)
    a3=int(255*fx(sec,1.10,0.40))
    f3=title_f(72)
    d.text((SAFE_L*SS, (y2+14)*SS), "Gratuita.", font=f3, fill=PAPER+(a3,))

    bp=fx(sec,1.65,0.55)
    if bp>0:
        ba=int(255*bp)
        bw, bh = 660, 116
        by = 900 + (1-bp)*26 + math.sin(sec*2.2)*4
        d.rounded_rectangle([SAFE_L*SS, by*SS, (SAFE_L+bw)*SS, (by+bh)*SS],
                            radius=bh/2*SS, fill=PAPER+(ba,))
        fb=body_f(40,"Bold"); t="Inscreva-se na imersão"
        d.text(((SAFE_L+(bw-tw(d,t,fb)/SS)/2)*SS, (by+34)*SS), t, font=fb, fill=ROSE+(ba,))

    a4=int(255*fx(sec,2.3,0.5)); f4=body_f(25,"Regular")
    d.text((SAFE_L*SS,1380*SS), S["assinatura"], font=f4, fill=PAPER+(int(a4*.72),))
    d.text((SAFE_L*SS,1418*SS), "Conteúdo educativo · avaliação individualizada",
           font=f4, fill=PAPER+(int(a4*.55),))
    sig(d, PAPER, 190)
    return flatten(sh, base)

TIPOS = {"hook":c_hook, "cta_anuncio":c_cta_anuncio, "sintoma":c_sintoma, "gene":c_gene, "sinergia":c_sinergia, "nota":c_nota,
         "marcadores":c_marcadores, "virada":c_virada, "cta":c_cta}

def limitar_duracoes(cenas):
    """Aplica o teto de 1min30 do reel e devolve [(cena, dur), ...].

    Regra (pedido da Juliana, 01/09/2026): reel até 90 s. Quando o roteiro
    passa disso, as cenas EXCEDENTES DO FIM são descartadas inteiras — nunca
    encolhidas na proporção. Encurtar todas estraga o ritmo da narração e o
    tempo de leitura dos cards; perder a última cena é um corte limpo.
    Cena individual também não passa de DUR_MAX_CENA.
    """
    duracoes = []
    for c in cenas:
        try: dur = float(c.get("dur", 5.0))
        except (TypeError, ValueError): dur = 5.0
        duracoes.append(max(1.0, min(dur, DUR_MAX_CENA)))
    pedido = sum(duracoes)

    plano, total = [], 0.0
    for c, dur in zip(cenas, duracoes):
        if total + dur > DUR_MAX_TOTAL + 1e-6:
            break
        plano.append((c, dur)); total += dur

    descartadas = len(cenas) - len(plano)
    if descartadas:
        print(f"  !! teto de {DUR_MAX_TOTAL:.0f}s: {descartadas} cena(s) do fim "
              f"descartada(s) — o roteiro pedia {pedido:.1f}s, o vídeo sai com "
              f"{total:.1f}s", flush=True)
    return plano


def render(SPEC, out_mp4, workdir=None):
    # 🔴 O default era "/home/claude/_reel_build" — caminho da máquina onde o
    # motor foi escrito, que NÃO existe no runner do GitHub. Todo render morria
    # em 35s com PermissionError: [Errno 13] Permission denied: '/home/claude'
    # (o passo que marca 'erro' no banco roda depois, então a nutri via
    # "erro — tente de novo" pra sempre, sem pista do motivo). Agora o padrão é
    # uma pasta temporária do próprio sistema, que funciona em qualquer lugar.
    if workdir is None:
        workdir = os.path.join(tempfile.gettempdir(), "_reel_build")
    shutil.rmtree(workdir, ignore_errors=True); os.makedirs(workdir, exist_ok=True)
    idx=0; t0=time.time()
    # Cena de tipo desconhecido não derruba o job: sai com aviso (o vídeo sem
    # ela é infinitamente melhor que "erro — tente de novo" depois de 10 min).
    # Ela é descartada ANTES do teto de duração, senão gastaria orçamento de
    # segundos que nunca vão virar frame e derrubaria uma cena boa do fim.
    conhecidas = []
    for ci,c in enumerate(SPEC["cenas"]):
        if TIPOS.get(c.get("tipo")) is None:
            print(f"  !! cena {ci+1} de tipo desconhecido ({c.get('tipo')!r}) — pulada", flush=True)
        else:
            conhecidas.append(c)
    plano = limitar_duracoes(conhecidas)
    for ci,(c,dur) in enumerate(plano):
        fn=TIPOS[c["tipo"]]
        N=int(round(dur*FPS))
        for i in range(N):
            fn(SPEC, c, i, N).convert("RGB").save(f"{workdir}/f_{idx:05d}.jpg", quality=92)
            idx+=1
        print(f"  {ci+1:2d}/{len(plano)} {c['tipo']:11s} {N:3d}f  [{time.time()-t0:5.1f}s]", flush=True)
    subprocess.run(["ffmpeg","-y","-framerate",str(FPS),"-i",f"{workdir}/f_%05d.jpg",
        "-c:v","libx264","-preset","slow","-crf","20","-pix_fmt","yuv420p",
        "-r","30","-movflags","+faststart", out_mp4],
        check=True, capture_output=True)
    print(f"OK {idx} frames / {idx/FPS:.1f}s -> {out_mp4}")
    return out_mp4
