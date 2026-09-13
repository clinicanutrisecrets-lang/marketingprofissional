# -*- coding: utf-8 -*-
"""Poe a chamada do formato Dr. Axe por cima do b-roll.

🔴 NAO APLICAR O FILTRO NOS VIDEOS DO HIGGSFIELD. Eles ja chegam tratados — a
Aline: "eles ja estao com filtro, ja estou bonitinha neles". O filtro de
maquiagem e pro que ELA grava (webcam, celular). Passar por cima do que ja veio
pronto e retrabalho, e ainda soma dois tratamentos na mesma imagem.

🔴 A COMPOSICAO E EMPILHADA, NAO SEQUENCIAL. Nao sao duas frases que se
revezam: e UMA frase no meio da tela, com a linha de publico MENOR logo abaixo.
Foi correcao dela depois de ver a versao anterior — o texto grande no rodape
"quase nao da pra ver", porque disputa com o balcao e com o liquidificador.
"""
import sys, os, subprocess, re, numpy as np, imageio_ffmpeg
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from PIL import Image, ImageDraw
import tipografia as T

FF = imageio_ffmpeg.get_ffmpeg_exe()

PRINCIPAL = "A fruta que você deveria consumir todos os dias"
PUBLICO = "Se você sofre com dor crônica, inflamação e doenças autoimunes"

ENTRA_PRINCIPAL = 0.7      # segundos
ENTRA_PUBLICO = 2.4
CENTRO = 0.50              # onde o bloco fica na altura da tela
FADE = 8                   # quadros


def montar(W, H):
    """Desenha a chamada inteira numa camada transparente, centrada.

    Devolve duas camadas: a principal e a de publico, pra cada uma poder
    entrar na sua hora sem mexer na posicao da outra.
    """
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)

    px1, f1, l1 = T.ajustar(d, PRINCIPAL.upper(), T.TITULO, W * 0.80, 3, teto=int(H * 0.16))
    px2, f2, l2 = T.ajustar(d, PUBLICO.upper(), T.APOIO, W * 0.78, 3, teto=int(px1 * 0.50))

    alt1 = int(px1 * 1.14) * len(l1)
    alt2 = int(px2 * 1.26) * len(l2)
    vao = int(px1 * 0.42)
    topo = int(H * CENTRO - (alt1 + vao + alt2) / 2)

    cam1 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    T.escrever(cam1, PRINCIPAL, ocupa=0.80, max_linhas=3,
               topo=topo / H, espaco=0.005, entrelinha=1.14)

    cam2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    T.escrever(cam2, PUBLICO, caminho=T.APOIO, ocupa=0.78, max_linhas=3,
               topo=(topo + alt1 + vao) / H, espaco=0.012, entrelinha=1.26,
               sombra=0.22)
    return [(ENTRA_PRINCIPAL, np.asarray(cam1).astype(np.float32)),
            (ENTRA_PUBLICO, np.asarray(cam2).astype(np.float32))]


def peso(i, fps, entra):
    a = entra * fps
    if i < a - FADE: return 0.0
    if i < a: return (i - (a - FADE)) / FADE
    return 1.0


def main(entrada, saida):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True).stderr
    W, H = map(int, re.search(r"(\d{2,5})x(\d{2,5})", r).groups())
    fps = float(re.search(r"(\d+(?:\.\d+)?) fps", r).group(1))
    camadas = montar(W, H)

    ent = subprocess.Popen([FF, "-i", entrada, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    sai = subprocess.Popen([FF, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                            "-i", entrada, "-map", "0:v", "-map", "1:a?",
                            "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", saida],
                           stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n, i = W * H * 3, 0
    while True:
        b = ent.stdout.read(n)
        if len(b) < n: break
        q = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)
        for entra, cam in camadas:
            p = peso(i, fps, entra)
            if p <= 0: continue
            a = (cam[..., 3:4] / 255.0) * p
            q = q * (1 - a) + cam[..., :3] * a
        sai.stdin.write(np.clip(q, 0, 255).astype(np.uint8).tobytes())
        i += 1
    sai.stdin.close(); sai.wait(); ent.wait()
    print(f"pronto: {i} quadros")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
