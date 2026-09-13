# -*- coding: utf-8 -*-
"""Troca de fundo SEM cenario verde.

O chroma key exige um fundo de cor unica e uniforme; aqui quem separa a pessoa
do resto e o mesmo segmentador da roupa (ele tem a classe 'fundo'). Duas coisas
definem se o recorte parece montagem ou nao:

1. A BORDA. Recorte duro denuncia na hora, ainda mais no cabelo. A mascara sai
   suavizada e com uma faixa de transicao — o cabelo perde um fio, mas nao
   fica com serrilhado de adesivo.
2. A LUZ TEM QUE BATER. Pessoa iluminada por janela quente colada num fundo
   frio nao cola. Por isso o fundo novo recebe um leve ajuste na direcao da
   temperatura de cor da propria pessoa.
"""
import numpy as np, cv2
from PIL import Image, ImageFilter
import roupa2 as R

def _solidificar(m, limiar=0.40):
    """Tapa os buracos do recorte e fica com UM corpo so.

    🔴 O segmentador hesita em roupa clara contra parede clara — o roupao dela
    saia com 0,3 a 0,6 de certeza no meio do peito. Misturado com o cenario,
    isso vira TRANSPARENCIA: da pra ver a estante atraves dela. Era literalmente
    o 'fantasma'. Aqui o que esta dentro do corpo vira 1 inteiro; a suavizacao
    fica so na BORDA, que e onde ela tem que existir.
    """
    b = (m > limiar).astype(np.uint8)
    k = max(3, int(min(m.shape) * 0.012)) | 1
    b = cv2.morphologyEx(b, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    # so o maior pedaco: reflexo e sombra viram blocos soltos no fundo
    n, lab, est, _ = cv2.connectedComponentsWithStats(b, 8)
    if n > 1:
        maior = 1 + int(np.argmax(est[1:, cv2.CC_STAT_AREA]))
        b = (lab == maior).astype(np.uint8)
    # tapa buraco: inunda o fundo a partir da borda, o que sobrar e buraco
    h, w = b.shape
    fora = np.zeros((h + 2, w + 2), np.uint8)
    inund = b.copy()
    cv2.floodFill(inund, fora, (0, 0), 1)
    b = np.where(inund == 0, 1, b).astype(np.uint8)
    return b.astype(np.float32)

def mascara_pessoa(im, suavizar=1.1, aperto=0.5):
    a = np.asarray(im.convert("RGB"))
    import mediapipe as mp
    res = R.segmentador().segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=a))
    cat = res.category_mask.numpy_view()
    m = (cat != 0).astype(np.float32)            # tudo que nao e fundo
    if m.shape != a.shape[:2]:
        m = cv2.resize(m, (a.shape[1], a.shape[0]), interpolation=cv2.INTER_LINEAR)
    m = _solidificar(m)
    # 🔴 CABELO. O segmentador devolve uma silhueta GROSSA: ele acerta o corpo e
    # passa longe do fio. Desfocar essa borda nao cria cabelo — cria uma faixa
    # meio transparente em volta da cabeca, que e o "cabelo fantasma". O filtro
    # guiado reencosta a mascara nas bordas REAIS da imagem, entao a mecha volta
    # a ter forma de mecha. Sem ele nao adianta mexer no desfoque.
    g = cv2.cvtColor(np.asarray(im.convert("RGB")), cv2.COLOR_RGB2BGR)
    raio = max(6, int(min(m.shape) * 0.012))
    try:
        m = cv2.ximgproc.guidedFilter(g, m.astype(np.float32), raio, 1e-3)
    except Exception:
        m = cv2.GaussianBlur(m, (0, 0), 1.5)
    m = np.clip((m - 0.45) * 3.2 + 0.5, 0, 1)     # firma o meio-termo
    m = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=1)
    return np.clip(cv2.GaussianBlur(m, (0, 0), suavizar), 0, 1)

def _branco(a, m=None, pct=92):
    """Cor da LUZ, estimada pelas superficies claras (parede, papel, reflexo).

    🔴 A versao anterior usava a media da PELE como referencia — e pele e
    vermelha por natureza (r/g ~ 1,35). Resultado: eu empurrava o cenario
    inteiro na direcao do tom de pele e o fundo saia avermelhado (medi +9% de
    vermelho no 'genes'). Pele nunca e referencia de branco; superficie clara e.
    """
    y = (a * [0.299, 0.587, 0.114]).sum(2)
    sel = y >= np.percentile(y[m > 0.6] if m is not None else y, pct)
    if m is not None: sel &= (m > 0.6)
    if sel.sum() < 200: sel = y >= np.percentile(y, pct)
    r, g, b = a[..., 0][sel].mean(), a[..., 1][sel].mean(), a[..., 2][sel].mean()
    return float(r / max(g, 1)), float(b / max(g, 1))



def _ruido(a, m):
    """Quanto 'grão' tem a imagem dela, medido na alta frequencia."""
    p = m > 0.7
    if p.sum() < 2000: return 0.0
    y = (a * [0.299, 0.587, 0.114]).sum(2)
    alta = y - cv2.GaussianBlur(y, (0, 0), 1.1)
    return float(np.std(alta[p]))

def _despill(a, m, largura=7, forca=0.9):
    """Tira a COR DO FUNDO VELHO que ficou presa na orla do recorte.

    🔴 E ISTO o "brilho em volta". Nenhum recorte cai exatamente no fio: a
    ultima fileira de pixels do cabelo e do ombro e uma MISTURA dela com o
    quarto onde ela gravou — que e claro e rosado. Colada num cenario mais
    escuro, essa mistura vira um contorno luminoso, do tamanho de um fio de
    cabelo, em volta do corpo inteiro. Escurecer a borda nao resolve (so muda
    a cor do halo); o que resolve e SUBSTITUIR a cor da orla pela cor que vem
    de DENTRO dela, empurrada pra fora.
    """
    nucleo = cv2.erode(m, np.ones((3, 3), np.uint8), iterations=largura)
    sig = max(2.0, largura * 1.6)
    num = cv2.GaussianBlur(a * nucleo[..., None], (0, 0), sig)
    den = cv2.GaussianBlur(nucleo, (0, 0), sig)[..., None] + 1e-4
    dentro = num / den
    orla = np.clip(m - nucleo, 0, 1)
    p = (orla * forca)[..., None]
    return a * (1 - p) + dentro * p

def integrar(a, f, m, grao=1.0, sombra=0.55, borda=0.55):
    """Faz a pessoa PERTENCER ao cenario. Sem isto ela fica 'colada em cima'.

    Sao tres coisas, e a primeira e a que mais pesa:

    1. GRAO. Foto de cenario ampliada e desfocada fica LISA, sem ruido nenhum.
       Atras de um video de celular, que tem grão em cada quadro, isso grita
       montagem — o olho nao sabe dizer o que e, mas ve. O fundo recebe ruido
       na MESMA intensidade medida nela.
    2. SOMBRA DE CONTATO. Pessoa real bloqueia luz: o cenario escurece um pouco
       logo atras do contorno. Sem essa sombra ela flutua.
    3. BORDA. Recorte perfeito nao existe em lente nenhuma. A orla do corpo
       perde um tico de luz e de nitidez, que e o que a lente faria.
    """
    H, W = a.shape[:2]
    a = _despill(a, m)
    if sombra > 0:
        halo = np.clip(cv2.GaussianBlur(m, (0, 0), max(6.0, W * 0.030)) - m, 0, 1)
        f = f * (1 - (halo * sombra * 0.55)[..., None])
    if grao > 0:
        s = _ruido(a, m) * grao
        if s > 0.4:
            r = np.random.default_rng(7).normal(0, s, (H, W, 1)).astype(np.float32)
            f = f + r * np.array([1.0, 0.95, 1.05], dtype=np.float32)
    if borda > 0:
        orla = np.clip(m - cv2.erode(m, np.ones((5, 5), np.uint8), iterations=2), 0, 1)
        orla = cv2.GaussianBlur(orla, (0, 0), 1.8)
        a = a * (1 - (orla * borda * 0.16)[..., None])
    return np.clip(a, 0, 255), np.clip(f, 0, 255)

def trocar(im, fundo, casar_luz=0.0, desfoque_fundo=0):
    """fundo: PIL.Image (sera enquadrado) ou (r,g,b) para cor chapada.

    🔴 casar_luz NASCE DESLIGADO (Aline 12/09). A ideia de aproximar a luz do
    cenario da luz dela parece boa e na pratica CLAREIA o cenario — e fundo
    claro demais atras de uma pessoa de brilho normal e justamente o que
    denuncia a montagem ("da pra ver que o fundo e falso, eu to um fantasma
    ali"). Cenario entra com a luz que tem. Ligar so por pedido explicito.
    """
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    H, W = a.shape[:2]
    m = mascara_pessoa(im)

    if isinstance(fundo, tuple):
        f = np.zeros_like(a); f[:] = np.array(fundo, dtype=np.float32)
    else:
        g = fundo.convert("RGB")
        e = max(W / g.width, H / g.height)
        g = g.resize((int(g.width * e) + 1, int(g.height * e) + 1), Image.LANCZOS)
        x, y = (g.width - W) // 2, (g.height - H) // 2
        f = np.asarray(g.crop((x, y, x + W, y + H)), dtype=np.float32)
    if desfoque_fundo:
        f = np.asarray(Image.fromarray(f.astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(desfoque_fundo)), dtype=np.float32)

    if casar_luz > 0:
        # casa a LUZ do cenario com a luz que bate nela: a razao entre os dois
        # brancos, nunca a cor absoluta de um dos lados.
        rp, bp = _branco(a, m)          # branco na pessoa (reflexo, roupa clara)
        rf, bf = _branco(f)             # branco no cenario
        gr = 1 + (rp / max(rf, 1e-3) - 1) * casar_luz
        gb = 1 + (bp / max(bf, 1e-3) - 1) * casar_luz
        # trava: correcao de branco passa de 8% vira dominante de cor visivel
        gr, gb = float(np.clip(gr, 0.92, 1.08)), float(np.clip(gb, 0.92, 1.08))
        f = f * np.array([gr, 1.0, gb], dtype=np.float32)
        f = np.clip(f, 0, 255)

    a, f = integrar(a, f, m)
    p = m[..., None]
    return Image.fromarray(np.clip(a * p + f * (1 - p), 0, 255).astype(np.uint8)), float(m.mean())
