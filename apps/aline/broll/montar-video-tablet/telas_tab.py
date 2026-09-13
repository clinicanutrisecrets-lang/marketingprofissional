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
    "alelos-wide":          540,
    "gene-risco-wide":      580,
    "prato-nutrigenomico":  640,
    "trilha-wide":          540,
    "scanner-genetica-wide": 820,
    "ritmo-circadiano":     1176,
}

d = pathlib.Path("/home/user/marketingprofissional/apps/aline/broll/telas")
saida = pathlib.Path(__file__).parent
meta = {}

with sync_playwright() as p:
    b = p.chromium.launch(
        executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
        args=["--no-sandbox"])
    for nome, larg in TELAS.items():
        janela = round(larg * RAZAO)
        pg = b.new_page(viewport={"width": larg, "height": janela},
                        device_scale_factor=DSF)
        pg.goto((d / (nome + ".html")).as_uri())
        # sem min-height: quem for mais curto que a tela e centralizado
        # depois, na pre-escala, com o proprio fundo da pagina
        pg.add_style_tag(content=f"body{{width:{larg}px !important}}")
        pg.wait_for_timeout(300)
        alt = pg.evaluate("document.body.scrollHeight")
        pg.set_viewport_size({"width": larg, "height": alt})
        pg.wait_for_timeout(200)
        arq = saida / f"tab-{nome}.png"
        pg.screenshot(path=str(arq), full_page=True)
        pg.close()
        meta[nome] = {"arquivo": arq.name, "larg_css": larg, "alt_css": alt,
                      "janela_css": janela, "larg_px": larg*DSF,
                      "alt_px": alt*DSF, "janela_px": janela*DSF,
                      "rolagem_px": max(0, alt*DSF - janela*DSF)}
        print(f"{nome:24s} {larg}x{alt}  janela {janela}  rolagem {meta[nome]['rolagem_px']}px")
    b.close()

json.dump(meta, open(saida/"telas-tab.json","w"), indent=2, ensure_ascii=False)
