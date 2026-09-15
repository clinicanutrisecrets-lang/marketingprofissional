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

# 🔴 A LINHA DE PUBLICO SO ENTRA NO SEGUNDO CLIPE. O video e a emenda de dois
# clipes (o primeiro acaba em 9,05 s). Deixar as duas frases juntas desde o
# comeco entrega tudo de uma vez; segurar a segunda ate a virada da cena da
# tempo pra pessoa ler a primeira, e a propria troca de cena marca a entrada.
ENTRA_PRINCIPAL = 0.7      # segundos
ENTRA_PUBLICO = 9.4        # logo depois do corte entre os dois clipes
CORTE_ENTRE_CLIPES = 9.05

# 🔴 O TERCEIRO TEMPO LIMPA A TELA. Na hora em que o suco cai no copo, as duas
# primeiras frases saem e entra UMA linha curta que manda pra legenda. Somar a
# terceira embaixo das outras duas empilharia tres blocos em cima do copo, que
# e a imagem mais bonita do video.
SAI_PRIMEIRAS = 16.8
ENTRA_CHAMADA = 17.3
CHAMADA = "O jeito de tomar muda tudo. Eu conto na legenda."
CENTRO = 0.50              # onde o bloco fica na altura da tela

# 🔴 A TARJA DA LINHA DE PUBLICO E VERDE, NAO PRETA. Pedido dela: "um
# pouquinho daquela transparencia, mas ao inves de preto, o Tiffany da Nutri
# Secrets". Fica TRANSLUCIDA de proposito — da pra ver a cena atraves dela —,
# mas com alfa alto o bastante pro branco continuar legivel por cima: o fundo
# ali e a blusa branca e o marmore, e verde claro demais sobre claro some.
TARJA = (10, 168, 168, 214)   # #0AA8A8 a 84%
TARJA_RAIO = 18
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
    y2 = topo + alt1 + vao
    larg2 = max(d.textlength(l, font=f2) + 0.012 * px2 * max(0, len(l) - 1) for l in l2)
    pad_x, pad_y = int(px2 * 0.62), int(px2 * 0.34)
    ImageDraw.Draw(cam2, "RGBA").rounded_rectangle(
        [((W - larg2) / 2 - pad_x, y2 - pad_y),
         ((W + larg2) / 2 + pad_x, y2 + alt2 + pad_y * 0.7)],
        radius=TARJA_RAIO, fill=TARJA)
    T.escrever(cam2, PUBLICO, caminho=T.APOIO, ocupa=0.78, max_linhas=3,
               topo=y2 / H, espaco=0.012, entrelinha=1.26,
               contorno=None, sombra=0.0)
    # a chamada final, sozinha no meio da tela
    cam3 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d3 = ImageDraw.Draw(cam3)
    px3, f3, l3 = T.ajustar(d3, CHAMADA.upper(), T.APOIO, W * 0.80, 3, teto=int(H * 0.075))
    alt3 = int(px3 * 1.26) * len(l3)
    y3 = int(H * CENTRO - alt3 / 2)
    larg3 = max(d3.textlength(l, font=f3) + 0.012 * px3 * max(0, len(l) - 1) for l in l3)
    px_, py_ = int(px3 * 0.62), int(px3 * 0.34)
    ImageDraw.Draw(cam3, "RGBA").rounded_rectangle(
        [((W - larg3) / 2 - px_, y3 - py_), ((W + larg3) / 2 + px_, y3 + alt3 + py_ * 0.7)],
        radius=TARJA_RAIO, fill=TARJA)
    T.escrever(cam3, CHAMADA, caminho=T.APOIO, ocupa=0.80, max_linhas=3,
               topo=y3 / H, espaco=0.012, entrelinha=1.26, contorno=None, sombra=0.0)

    return [(ENTRA_PRINCIPAL, SAI_PRIMEIRAS, np.asarray(cam1).astype(np.float32)),
            (ENTRA_PUBLICO, SAI_PRIMEIRAS, np.asarray(cam2).astype(np.float32)),
            (ENTRA_CHAMADA, None, np.asarray(cam3).astype(np.float32))]


def peso(i, fps, entra, sai=None):
    a = entra * fps
    if i < a - FADE: return 0.0
    p = 1.0 if i >= a else (i - (a - FADE)) / FADE
    if sai is not None:
        b = sai * fps
        if i > b + FADE: return 0.0
        if i > b: p = min(p, 1.0 - (i - b) / FADE)
    return max(0.0, p)


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
        # ⚠️ nada de chamar de `sai`: o processo de saida do ffmpeg ja se chama
        # assim, e o laco o sombreava — o erro so aparecia no PRIMEIRO quadro.
        for entra, ate, cam in camadas:
            p = peso(i, fps, entra, ate)
            if p <= 0: continue
            a = (cam[..., 3:4] / 255.0) * p
            q = q * (1 - a) + cam[..., :3] * a
        sai.stdin.write(np.clip(q, 0, 255).astype(np.uint8).tobytes())
        i += 1
    sai.stdin.close(); sai.wait(); ent.wait()
    print(f"pronto: {i} quadros")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
