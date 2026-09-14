# Renderiza as telas da area do paciente no formato da tela do tablet.
#
# A tela do tablet e 794x1200 em 1080x1920, proporcao 0.6613, ou seja
# retrato. As telas em telas/ foram feitas deitadas, com body de 1150px.
# Em vez de refazer cada uma, elas sao renderizadas mais estreitas: o
# layout reflui, a pagina cresce em altura e a letra fica maior em
# relacao a tela, sem mexer em nenhum font-size.
#
# Cada tela tem a sua largura, escolhida pra altura cair perto de
# largura * 1.5122. Quem passa disso rola dentro da tela; quem fica
# abaixo e completado pelo proprio fundo da pagina via min-height.

import pathlib, json
from playwright.sync_api import sync_playwright

RAZAO = 1.5122          # altura / largura da tela do tablet
DSF = 2                 # dois pixels de imagem por pixel de CSS

TELAS = {
    "plano-alimentar-wide": 760,
    "scanner-exames-wide":  760,
    "questionario-wide":    700,
    "suplementacao-wide":   720,
    "prato-nutrigenomico":  560,   # deitada de verdade: ver nota abaixo
    "trilha-wide":          440,   # idem
    "scanner-genetica-wide": 820,
    "ritmo-circadiano":     1176,
    "correlacao-wide":       760,
}

# Duas telas sao deitadas por natureza e nunca vao encher uma tela
# retrato: o prato e a trilha. Nelas a largura escolhida e bem menor que
# nas outras, e o motivo e o contrario do que parece — quanto mais
# estreito o render, mais a pagina cresce ao ser esticada pros 794px da
# tela, e maior fica a letra. O que sobra e completado em cima e embaixo
# com o proprio fundo da pagina, em preescalar.py.
#
# alelos-wide e gene-risco-wide nao estao aqui: elas tem largura minima
# de conteudo (902 e 1020px) e nao refluem. Sozinhas sobraria 40% de
# vazio, entao viram uma pagina so, empilhada, gerada por
# empilhar_genetica() abaixo — e o video rola de uma pra outra, que e a
# ordem em que a legenda fala das duas.
GENETICA = [("alelos-wide", 902), ("gene-risco-wide", 1020)]

d = pathlib.Path("/home/user/marketingprofissional/apps/aline/broll/telas")
saida = pathlib.Path(__file__).parent


def tirar(b, nome, larg):
    """Um PNG da pagina inteira, renderizada na largura pedida.

    set_viewport_size numa pagina alta as vezes trava o chromium, entao a
    altura vem de scrollHeight e o recorte e feito no screenshot."""
    pg = b.new_page(viewport={"width": larg, "height": 400},
                    device_scale_factor=DSF)
    pg.goto((d / (nome + ".html")).as_uri())
    pg.add_style_tag(content=f"body{{width:{larg}px !important}}")
    pg.wait_for_timeout(400)
    alt = pg.evaluate("document.body.scrollHeight")
    arq = saida / f"tab-{nome}.png"
    pg.screenshot(path=str(arq), full_page=True,
                  clip={"x": 0, "y": 0, "width": larg, "height": alt})
    pg.close()
    print(f"{nome:24s} {larg}x{alt}")
    return arq


def empilhar_genetica(b):
    """As duas telas da genetica viram uma pagina so, uma embaixo da outra."""
    import cv2, numpy as np
    partes = []
    for nome, larg in GENETICA:
        arq = tirar(b, nome, larg)
        im = cv2.imread(str(arq)); h, w = im.shape[:2]
        partes.append(cv2.resize(im, (794, round(h*794/w)),
                                 interpolation=cv2.INTER_AREA))
        arq.unlink()
    vao = np.full((34, 794, 3), partes[0][2, 2].tolist(), np.uint8)
    junto = np.vstack([partes[0], vao, partes[1]])
    cv2.imwrite(str(saida/"tab-genetica-tablet.png"), junto)
    print(f"{'genetica-tablet':24s} 794x{junto.shape[0]}  (empilhada)")


if __name__ == "__main__":
    with sync_playwright() as p:
        b = p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
            args=["--no-sandbox"])
        for nome, larg in TELAS.items():
            tirar(b, nome, larg)
        empilhar_genetica(b)
        b.close()
