# -*- coding: utf-8 -*-
"""Render de video gravado em FUNDO VERDE.

Aqui o recorte nao e estimado, e CALCULADO: por isso este caminho e ~10x mais
rapido que o do fundo comum e a borda do cabelo sai limpa sem matting nenhum.

⚠️ O HeyGen entrega o verde DENTRO de tarjas brancas. Chavear o quadro todo
trata a tarja como pessoa — a faixa verde e localizada antes.
"""
import os, re, subprocess, multiprocessing, numpy as np, imageio_ffmpeg
from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED
from PIL import Image
import chroma

FF = imageio_ffmpeg.get_ffmpeg_exe()

_G = {}
def _init(preset, W, H, fundo_bytes):
    import rapido, maquiagem
    _G.update(R=rapido, M=maquiagem, preset=preset, W=W, H=H,
              F=np.frombuffer(fundo_bytes, np.uint8).reshape(H, W, 3).astype(np.float32))

def _quadro(args):
    i, bruto = args
    G = _G; W, H = G["W"], G["H"]
    a = np.frombuffer(bruto, np.uint8).reshape(H, W, 3).astype(np.float32)
    al, lim = chroma.chave(a)
    if G["preset"] is not None:
        im = Image.fromarray(lim.astype(np.uint8))
        pts = G["M"].pontos(im)
        if pts is not None:
            lim = np.asarray(G["R"].aplicar_quadro(im, pts, G["preset"]), dtype=np.float32)
    return i, chroma.compor(lim, al, G["F"]).tobytes()

def faixa_verde(entrada):
    """Onde comeca e termina o verde, pra ignorar tarja."""
    b = subprocess.run([FF, "-v", "error", "-ss", "1", "-i", entrada, "-frames:v", "1",
                        "-f", "image2pipe", "-vcodec", "png", "-"],
                       capture_output=True).stdout
    import io
    a = np.asarray(Image.open(io.BytesIO(b)).convert("RGB"), dtype=np.float32)
    d = (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) / 255.0
    lin = np.where((d > 0.15).mean(1) > 0.25)[0]
    col = np.where((d > 0.15).mean(0) > 0.25)[0]
    if lin.size == 0: return None
    return int(col[0]), int(lin[0]), int(col[-1]) + 1, int(lin[-1]) + 1

def render(entrada, saida, preset, cenario, trab=3, crf=18):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True).stderr
    mm = re.search(r", (\d+)x(\d+)", r); W0, H0 = int(mm.group(1)), int(mm.group(2))
    if "rotation of -90" in r or "rotation of 90" in r: W0, H0 = H0, W0
    fps = float(re.search(r"(\d+(?:\.\d+)?) fps", r).group(1))

    caixa = faixa_verde(entrada)
    vf = []
    if caixa:
        x0, y0, x1, y1 = caixa
        W, H = x1 - x0, y1 - y0
        if (W, H) != (W0, H0):
            vf.append(f"crop={W}:{H}:{x0}:{y0}")
            print(f"tarja removida: {W0}x{H0} -> {W}x{H}", flush=True)
    else:
        W, H = W0, H0
    if W % 2: W -= 1
    if H % 2: H -= 1

    g = Image.open(cenario).convert("RGB") if cenario else None
    if g is None:
        F = np.zeros((H, W, 3), np.uint8)
    else:
        e = max(W / g.width, H / g.height)
        g = g.resize((int(g.width * e) + 1, int(g.height * e) + 1), Image.LANCZOS)
        x, y = (g.width - W) // 2, (g.height - H) // 2
        F = np.asarray(g.crop((x, y, x + W, y + H)), dtype=np.uint8)

    cmd = [FF, "-v", "error", "-i", entrada]
    if vf: cmd += ["-vf", ",".join(vf)]
    src = subprocess.Popen(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    tmp = saida + ".tmp.mp4"
    dst = subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "libx264", "-crf", str(crf),
        "-preset", "medium", "-pix_fmt", "yuv420p", tmp],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    tam = W * H * 3
    def lotes():
        i = 0
        while True:
            b = src.stdout.read(tam)
            if not b or len(b) < tam: break
            yield (i, b); i += 1

    ctx = multiprocessing.get_context("spawn")   # fork trava com o mediapipe
    prox, pend, futs = 0, {}, {}
    gen = lotes()
    with ProcessPoolExecutor(trab, mp_context=ctx, initializer=_init,
                             initargs=(preset, W, H, F.tobytes())) as ex:
        def encher():
            while len(futs) < trab * 2:
                try: item = next(gen)
                except StopIteration: return
                futs[ex.submit(_quadro, item)] = item[0]
        encher()
        while futs:
            prontos, _ = wait(list(futs), return_when=FIRST_COMPLETED)
            for f in prontos:
                i, v = f.result(); del futs[f]; pend[i] = v
            while prox in pend:
                dst.stdin.write(pend.pop(prox)); prox += 1
                if prox % 60 == 0: print("  %d quadros" % prox, flush=True)
            encher()
    dst.stdin.close(); dst.wait()
    subprocess.run([FF, "-y", "-v", "error", "-i", tmp, "-i", entrada, "-map", "0:v",
        "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", "-shortest",
        "-movflags", "+faststart", saida], check=True)
    os.remove(tmp); print("pronto", prox, "quadros", flush=True)
