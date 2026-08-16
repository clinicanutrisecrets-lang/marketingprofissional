#!/usr/bin/env python3
"""Escolhe a altura da legenda olhando o que tem dentro do quadro.

Duas regras, nessa ordem:

1. **Nunca em cima do rosto.** Rosto detectado de verdade (YuNet), não
   por altura fixa nem por ciclo cego de posições — altura fixa cedo ou
   tarde cai na cara de alguém, e alternar cima/meio/baixo erra igual,
   porque não sabe onde a pessoa está.
2. **Se sobra espaço no meio do quadro, a legenda vai pro meio.** Num
   plano em que ela aparece em cima e o prato embaixo, o rodapé é o pior
   lugar possível: a legenda cai na comida. O vão entre os dois é o
   lugar certo, e ele é achado medindo energia de borda por faixa
   horizontal — parede, bancada e mesa são lisas, rosto e comida não.

O caller ainda pode passar `bloqueios`: as faixas que manchete, selo e
painel já ocupam naquele instante. Legenda por cima de manchete seria
outro jeito de tapar informação.
"""

import cv2
import numpy as np

MODELO = "/usr/local/share/yunet/yunet.onnx"
_det = None

FAIXAS = 90          # resolução do perfil vertical de ocupação
ALVO = 0.55          # altura preferida do centro do texto (fração)
PESO_POS = 0.5       # quanto o "prefira o meio" pesa contra a energia
HISTERESE = 0.07     # o quanto a altura anterior pode ser pior e mesmo
                     # assim ser mantida, pra legenda não ficar pulando


def _detector(larg, alt):
    global _det
    if _det is None:
        _det = cv2.FaceDetectorYN.create(MODELO, "", (larg, alt), 0.55, 0.3, 5000)
    _det.setInputSize((larg, alt))
    return _det


def _perfil(frame):
    """Energia de borda por faixa horizontal do quadro.

    Reduzido pra 160 colunas antes do Sobel: o que interessa é onde tem
    coisa acontecendo, não o detalhe.
    """
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, (160, FAIXAS), interpolation=cv2.INTER_AREA)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    return (np.abs(gx) + np.abs(gy)).mean(axis=1)


def rosto_em(video, instantes):
    """(topo, base) do rosto mais baixo achado, em fração da altura."""
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
            _, y, _, h = f[:4]
            achou = True
            topo = min(topo, y / alt)
            base = max(base, (y + h) / alt)
    cap.release()
    return (topo, base) if achou else None


def _colide(t0, t1, proibidas):
    return any(t1 > p0 and t0 < p1 for p0, p1 in proibidas)


def _escolhe(perfil, rostos, altura, alt_texto, rodape_min, bloqueios,
             anterior=None):
    """Melhor margem inferior (medida do pé do quadro) pra esse trecho.

    `rostos` e `bloqueios` são faixas (y0, y1) em pixel de saída onde o
    texto não pode entrar de jeito nenhum. Entre o que sobra, ganha a
    faixa mais vazia, com um empurrão pro meio do quadro.
    """
    pico = float(perfil.max()) if perfil is not None and len(perfil) else 0.0
    p = (perfil / pico) if pico else np.zeros(FAIXAS)

    folga = round(altura * 0.035)
    proibidas = [(a - folga, b + folga) for a, b in rostos] + list(bloqueios)

    passo = max(2, round(altura / FAIXAS))
    base_min = round(altura * 0.10) + alt_texto
    base_max = altura - rodape_min

    def avalia(base):
        topo = base - alt_texto
        if topo < 0 or base > altura or _colide(topo, base, proibidas):
            return None
        i0 = max(0, int(topo / altura * FAIXAS))
        i1 = min(FAIXAS, int(np.ceil(base / altura * FAIXAS)))
        if i1 <= i0:
            return None
        energia = float(p[i0:i1].mean())
        centro = (topo + base) / 2 / altura
        return energia + PESO_POS * abs(centro - ALVO)

    melhor, nota = None, None
    for base in range(int(base_min), int(base_max) + 1, passo):
        s = avalia(base)
        if s is not None and (nota is None or s < nota):
            melhor, nota = base, s

    if melhor is None:
        # rosto ocupando tudo: cai no rodapé padrão, que é o menos pior
        return rodape_min

    if anterior is not None:
        # legenda que muda de altura a cada frase cansa mais do que
        # resolve; só sai do lugar quando o lugar antigo piora de verdade
        s = avalia(altura - anterior)
        if s is not None and s <= nota + HISTERESE:
            return anterior
    return int(altura - melhor)


def margens_por_bloco(video, janelas, altura_saida, alt_texto, rodape_min,
                      amostras=4, bloqueios=None):
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
    bloqueios = bloqueios or [[] for _ in janelas]

    saida, anterior = [], None
    for (ini, fim), bloq in zip(janelas, bloqueios):
        rostos, perfil = [], np.zeros(FAIXAS)
        fim_util = min(max(ini + 0.1, fim), max(total - 0.1, 0.1))
        for t in np.linspace(max(0, ini), fim_util, amostras):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
            ok, frame = cap.read()
            if not ok:
                continue
            # o pior quadro do trecho manda: livre num frame e coberta no
            # seguinte é o mesmo que coberta
            perfil = np.maximum(perfil, _perfil(frame))
            _, faces = det.detect(frame)
            if faces is None:
                continue
            for f in faces:
                _, y, _, h = f[:4]
                rostos.append((y / alt * altura_saida,
                               (y + h) / alt * altura_saida))
        m = _escolhe(perfil, rostos, altura_saida, alt_texto, rodape_min,
                     bloq, anterior)
        anterior = m
        saida.append(m)
    cap.release()
    return saida
