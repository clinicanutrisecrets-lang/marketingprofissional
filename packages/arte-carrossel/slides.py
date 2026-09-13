# -*- coding: utf-8 -*-
"""Renderiza os slides do carrossel em 1080x1080, na paleta oficial.

Tudo em HTML+Chromium porque o texto precisa quebrar bem e a tipografia da marca
(Montserrat + Lora) e o que da a cara. PIL faria caber, mas ficaria sem kerning
e sem quebra decente.
"""
import json, pathlib, html, re
from playwright.sync_api import sync_playwright

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
TIFF, TEAL, CREME = "#0ABAB5", "#0E5959", "#F5E6D3"

# 🔴 O DESTAQUE E VINHO, NAO ROSA (Aline, 13/09: "ainda ta vindo com o rosa que
# a gente ja conversou"). E a MESMA correcao do batom em 12/09 — o magenta
# #D6336C da paleta le como "rosao" nos olhos dela. Trocar so a cor nao basta:
# o que separa vinho de rosa e a LUMINANCIA, entao o valor novo tem que ser
# mais escuro, nao so mais vermelho.
MAG = "#9E2A4A"

LOGO = ('<svg class="logo" viewBox="0 0 100 100" fill="none">'
        '<path d="M50 8C50 8 20 34 20 58a30 30 0 1 0 60 0C80 34 50 8 50 8Z" fill="{c}"/>'
        '<path d="M50 30v46M50 52c0-8 7-14 15-16M50 62c0-7-6-12-13-14" stroke="{s}" '
        'stroke-width="5" stroke-linecap="round"/></svg>')

CSS = """
@font-face{font-family:Anton;font-style:normal;font-weight:400;
  src:url(data:font/ttf;base64,__ANTON__) format("truetype")}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1080px;overflow:hidden;font-family:Lora,Georgia,serif}
.s{width:1080px;height:1080px;padding:88px 80px;display:flex;flex-direction:column;
   justify-content:center;position:relative}
.logo{position:absolute;top:48px;right:52px;width:80px;height:80px}
.eyebrow{font-family:Montserrat,sans-serif;font-weight:700;font-size:27px;
   letter-spacing:.18em;text-transform:uppercase;margin-bottom:26px}
h1{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:132px;line-height:1.14;
   letter-spacing:.005em;text-transform:uppercase;text-wrap:balance}
/* 🔴 ENTRELINHA 1.14, NAO 0.98. Em portugues a caixa alta carrega acento
   (VOCE, NAO, GENETICA) e o circunflexo sobe ACIMA da altura das maiusculas —
   com o 0.98 que o ingles aguenta, o acento de uma linha bate na letra de cima. */
/* 🔴 Anton JA e o peso — nunca pedir bold nele: o desenho nao muda e o Chromium
   simula engordando o traco, o que borra a contra-forma em corpo grande. */
h1.longo{font-size:104px}
h1.curto{font-size:158px}
h2{font-family:Montserrat,sans-serif;font-weight:800;font-size:62px;line-height:1.12;
   margin-bottom:28px;text-wrap:balance}
p{font-size:43px;line-height:1.42;margin-bottom:24px}
p:last-child{margin-bottom:0}
.sub{font-family:Montserrat,sans-serif;font-weight:600;font-size:46px;line-height:1.3;
   margin-top:34px}
small{display:block;font-family:Montserrat,sans-serif;font-weight:500;font-size:24px;
   line-height:1.4;margin-top:30px;opacity:.72}
b{font-weight:700}
.cta{text-align:center}
.cta .logo{position:static;width:190px;height:190px;margin:0 auto 40px}
.cta p{font-family:Montserrat,sans-serif;font-weight:600;font-size:46px;line-height:1.42}
.soco{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:176px;
   line-height:1.1;letter-spacing:.005em;text-transform:uppercase;margin-bottom:30px}
.gancho{font-family:Montserrat,sans-serif;font-weight:700;font-size:52px;line-height:1.24;
   text-wrap:balance}
.arroba{font-family:Montserrat,sans-serif;font-weight:800;font-size:44px;margin-top:38px}
"""

def _css():
    """CSS com o Anton EMBUTIDO.

    🔴 Embutido, nunca por URL: o Chromium renderiza `set_content` sem base URL,
    entao caminho relativo vira fonte faltando — e o fallback silencioso e que o
    titulo sai em Impact/sans no PNG, e so se descobre olhando a arte pronta.
    """
    import base64
    ttf = pathlib.Path(__file__).resolve().parent.parent / "fontes" / "Anton.ttf"
    return CSS.replace("__ANTON__", base64.b64encode(ttf.read_bytes()).decode())


def _fundo(kind):
    if kind == "capa":   return CREME, TEAL, MAG
    if kind == "cta":    return TIFF, CREME, CREME
    if kind == "tiff":   return "#EAF8F7", TEAL, MAG
    return "#FFFFFF", "#14202a", MAG

def render(carrosseis, destino="arte"):
    d = pathlib.Path(destino); d.mkdir(exist_ok=True)
    feitos = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport={"width": 1080, "height": 1080}, device_scale_factor=1)
        for c in carrosseis:
            for i, sl in enumerate(c["slides"], 1):
                bg, fg, ac = _fundo(sl.get("fundo", "branco"))
                logo = LOGO.format(c=ac if sl.get("fundo") != "cta" else CREME,
                                   s=bg if sl.get("fundo") == "cta" else "#ffffff")
                corpo = "".join(f"<p>{x}</p>" for x in sl.get("corpo", []))
                eb = (f'<div class="eyebrow" style="color:{ac}">{html.escape(sl["eyebrow"])}</div>'
                      if sl.get("eyebrow") else "")
                tit = sl.get("titulo", "")
                tag = "h1" if sl.get("fundo") == "capa" else "h2"
                # 🔴 A PROPORCAO E A MESMA, O CORPO E QUE MUDA. Titulo curto sai
                # gigante, longo encolhe — os dois ocupam a mesma fatia da capa.
                cls = ""
                if tag == "h1":
                    n = len(re.sub(r"<[^>]+>", "", tit))
                    cls = ' class="curto"' if n <= 26 else (' class="longo"' if n > 46 else "")
                titulo = f'<{tag}{cls} style="color:{fg}">{tit}</{tag}>' if tit else ""
                if sl.get("soco"):
                    titulo = (f'<div class="soco" style="color:{fg}">{sl["soco"]}</div>'
                              f'<div class="gancho" style="color:{ac}">{tit}</div>')
                sub = f'<div class="sub" style="color:{ac}">{sl["sub"]}</div>' if sl.get("sub") else ""
                fonte = f"<small>{sl['fonte']}</small>" if sl.get("fonte") else ""
                arroba = f'<div class="arroba">{sl["arroba"]}</div>' if sl.get("arroba") else ""
                klass = "s cta" if sl.get("fundo") == "cta" else "s"
                pagina = (
                    '<!doctype html><meta charset="utf-8">'
                    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
                    'family=Montserrat:wght@500;600;700;800&family=Lora:wght@400;600&display=swap">'
                    f"<style>{_css()}</style>"
                    f'<div class="{klass}" style="background:{bg};color:{fg}">'
                    f"{logo}{eb}{titulo}{corpo}{sub}{fonte}{arroba}</div>")
                arq = d / f"{c['slug']}-{i:02d}.png"
                pg.set_content(pagina)
                pg.wait_for_timeout(700)
                pg.screenshot(path=str(arq))
                feitos.append(str(arq))
        b.close()
    return feitos
