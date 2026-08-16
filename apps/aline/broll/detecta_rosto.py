#!/usr/bin/env python3
"""Acha a faixa livre de rosto em cada trecho do vídeo.

Legenda em altura fixa cedo ou tarde cai em cima da cara de alguém, e um
ciclo cego de alturas (cima, meio, baixo) erra do mesmo jeito: ele não
sabe onde a pessoa está. Aqui o rosto é detectado de fato, e a legenda vai
pro maior vão livre abaixo dele.
"""

import cv2
import numpy as np

MODELO = "/usr/local/share/yunet/yunet.onnx"
_det = None


def _detector(larg, alt):
    global _det
    if _det is None:
        _det = cv2.FaceDetectorYN.create(MODELO, "", (larg, alt), 0.55, 0.3, 5000)
    _det.setInputSize((larg, alt))
    return _det


def rosto_em(video, instantes):
    """Devolve (topo, base) do rosto mais baixo achado, em fração da altura.

    Amostra vários instantes porque a pessoa se move: o que importa é o
    ponto mais baixo que o queixo alcança em todo o trecho, senão a
    legenda fica livre num frame e coberta no seguinte.
    """
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        return None
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    alt = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    larg = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    det = _detector(larg, alt)

    topo, base = 1.0, 0.0
    achou = False
    for t in instantes:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
        ok, frame = cap.read()
        if not ok:
            continue
        _, faces = det.detect(frame)
        if faces is None:
            continue
        for f in faces:
            x, y, w, h = f[:4]
            achou = True
            topo = min(topo, y / alt)
            base = max(base, (y + h) / alt)
    cap.release()
    return (topo, base) if achou else None


def margem_legenda(video, ini, fim, altura_saida, alt_texto, rodape_min):
    """Margem inferior (padrão do ASS) que põe a legenda longe do rosto.

    Devolve a distância do pé do quadro até a base do texto. O ASS mede a
    margem por baixo, então quanto maior o número, mais alto o texto.
    """
    amostras = list(np.linspace(ini, max(ini + 0.1, fim), 5))
    r = rosto_em(video, amostras)
    if r is None:
        return rodape_min                      # sem rosto: rodapé normal
    _, base = r
    # o texto entra logo abaixo do queixo, com uma folga
    folga = 0.045
    limite_alto = altura_saida * (1 - base - folga) - alt_texto
    return int(max(rodape_min, min(limite_alto, altura_saida * 0.55)))


def margens_por_bloco(video, janelas, altura_saida, alt_texto, rodape_min,
                      amostras=4):
    """Uma margem por janela (ini, fim), numa única passada pelo vídeo.

    Abrir o arquivo a cada legenda seria lento num vídeo de dois minutos
    com cem blocos; aqui o vídeo é lido uma vez só.
    """
    cap = cv2.VideoCapture(str(video))
    if not cap.isOpened():
        return [rodape_min] * len(janelas)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    alt = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    larg = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    total = cap.get(cv2.CAP_PROP_FRAME_COUNT) / max(fps, 1)
    det = _detector(larg, alt)

    saida = []
    for ini, fim in janelas:
        base = 0.0
        achou = False
        for t in np.linspace(max(0, ini), min(max(ini + 0.1, fim), max(total - 0.1, 0.1)),
                             amostras):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, frame = cap.read()
            if not ok:
                continue
            _, faces = det.detect(frame)
            if faces is None:
                continue
            for f in faces:
                y, h = f[1], f[3]
                achou = True
                base = max(base, (y + h) / alt)
        if not achou:
            saida.append(rodape_min)
            continue
        folga = 0.045
        limite = altura_saida * (1 - base - folga) - alt_texto
        saida.append(int(max(rodape_min, min(limite, altura_saida * 0.55))))
    cap.release()
    return saida
