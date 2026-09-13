# -*- coding: utf-8 -*-
"""Colocar ela dentro de uma FOTO DE CENARIO (consultorio), sem cenario verde.

Duas etapas, e a segunda e a que quase ninguem lembra:

1. RECORTAR ELA do video (ja resolvido em fundo.py).
2. LIMPAR O CENARIO. Foto de consultorio quase sempre vem com uma pessoa
   sentada nele. Se a foto entra como esta, aparece gente atras dela. Aqui a
   pessoa do cenario e apagada e o buraco e reconstruido a partir da vizinhanca.
   ⚠️ Reconstrucao inventa: funciona em parede e prateleira lisa, e borra
   quando o buraco cai em cima de um movel com desenho. Cenario SEM gente e
   sempre melhor que cenario limpo por software.
"""
import subprocess, re, numpy as np, cv2, imageio_ffmpeg
from PIL import Image, ImageFilter
import fundo as F

FF = imageio_ffmpeg.get_ffmpeg_exe()
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")

def quadro(video, t=1.0):
    r = subprocess.run([FF, "-i", video], capture_output=True, text=True).stderr
    hdr = "bt2020" in r or "arib-std-b67" in r
    cmd = [FF, "-v", "error", "-ss", f"{t}", "-i", video, "-frames:v", "1"]
    if hdr: cmd += ["-vf", TONEMAP]
    cmd += ["-f", "image2pipe", "-vcodec", "png", "-"]
    return Image.open(__import__("io").BytesIO(
        subprocess.run(cmd, capture_output=True).stdout)).convert("RGB")

def limpar_cenario(plate, folga=14):
    """Apaga a pessoa da foto do cenario e reconstroi o buraco."""
    a = np.asarray(plate.convert("RGB"))
    m = F.mascara_pessoa(plate, suavizar=1.0)
    # a mascara tem que sobrar da pessoa: halo de cabelo e sombra denunciam
    dura = cv2.dilate((m > 0.25).astype(np.uint8), np.ones((folga, folga), np.uint8), 1)
    limpo = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), dura, 12, cv2.INPAINT_TELEA)
    limpo = cv2.cvtColor(limpo, cv2.COLOR_BGR2RGB).astype(np.float32)
    # 🔴 O TELEA ESTICA A COR EM LEQUE e o remendo fica com forma — um borrao
    # radial no meio da estante, que aparecia bem acima da cabeca dela. Cor
    # esticada some quando some a forma: a area remendada leva um desfoque
    # pesado e passa a ler como pedaco fora de foco, nao como defeito.
    k = int(max(a.shape) * 0.045) | 1
    mole = cv2.GaussianBlur(limpo, (k, k), 0)
    peso = cv2.GaussianBlur(dura.astype(np.float32), (k, k), 0)[..., None]
    limpo = limpo * (1 - peso) + mole * peso
    return Image.fromarray(np.clip(limpo, 0, 255).astype(np.uint8)), float(dura.mean())

def janela_limpa(plate, alvo_w, alvo_h, margem=0.0):
    """Escolhe o PEDACO da foto que tem menos pessoa dentro, no formato pedido.

    🔴 Melhor que consertar e nao precisar consertar. Apagar a pessoa da foto
    deixa um remendo — e o remendo aparece justamente nas bordas do quadro, que
    e onde ela NAO cobre. Aqui eu procuro a janela do formato certo com a menor
    area de pessoa; quando existe um pedaco limpo do cenario, ele entra
    inteiro, sem invencao nenhuma.

    Devolve (recorte, fracao_de_pessoa_na_janela).
    """
    import numpy as np, cv2
    a = np.asarray(plate.convert("RGB"))
    m = (F.mascara_pessoa(plate, suavizar=1.0) > 0.3).astype(np.float32)
    H, W = m.shape
    ar = alvo_w / alvo_h
    melhor = None
    for esc in (1.0, 0.85, 0.72, 0.60):
        if W / H >= ar: h = int(H * esc); w = int(h * ar)
        else:           w = int(W * esc); h = int(w / ar)
        if w > W or h > H: continue
        soma = cv2.integral(m)
        passo = max(4, min(W, H) // 60)
        for y in range(0, H - h + 1, passo):
            for x in range(0, W - w + 1, passo):
                s = soma[y+h, x+w] - soma[y, x+w] - soma[y+h, x] + soma[y, x]
                fr = s / (w * h)
                # janela maior ganha empate: perder resolucao tambem custa
                nota = fr + (1.0 - esc) * 0.12
                if melhor is None or nota < melhor[0]:
                    melhor = (nota, x, y, w, h, fr)
    _, x, y, w, h, fr = melhor
    return plate.crop((x, y, x + w, y + h)), float(fr)

def painel(ims, rotulos, larg=330, saida="novos/cena.jpg"):
    from PIL import ImageDraw, ImageFont
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 19)
    rs = [i.resize((larg, int(i.height * larg / i.width)), Image.LANCZOS) for i in ims]
    h = max(i.height for i in rs); o = Image.new("RGB", (larg * len(rs), h + 42), "black")
    d = ImageDraw.Draw(o)
    for k, (i, r) in enumerate(zip(rs, rotulos)):
        o.paste(i, (larg * k, 42))
        w = d.textlength(r, font=f); d.text((larg * k + (larg - w) / 2, 12), r, "white", f)
    o.save(saida, quality=90); return saida
