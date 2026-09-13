# Pre-escala cada tela pra largura da tela do tablet (794px).
#
# Com o PNG ja na largura certa, o unico calculo por quadro na hora de
# compor e o recorte da rolagem. Fazer crop e depois scale dentro do
# ffmpeg significa reescalar uma imagem grande 1400 vezes, e o render vai
# de um minuto pra meia hora.
#
# Pagina mais curta que a tela e centralizada na vertical, com o proprio
# fundo dela preenchendo em cima e embaixo. Encostada no topo ficava com
# um vazio grande embaixo, que lia como pagina mal feita.

import json, sys, pathlib
import cv2, numpy as np

AQUI = pathlib.Path(__file__).parent
LARG, ALT = 794, 1200


def pre(nome, origem, destino):
    im = cv2.imread(str(origem))
    h, w = im.shape[:2]
    nh = round(h * LARG / w)
    im = cv2.resize(im, (LARG, nh), interpolation=cv2.INTER_AREA)
    if nh < ALT:
        fundo = im[2, 2].tolist()          # a cor de fundo da propria pagina
        sobra = ALT - nh
        cima = np.full((sobra//2, LARG, 3), fundo, np.uint8)
        baixo = np.full((sobra - sobra//2, LARG, 3), fundo, np.uint8)
        im = np.vstack([cima, im, baixo]); nh = ALT
    cv2.imwrite(str(destino), im)
    return {"arquivo": destino.name, "larg": LARG, "alt": nh, "rolagem": nh - ALT}


if __name__ == "__main__":
    novo = {}
    for f in sorted(AQUI.glob("tab-*.png")):
        nome = f.name[4:-4]
        novo[nome] = pre(nome, f, AQUI/f"pre-{nome}.png")
        print(f"{nome:24s} {LARG}x{novo[nome]['alt']}  rolagem {novo[nome]['rolagem']}")
    json.dump(novo, open(AQUI/"telas-pre.json","w"), indent=2, ensure_ascii=False)
