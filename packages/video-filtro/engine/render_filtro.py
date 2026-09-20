# -*- coding: utf-8 -*-
"""Aplica o filtro num video inteiro, usando os nucleos disponiveis.

A ordem dos quadros e sagrada: os trabalhadores devolvem fora de ordem, e o
escritor so entrega ao ffmpeg quando o proximo indice chega. Sem isso o video
sai embaralhado de um jeito que nao da erro nenhum — so fica errado.
"""
import os, re, subprocess, sys
import numpy as np
from PIL import Image
from concurrent.futures import ProcessPoolExecutor
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
TONEMAP = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")

_p = None
def _init(preset):
    global _p, Q, M
    import rapido as Q_, maquiagem as M_
    Q, M = Q_, M_
    _p = preset

def _trabalho(args):
    i, bruto, W, H = args
    im = Image.frombytes("RGB", (W, H), bruto)
    pts = M.pontos(im)
    return i, Q.aplicar_quadro(im, pts, _p).tobytes(), pts is not None

def info(entrada):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True)
    m = re.search(r", (\d+)x(\d+)", r.stderr)
    W, H = int(m.group(1)), int(m.group(2))
    if "rotation of -90" in r.stderr or "rotation of 90" in r.stderr: W, H = H, W
    fps = re.search(r"(\d+(?:\.\d+)?) fps", r.stderr)
    hdr = "bt2020" in r.stderr or "arib-std-b67" in r.stderr
    return W, H, float(fps.group(1)) if fps else 30.0, hdr

def render(entrada, saida, preset, trabalhadores=None, crf=18):
    W, H, FPS, hdr = info(entrada)
    trabalhadores = trabalhadores or max(1, (os.cpu_count() or 2) - 1)
    vf = TONEMAP if hdr else None
    print(f"{W}x{H} @ {FPS}fps  hdr={hdr}  trabalhadores={trabalhadores}", flush=True)

    cmd = [FF, "-v", "error", "-i", entrada]
    if vf: cmd += ["-vf", vf]
    src = subprocess.Popen(cmd + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    tmp = saida + ".tmp.mp4"
    dst = subprocess.Popen([FF, "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", str(crf),
        "-preset", "medium", "-pix_fmt", "yuv420p", tmp],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    tam = W * H * 3
    def lotes():
        i = 0
        while True:
            b = src.stdout.read(tam)
            if len(b) < tam: break
            yield (i, b, W, H); i += 1

    pendentes, proximo, total, sem_rosto = {}, 0, 0, 0
    with ProcessPoolExecutor(trabalhadores, initializer=_init, initargs=(preset,)) as ex:
        for i, quadro, achou in ex.map(_trabalho, lotes(), chunksize=2):
            pendentes[i] = quadro
            if not achou: sem_rosto += 1
            while proximo in pendentes:            # so escreve em ordem
                dst.stdin.write(pendentes.pop(proximo)); proximo += 1; total += 1
                if total % 90 == 0: print(f"  {total} quadros", flush=True)

    src.stdout.close(); src.wait(); dst.stdin.close(); dst.wait()
    subprocess.run([FF, "-y", "-v", "error", "-i", tmp, "-i", entrada,
        "-map", "0:v", "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", saida], check=True)
    os.remove(tmp)
    print(f"pronto: {total} quadros, {sem_rosto} sem rosto ({100*sem_rosto/max(total,1):.1f}%)")
    return saida

if __name__ == "__main__":
    import preset_elegante as P
    render(sys.argv[1], sys.argv[2], P.ELEGANTE)
