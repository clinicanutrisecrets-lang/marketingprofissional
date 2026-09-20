import os
# -*- coding: utf-8 -*-
"""Troca de cor da roupa com segmentacao de verdade.

A primeira tentativa achava a roupa por COR DOMINANTE + posicao, e o resultado
foi mancha espalhada: a mediana da faixa abaixo do queixo nao era a blusa, e a
tolerancia pegou pedaco de cabelo e de fundo. Aqui quem decide o que e roupa e
um segmentador treinado para isso (fundo / cabelo / pele do corpo / pele do
rosto / ROUPA / outros), entao a mascara e da peca, nao de uma faixa de cor.
"""
import numpy as np, cv2
from PIL import Image, ImageFilter
import mediapipe as mp
from mediapipe.tasks import python as mpy
from mediapipe.tasks.python import vision

CLASSE_ROUPA = 4      # 0 fundo, 1 cabelo, 2 pele do corpo, 3 rosto, 4 roupa, 5 outros
_seg = None

def segmentador(caminho=None):
    # 🔴 CAMINHO ABSOLUTO. Relativo so funciona quando alguem roda de dentro
    # desta pasta; no worker o cwd e a raiz do repo e o modelo "some".
    if caminho is None:
        caminho = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seg_roupa.tflite")
    global _seg
    if _seg is None:
        _seg = vision.ImageSegmenter.create_from_options(
            vision.ImageSegmenterOptions(
                base_options=mpy.BaseOptions(model_asset_path=caminho),
                output_category_mask=True))
    return _seg

def mascara_roupa(im, suavizar=7):
    a = np.asarray(im.convert("RGB"))
    r = segmentador().segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=a))
    cat = r.category_mask.numpy_view()
    m = (cat == CLASSE_ROUPA).astype(np.float32)
    if m.shape != a.shape[:2]:
        m = cv2.resize(m, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LINEAR)
    return cv2.GaussianBlur(m, (0, 0), suavizar)

def alisar(im, forca=0.92, escala=0.028):
    """Tira a estampa mantendo o caimento.

    A primeira tentativa achatava so a COR e falhou: estampa tem contraste de
    BRILHO tambem, entao o desenho continuava la, apenas monocromatico. Aqui a
    separacao e por ESCALA — a dobra do tecido e a sombra do ombro variam devagar
    ao longo da peca (baixa frequencia); o padrao da estampa se repete miudo
    (alta frequencia). Mantendo so a variacao lenta, o desenho some e o caimento
    fica.

    ⚠️ O limite e honesto: estampa GRANDE (flor de 10 cm) varia tao devagar
    quanto uma dobra, e o metodo nao consegue separar as duas.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    m = mascara_roupa(im)
    # 🔴 COBERTURA MINIMA. O segmentador confunde roupao claro de decote grande
    # com PELE — mediu 0,4% de roupa num quadro em que a peca ocupa um terco da
    # tela. Com mascara errada o alisamento borra a mao e o colo, e isso e pior
    # que a estampa: vira aquela fumaca em cima do corpo. Abaixo do piso ele nao
    # roda e devolve o quadro intacto.
    if float(m.mean()) < 0.030: return im, 0.0
    dentro = m > 0.6
    if dentro.sum() < 300: return im, 0.0
    H, W = a.shape[:2]
    raio = max(3, int(min(H, W) * escala))
    # so a variacao LENTA sobrevive
    lento = np.asarray(Image.fromarray(a.astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(raio)), dtype=np.float32)
    # e a cor media vira a cor da peca, senao o borrao mistura o fundo na borda
    cor = np.median(a[dentro], axis=0)
    y = (lento * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    yc = float((cor * [0.299, 0.587, 0.114]).sum())
    liso = y * (cor / max(yc, 1))
    p = (m * forca)[..., None]
    return Image.fromarray(np.clip(a * (1 - p) + np.clip(liso, 0, 255) * p, 0, 255)
                           .astype(np.uint8)), float(m.mean())


def trocar_cor(im, cor_nova, forca=0.90, contraste=0.78, casar_brilho=True):
    """Troca a cromaticidade e mantem a luminancia — e a luminancia que carrega
    a dobra do tecido, a sombra e o brilho."""
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    m = mascara_roupa(im)
    if m.max() < 0.05: return im, 0.0
    y = (a * [0.299, 0.587, 0.114]).sum(2, keepdims=True)
    c = np.array(cor_nova, dtype=np.float32)
    yc = float((c * [0.299, 0.587, 0.114]).sum())

    if casar_brilho:
        # 🔴 So trocar a cromaticidade mantem o BRILHO da peca original — por
        # isso o branco saiu cinza e o vinho saiu pink numa blusa clara. Aqui o
        # brilho tambem e remapeado para o da cor pedida, preservando so a
        # VARIACAO (dobra, sombra, vinco), que e o que faz parecer tecido.
        dentro = m > 0.6
        if dentro.sum() > 300:
            med = float(y[..., 0][dentro].mean())
            y = yc + (y - med) * contraste

    p = (m * forca)[..., None]
    out = a * (1 - p) + np.clip(y * (c / max(yc, 1)), 0, 255) * p
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), float(m.mean())
