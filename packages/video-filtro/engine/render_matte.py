# -*- coding: utf-8 -*-
"""Render com ALPHA DE VERDADE e recorte estavel no tempo.

Duas coisas que a silhueta nao resolvia:

1. ALPHA POR PIXEL (matting). A silhueta so sabe dizer "dentro" ou "fora", e os
   vaos entre os cachos caem no "dentro" — levando junto o quarto claro onde ela
   gravou. O matting calcula quanto de cada pixel e cabelo e quanto e fundo, e
   so ai o cenario aparece ENTRE os fios.
2. ESTABILIDADE NO TEMPO. O recorte e refeito do zero a cada quadro; a diferenca
   de um pro outro vira tremor na borda. Medido neste video: 0,027 de tremor do
   lado em que a manga clara encosta na parede clara, contra 0,010 do lado com
   movel escuro atras — 2,6x, e o contraste da borda explica (220 x 324).
   🔴 A suavizacao NAO pode ser uma media simples: media borra o movimento real
   e deixa rastro. Aqui o peso do quadro anterior CAI quando a mudanca e grande
   (movimento de verdade) e sobe quando e pequena (hesitacao do detector).
"""
import os, re, subprocess, multiprocessing, numpy as np, cv2, imageio_ffmpeg
from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED
from PIL import Image

FF = imageio_ffmpeg.get_ffmpeg_exe()
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")
ESC = 0.5          # matting em metade da resolucao: 1,7s por quadro, nao 7s

_G = {}
def _init(preset, W, H):
    import rapido, roupa2, maquiagem, mediapipe as mp
    from pymatting import estimate_alpha_cf
    _G.update(R=rapido, C=roupa2, M=maquiagem, mp=mp, alpha=estimate_alpha_cf,
              preset=preset, W=W, H=H, k=np.ones((3, 3), np.uint8))

def _quadro(args):
    i, bruto = args
    G = _G; W, H = G["W"], G["H"]
    im = Image.frombytes("RGB", (W, H), bruto)
    pts = G["M"].pontos(im)
    if pts is not None:
        im = G["R"].aplicar_quadro(im, pts, G["preset"])
    a = np.asarray(im, dtype=np.uint8)

    cat = G["C"].segmentador().segment(
        G["mp"].Image(image_format=G["mp"].ImageFormat.SRGB,
                      data=np.ascontiguousarray(a))).category_mask.numpy_view()
    b = (cat != 0).astype(np.float32)
    if b.shape != (H, W):
        b = cv2.resize(b, (W, H), interpolation=cv2.INTER_LINEAR)

    ap = cv2.resize(a.astype(np.float64) / 255.0, None, fx=ESC, fy=ESC,
                    interpolation=cv2.INTER_AREA)
    bp = cv2.resize(b, None, fx=ESC, fy=ESC, interpolation=cv2.INTER_LINEAR)
    fg = cv2.erode((bp > 0.6).astype(np.uint8), G["k"], iterations=22)
    bg = cv2.dilate((bp > 0.3).astype(np.uint8), G["k"], iterations=26)
    tri = np.full(bp.shape, 0.5); tri[fg == 1] = 1.0; tri[bg == 0] = 0.0
    try:
        al = G["alpha"](ap, tri).astype(np.float32)
    except Exception:
        al = bp
    al = cv2.resize(al, (W, H), interpolation=cv2.INTER_LINEAR)
    return i, a.tobytes(), np.clip(al * 255, 0, 255).astype(np.uint8).tobytes()

def _suavizar(al, ant, peso=0.62, tolerancia=0.22):
    if ant is None: return al
    d = np.abs(al - ant)
    w = np.exp(-(d / tolerancia) ** 2) * peso
    return al * (1 - w) + ant * w

def render(entrada, saida, preset, plate, trab=3, crf=18):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True).stderr
    mm = re.search(r", (\d+)x(\d+)", r); W, H = int(mm.group(1)), int(mm.group(2))
    if "rotation of -90" in r or "rotation of 90" in r: W, H = H, W
    fps = float(re.search(r"(\d+(?:\.\d+)?) fps", r).group(1))
    hdr = "bt2020" in r or "arib-std-b67" in r
    F = np.asarray(Image.open(plate).convert("RGB").resize((W, H), Image.LANCZOS),
                   dtype=np.float32)
    print(f"{W}x{H}@{fps} hdr={hdr}", flush=True)

    cmd = [FF, "-v", "error", "-i", entrada] + (["-vf", TONEMAP] if hdr else [])
    src = subprocess.Popen(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    tmp = saida + ".tmp.mp4"
    dst = subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt",
        "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "libx264",
        "-crf", str(crf), "-preset", "medium", "-pix_fmt", "yuv420p", tmp],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    tam = W * H * 3
    def lotes():
        i = 0
        while True:
            b = src.stdout.read(tam)
            if not b or len(b) < tam: break
            yield (i, b); i += 1

    ctx = multiprocessing.get_context("spawn")   # fork trava com o mediapipe
    prox, pend, futs, ant = 0, {}, {}, None
    gen = lotes()
    with ProcessPoolExecutor(trab, mp_context=ctx, initializer=_init,
                             initargs=(preset, W, H)) as ex:
        def encher():
            while len(futs) < trab * 2:
                try: item = next(gen)
                except StopIteration: return
                futs[ex.submit(_quadro, item)] = item[0]
        encher()
        while futs:
            prontos, _ = wait(list(futs), return_when=FIRST_COMPLETED)
            for f in prontos:
                i, rgb, alf = f.result(); del futs[f]; pend[i] = (rgb, alf)
            while prox in pend:
                rgb, alf = pend.pop(prox)
                a = np.frombuffer(rgb, np.uint8).reshape(H, W, 3).astype(np.float32)
                al = np.frombuffer(alf, np.uint8).reshape(H, W).astype(np.float32) / 255
                al = _suavizar(al, ant); ant = al
                p = al[..., None]
                dst.stdin.write(np.clip(a * p + F * (1 - p), 0, 255)
                                .astype(np.uint8).tobytes())
                prox += 1
                if prox % 30 == 0: print("  %d quadros" % prox, flush=True)
            encher()
    dst.stdin.close(); dst.wait()
    subprocess.run([FF, "-y", "-v", "error", "-i", tmp, "-i", entrada, "-map", "0:v",
        "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", "-shortest",
        "-movflags", "+faststart", saida], check=True)
    os.remove(tmp); print("pronto", prox, "quadros", flush=True)
