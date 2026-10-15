"""Tira o fundo liso (branco ou quase) da logo antes de ela entrar no vídeo.

O vídeo tem fundo #F8F9FE (cinza-azulado bem claro): logo com fundo branco
vira um quadrado branco no topo e no fechamento (Aline, 15/10/2026). Aqui o
fundo é apagado a partir das BORDAS: só some o que encosta na borda e tem a
cor do canto. Branco DENTRO do desenho (o miolo de uma letra) fica.

🔴 Compara com a cor do CANTO, nunca com o vizinho: comparando com o vizinho o
preenchimento anda pelo degradê do contorno e come o desenho.
Logo que já tem transparência, ou fundo que não é claro, passa intacta.

Uso: python3 logo_sem_fundo.py <entrada> <saida.png>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TOL = 38      # até aqui é fundo
SUAVE = 70    # entre TOL e SUAVE a borda fica meio transparente


def tirar_fundo(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    a = np.asarray(im).astype(np.int32)
    h, w = a.shape[:2]
    cantos = [a[0, 0], a[0, w - 1], a[h - 1, 0], a[h - 1, w - 1]]
    # já transparente nos cantos: nada a fazer
    if sum(1 for c in cantos if c[3] < 20) >= 2:
        return im
    fundo = np.median(np.array([c[:3] for c in cantos]), axis=0)
    if fundo.min() < 215 or (fundo.max() - fundo.min()) > 25:
        return im  # fundo escuro ou colorido: é parte da logo, não mexe
    dist = np.sqrt(((a[:, :, :3] - fundo) ** 2).sum(axis=2))
    # .copy(): imagem criada de array numpy é só leitura e o floodfill não pinta nada
    perto = Image.fromarray(np.where(dist <= TOL, 255, 0).astype(np.uint8), "L").copy()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if perto.getpixel((x, y)) == 255:
            ImageDraw.floodfill(perto, (x, y), 128)
    m = np.asarray(perto)
    fora = m == 128
    alfa = a[:, :, 3].copy()
    alfa[fora] = 0
    # borda: até 3 px do fundo apagado, transparência proporcional à distância
    faixa = np.asarray(Image.fromarray((fora * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    borda = faixa & ~fora
    gradu = np.clip((dist - TOL) / (SUAVE - TOL), 0, 1)
    alfa[borda] = (alfa[borda] * gradu[borda]).astype(np.int32)
    a[:, :, 3] = alfa
    return Image.fromarray(a.astype(np.uint8), "RGBA")


if __name__ == "__main__":
    out = tirar_fundo(Image.open(sys.argv[1]))
    bbox = out.getchannel("A").getbbox()
    if bbox:
        out = out.crop(bbox)  # sem margem vazia: a logo ocupa a altura reservada
    out.save(sys.argv[2])
    print("logo pronta", out.size)
