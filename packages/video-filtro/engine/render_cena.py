# -*- coding: utf-8 -*-
"""Render do trecho: filtro + blusa + troca de cenario, em 9:16 e 16:9.

🔴 casar_luz = 0. A correcao de luz foi REPROVADA pela Aline (12/09): ela
clareava o cenario, e fundo claro demais atras de uma pessoa normal e o que
faz a montagem parecer montagem ("eu to um fantasma ali"). O cenario entra com
a luz que ele tem.

O 16:9 NAO e um corte do 9:16 — cortar deixaria so o rosto. Ela e recortada e
POSICIONADA dentro do quadro largo, com o cenario preenchendo as laterais; a
escala e o topo da cabeca sao calculados UMA VEZ, no primeiro quadro, senao a
figura pulsa de tamanho a cada quadro.
"""
import os, sys, subprocess, multiprocessing, numpy as np, imageio_ffmpeg
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageFilter

FF = imageio_ffmpeg.get_ffmpeg_exe()
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")

def enquadrar(plate, W, H, desfoque):
    g = plate.convert("RGB")
    e = max(W / g.width, H / g.height)
    g = g.resize((int(g.width * e) + 1, int(g.height * e) + 1), Image.LANCZOS)
    x, y = (g.width - W) // 2, (g.height - H) // 2
    g = g.crop((x, y, x + W, y + H))
    return np.asarray(g.filter(ImageFilter.GaussianBlur(desfoque)), dtype=np.float32)

_G = {}
def _init(preset, p916, p169, cor_blusa, W, H, LW, LH, escala, dx, dy, desf=0):
    import rapido, roupa2, fundo, maquiagem
    _G.update(R=rapido, C=roupa2, F=fundo, M=maquiagem, preset=preset,
              cor=cor_blusa, W=W, H=H, LW=LW, LH=LH, esc=escala, dx=dx, dy=dy,
              f916=enquadrar(Image.open(p916), W, H, desf),
              f169=(enquadrar(Image.open(p169), LW, LH, desf) if p169 else None))

def _quadro(args):
    i, bruto = args
    G = _G; W, H = G["W"], G["H"]
    im = Image.frombytes("RGB", (W, H), bruto)
    pts = G["M"].pontos(im)
    if pts is not None:
        im = G["R"].aplicar_quadro(im, pts, G["preset"])
        # estampa sai sempre; a COR so troca quando pedida (e quando o
        # segmentador achou a peca — no roupao floral ele acha 0,4% e trocar
        # pintaria qualquer coisa menos a roupa)
        # 🔴 ROUPA SO E TOCADA QUANDO PEDIDO (Aline 13/09: "a blusa eu posso
        # sempre usar; no maximo voce muda a cor, e se ficar estranha deixa
        # quieto"). O padrao e nao mexer: maquiagem e cenario sao o produto.
        if G["cor"] is not None:
            liso = G["C"].alisar(im, forca=0.92, escala=0.028)
            im = liso[0] if isinstance(liso, tuple) else liso
            nova, cob = G["C"].trocar_cor(im, G["cor"], forca=0.92, contraste=0.80)
            if cob > 0.03: im = nova
    m = G["F"].mascara_pessoa(im)[..., None]
    a = np.asarray(im, dtype=np.float32)
    v = np.clip(a * m + G["f916"] * (1 - m), 0, 255).astype(np.uint8)

    if G["f169"] is None: return i, v.tobytes(), None
    # 16:9 — ela recortada, reduzida e colada; nao e corte do vertical
    lw, lh = int(W * G["esc"]), int(H * G["esc"])
    pes = Image.fromarray(a.astype(np.uint8)).resize((lw, lh), Image.LANCZOS)
    msk = Image.fromarray((m[..., 0] * 255).astype(np.uint8)).resize((lw, lh), Image.LANCZOS)
    larg = Image.fromarray(G["f169"].astype(np.uint8))
    larg.paste(pes, (G["dx"], G["dy"]), msk)
    return i, v.tobytes(), np.asarray(larg, dtype=np.uint8).tobytes()

def render(entrada, saida916, saida169, preset, p916, p169, cor_blusa,
           segundos=None, trab=3, desfoque_fundo=0):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True).stderr
    import re
    mm = re.search(r", (\d+)x(\d+)", r); W, H = int(mm.group(1)), int(mm.group(2))
    if "rotation of -90" in r or "rotation of 90" in r: W, H = H, W
    fps = float(re.search(r"(\d+(?:\.\d+)?) fps", r).group(1))
    hdr = "bt2020" in r or "arib-std-b67" in r
    LW, LH = 1920, 1080

    # escala e posicao: uma vez so. Topo da cabeca a 7% do alto, como na foto
    # de referencia; o resto da figura sai pela base do quadro.
    import fundo as F, maquiagem as M2, rapido as R2, roupa2 as C2
    prim = _ler_um(entrada, W, H, hdr)
    mm0 = F.mascara_pessoa(prim)
    ys = np.where(mm0.max(1) > 0.5)[0]
    topo = int(ys[0]) if len(ys) else int(H * 0.20)
    esc = (LH * 0.93) / max(H - topo, 1)
    dx = (LW - int(W * esc)) // 2
    dy = int(LH * 0.07) - int(topo * esc)
    print(f"{W}x{H}@{fps} hdr={hdr} topo={topo} esc={esc:.3f} dx={dx} dy={dy}", flush=True)

    cmd = [FF, "-v", "error"]
    if segundos: cmd += ["-t", str(segundos)]
    cmd += ["-i", entrada]
    if hdr: cmd += ["-vf", TONEMAP]
    src = subprocess.Popen(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    def escritor(caminho, w, h):
        return subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo",
            "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
            "-c:v", "libx264", "-crf", "18", "-preset", "medium",
            "-pix_fmt", "yuv420p", caminho], stdin=subprocess.PIPE,
            stderr=subprocess.DEVNULL)
    d1 = escritor(saida916 + ".tmp.mp4", W, H)
    d2 = escritor(saida169 + ".tmp.mp4", LW, LH) if p169 else None

    tam = W * H * 3
    def lotes():
        i = 0
        while True:
            b = src.stdout.read(tam)
            if not b or len(b) < tam: break
            yield (i, b); i += 1
    # 🔴 NADA DE ex.map AQUI. Executor.map CONSOME O GERADOR INTEIRO na hora:
    # ele leria os 410 quadros crus (2,5 GB) pra memoria antes de entregar o
    # primeiro resultado, e trava — foi o que aconteceu, 2,8 GB por processo e
    # 0% de CPU. A submissao e limitada a uma janela pequena de propósito.
    from concurrent.futures import wait, FIRST_COMPLETED
    prox, pend, futs = 0, {}, {}
    gen = lotes()
    # 🔴 SPAWN, NUNCA FORK. O pai ja rodou o mediapipe (pra achar o topo da
    # cabeca), e o fork herda os mutex do TensorFlow Lite travados: os
    # trabalhadores nascem dormindo num futex e o render fica parado pra
    # sempre, sem erro nenhum — foram 15 minutos de 0% de CPU ate eu achar.
    ctx = multiprocessing.get_context("spawn")
    with ProcessPoolExecutor(trab, mp_context=ctx, initializer=_init,
            initargs=(preset, p916, p169, cor_blusa, W, H, LW, LH, esc, dx, dy,
                      desfoque_fundo)) as ex:
        def encher():
            while len(futs) < trab * 2:
                try: item = next(gen)
                except StopIteration: return
                futs[ex.submit(_quadro, item)] = item[0]
        encher()
        while futs:
            prontos, _ = wait(list(futs), return_when=FIRST_COMPLETED)
            for f in prontos:
                i, v, l = f.result(); del futs[f]; pend[i] = (v, l)
            while prox in pend:
                v2, l2 = pend.pop(prox)
                d1.stdin.write(v2)
                if d2 is not None and l2 is not None: d2.stdin.write(l2)
                prox += 1
                if prox % 30 == 0: print("  %d quadros" % prox, flush=True)
            encher()

    for d, s in [x for x in ((d1, saida916), (d2, saida169)) if x[0] is not None]:
        d.stdin.close(); d.wait()
        ac = [FF, "-y", "-v", "error", "-i", s + ".tmp.mp4"]
        if segundos: ac += ["-t", str(segundos)]
        ac += ["-i", entrada, "-map", "0:v", "-map", "1:a?", "-c:v", "copy",
               "-c:a", "aac", "-shortest", "-movflags", "+faststart", s]
        subprocess.run(ac, check=True); os.remove(s + ".tmp.mp4")
    print("pronto", prox, "quadros", flush=True)

def _ler_um(entrada, W, H, hdr):
    cmd = [FF, "-v", "error", "-ss", "1", "-i", entrada, "-frames:v", "1"]
    if hdr: cmd += ["-vf", TONEMAP]
    b = subprocess.run(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True).stdout
    return Image.frombytes("RGB", (W, H), b[:W * H * 3])
