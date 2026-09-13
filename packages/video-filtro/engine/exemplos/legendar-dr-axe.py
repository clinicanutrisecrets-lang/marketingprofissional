# -*- coding: utf-8 -*-
"""Poe as DUAS frases do formato Dr. Axe por cima do b-roll.

🔴 O formato e: b-roll sem fala, musica, e DUAS frases na tela — a primeira
desperta a curiosidade, a segunda diz pra quem e. O conteudo inteiro vai na
legenda do post, e o resto vai por direct pra quem comentar a palavra.

🔴 As frases entram e saem com FADE. Texto que aparece e some de estalo num
video de 24 quadros por segundo pisca; 8 quadros de transicao resolvem.
"""
import sys, os, subprocess, numpy as np, imageio_ffmpeg
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from PIL import Image
import tipografia as T

FF = imageio_ffmpeg.get_ffmpeg_exe()

# 🔴 DUAS LINHAS, NAO TRES, E BEM EMBAIXO. Com tres linhas o bloco sobe ate o
# meio do quadro e tapa a acao — justamente a fruta entrando no liquidificador,
# que e o motivo do video existir. A frase cede espaco pra imagem, nunca o
# contrario.
FRASES = [
    (0.7, 10.6, "17x mais vitamina\u00a0C que a laranja"),
    (11.2, 22.6, "A fruta mais anti-inflamatória da tabela"),
]
FADE = 8  # quadros


def peso(i, fps, ini, fim):
    a, b = ini * fps, fim * fps
    if i < a - FADE or i > b + FADE: return 0.0
    if i < a:  return (i - (a - FADE)) / FADE
    if i > b:  return 1.0 - (i - b) / FADE
    return 1.0


def main(entrada, saida):
    r = subprocess.run([FF, "-i", entrada], capture_output=True, text=True).stderr
    import re
    W, H = map(int, re.search(r"(\d{2,5})x(\d{2,5})", r).groups())
    fps = float(re.search(r"(\d+(?:\.\d+)?) fps", r).group(1))

    # pre-desenha cada frase UMA vez, com fundo transparente
    camadas = []
    for ini, fim, txt in FRASES:
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        T.escrever(im, txt, ocupa=0.90, max_linhas=2, baixo=0.06, espaco=0.005)
        camadas.append((ini, fim, np.asarray(im).astype(np.float32)))

    ent = subprocess.Popen([FF, "-i", entrada, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    sai = subprocess.Popen([FF, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                            "-i", entrada, "-map", "0:v", "-map", "1:a?",
                            "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", saida],
                           stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n = W * H * 3
    i = 0
    while True:
        b = ent.stdout.read(n)
        if len(b) < n: break
        q = np.frombuffer(b, np.uint8).reshape(H, W, 3).astype(np.float32)
        for ini, fim, cam in camadas:
            p = peso(i, fps, ini, fim)
            if p <= 0: continue
            a = (cam[..., 3:4] / 255.0) * p
            q = q * (1 - a) + cam[..., :3] * a
        sai.stdin.write(np.clip(q, 0, 255).astype(np.uint8).tobytes())
        i += 1
    sai.stdin.close(); sai.wait(); ent.wait()
    print(f"pronto: {i} quadros")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
