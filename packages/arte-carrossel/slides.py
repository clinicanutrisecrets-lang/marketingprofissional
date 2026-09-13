# -*- coding: utf-8 -*-
"""Renderiza os slides do carrossel em 1080x1080, na paleta oficial.

Tudo em HTML+Chromium porque o texto precisa quebrar bem e a tipografia da marca
(Montserrat + Lora) e o que da a cara. PIL faria caber, mas ficaria sem kerning
e sem quebra decente.
"""
import json, pathlib, html, re
from playwright.sync_api import sync_playwright

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
TIFF, TEAL, CREME = "#0AA8A8", "#0A7A78", "#F5E6D3"

# 🔴 O DESTAQUE E ROXO. NAO e rosa e NAO e vinho (Aline, 13/09: "lembra que a
# gente tinha falado que e roxo e nao e rosa?"). O magenta #D6336C da paleta
# antiga le como "rosao" pra ela, e o vinho que eu tentei antes nao era o que
# ela pediu — o roxo e a cor de marca do Scanner da Saude.
ROXO = "#7B5EA7"
MAG = ROXO  # nome antigo mantido so pra nao quebrar quem importa

# 🔴 O VERDE E O DA LOGO DELA, e ele e CLARO. O #0E5959 que estava aqui e o
# dark teal de apoio, nao o "verdezinho" da marca: amostrado do PNG da logo,
# o tom dominante e #00A8A8. Titulo em verde escuro le como cinza-petroleo e
# ela nao reconhece como sendo dela.
VERDE = "#0AA8A8"
VERDE_TEXTO = "#0A7A78"   # so onde o corpo pequeno precisa de contraste

# 🔴 CADA PERFIL TEM A SUA MARCA. Dois destes carrosseis sao do
# @scannerdasaude e um e do @nutri_secrets — carimbar a mesma logo nos tres
# assina o post no nome do perfil errado.
MARCAS = {
    "@nutri_secrets":   {"escura": "logo-ns-simbolo.png",  "clara": "logo-ns-simbolo-claro.png"},
    "@scannerdasaude":  {"escura": "marca-scanner.png",    "clara": "marca-scanner-clara.png"},
}
PERFIL_PADRAO = "@nutri_secrets"
_CACHE_LOGO = {}


def _logo(perfil: str, variante: str) -> str:
    """A logo REAL da Nutri Secrets, em base64.

    🔴 Era um SVG que eu desenhei de cabeca (uma gota com uma folha dentro) e
    ela reparou na hora: "voce botou essa gota ai com uma folha, nao sei o que
    e". Marca nao se aproxima — ou e o arquivo dela, ou nao e a marca.

    A variante 'clara' existe porque o simbolo e TEAL: no slide de CTA, que tem
    fundo teal, a logo escura simplesmente some.
    """
    chave = (perfil, variante)
    if chave not in _CACHE_LOGO:
        import base64
        nome = MARCAS.get(perfil, MARCAS[PERFIL_PADRAO])[variante]
        arq = pathlib.Path(__file__).resolve().parent.parent / "fontes" / nome
        _CACHE_LOGO[chave] = base64.b64encode(arq.read_bytes()).decode()
    return _CACHE_LOGO[chave]

CSS = """
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1080px;overflow:hidden;font-family:Lora,Georgia,serif}
.s{width:1080px;height:1080px;padding:88px 80px;display:flex;flex-direction:column;
   justify-content:center;position:relative}
.logo{position:absolute;top:46px;right:52px;height:96px;width:auto}
.cta .logo{position:static;height:230px;width:auto;margin:0 auto 40px;display:block}
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
/* 🔴 A FRASE DE FECHO GANHA UM RETANGULO (Aline, 13/09: "da pra ter aquele
   retangulo atras? so pra dar uma diferenciada da outra parte do texto").
   E `inline-block` de proposito: a caixa acompanha a frase, nao a coluna
   inteira — faixa da largura do slide leria como tarja, e tarja ela ja
   recusou na legenda do video. */
.sub{display:inline-block;align-self:flex-start;
   font-family:Montserrat,sans-serif;font-weight:700;font-size:44px;line-height:1.26;
   margin-top:34px;padding:18px 26px;border-radius:14px;
   background:var(--destaque);color:var(--sobre-destaque)}
small{display:block;font-family:Montserrat,sans-serif;font-weight:500;font-size:24px;
   line-height:1.4;margin-top:30px;opacity:.72}
b{font-weight:700}
.cta{text-align:center}
.cta p{font-family:Montserrat,sans-serif;font-weight:600;font-size:46px;line-height:1.42}
.soco{font-family:Anton,Impact,sans-serif;font-weight:400;font-size:176px;
   line-height:1.1;letter-spacing:.005em;text-transform:uppercase;margin-bottom:30px}
.gancho{font-family:Montserrat,sans-serif;font-weight:700;font-size:52px;line-height:1.24;
   text-wrap:balance}
.arroba{font-family:Montserrat,sans-serif;font-weight:800;font-size:44px;margin-top:38px}
"""

FACES = [
    ("Anton", 400, "normal", "Anton.ttf"),
    ("Montserrat", 500, "normal", "Montserrat-500.ttf"),
    ("Montserrat", 600, "normal", "Montserrat-600.ttf"),
    ("Montserrat", 700, "normal", "Montserrat-700.ttf"),
    ("Montserrat", 800, "normal", "Montserrat-800.ttf"),
    ("Lora", 400, "normal", "Lora-400.ttf"),
    ("Lora", 600, "normal", "Lora-600.ttf"),
]

_CACHE_FACES = None


def _faces() -> str:
    """Todas as fontes EMBUTIDAS em base64. Zero rede durante o render.

    🔴 Embutido, nunca por URL. Dois motivos, os dois ja custaram tempo:
    (a) o Chromium renderiza `set_content` sem base URL, entao caminho relativo
        vira fonte faltando — e o fallback e SILENCIOSO: o titulo sai em
        Impact/sans no PNG e so se descobre olhando a arte pronta;
    (b) com <link> pro Google Fonts o render passa a depender da rede. Numa
        sessao com a saida bloqueada, cada slide ficava parado esperando
        fonts.googleapis.com e os 22 slides nao terminavam.
    """
    global _CACHE_FACES
    if _CACHE_FACES is None:
        import base64
        dir_ = pathlib.Path(__file__).resolve().parent.parent / "fontes"
        partes = []
        for fam, peso, estilo, arq in FACES:
            b64 = base64.b64encode((dir_ / arq).read_bytes()).decode()
            partes.append(
                f"@font-face{{font-family:{fam};font-weight:{peso};font-style:{estilo};"
                f'src:url(data:font/ttf;base64,{b64}) format("truetype")}}')
        _CACHE_FACES = "\n".join(partes)
    return _CACHE_FACES


def _css():
    return _faces() + CSS


# 🔴 O TITULO ENCOLHE ATE CABER — a mesma regra da legenda do video: a
# proporcao e fixa, o CORPO e que sai do texto. Sem isso o slide tem altura
# fixa (1080) com `overflow:hidden` e `justify-content:center`, entao titulo
# comprido vaza PELOS DOIS LADOS: some a sobrancelha em cima e o CTA embaixo,
# sem erro nenhum — o PNG simplesmente sai cortado.
AJUSTAR = """() => {
  const s = document.querySelector('.s');
  if (!s) return;
  const alvo = s.querySelector('.soco') || s.querySelector('h1') || s.querySelector('h2');
  if (!alvo) return;
  const antes = s.style.justifyContent;
  s.style.justifyContent = 'flex-start';   // pra altura do conteudo ser medivel
  let px = parseFloat(getComputedStyle(alvo).fontSize);
  const piso = 54;
  while (s.scrollHeight > s.clientHeight && px > piso) {
    px -= 4;
    alvo.style.fontSize = px + 'px';
  }
  // se mesmo no piso nao coube, o corpo do texto e que cede
  if (s.scrollHeight > s.clientHeight) {
    for (const el of s.querySelectorAll('p, .gancho, .sub')) {
      const q = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.max(28, q * 0.86) + 'px';
    }
  }
  s.style.justifyContent = antes;
}"""


def _fundo(kind):
    """fundo, cor do titulo, cor do destaque."""
    if kind == "capa":   return CREME, VERDE, ROXO
    if kind == "cta":    return VERDE, CREME, CREME
    if kind == "tiff":   return "#EAF8F7", VERDE_TEXTO, ROXO
    return "#FFFFFF", VERDE_TEXTO, ROXO

def render(carrosseis, destino="arte"):
    d = pathlib.Path(destino); d.mkdir(exist_ok=True)
    feitos = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport={"width": 1080, "height": 1080}, device_scale_factor=1)
        for c in carrosseis:
            perfil = c.get("perfil") or next(
                (x.get("arroba") for x in c["slides"] if x.get("arroba")), PERFIL_PADRAO)
            for i, sl in enumerate(c["slides"], 1):
                bg, fg, ac = _fundo(sl.get("fundo", "branco"))
                cta = sl.get("fundo") == "cta"
                logo = (f'<img class="logo{" grande" if cta else ""}" '
                        f'src="data:image/png;base64,{_logo(perfil, "clara" if cta else "escura")}" alt="">')
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
                # 🔴 SEM cor inline aqui: o estilo do elemento vence a regra da
                # folha, e pintar o texto com a cor do DESTAQUE (que virou o
                # fundo do retangulo) deixa roxo sobre roxo — retangulo vazio.
                sub = f'<div class="sub">{sl["sub"]}</div>' if sl.get("sub") else ""
                fonte = f"<small>{sl['fonte']}</small>" if sl.get("fonte") else ""
                arroba = f'<div class="arroba">{sl["arroba"]}</div>' if sl.get("arroba") else ""
                klass = "s cta" if sl.get("fundo") == "cta" else "s"
                pagina = (
                    '<!doctype html><meta charset="utf-8">'
                    f"<style>{_css()}</style>"
                    f'<div class="{klass}" style="background:{bg};color:{fg};'
                    f'--destaque:{ac};--sobre-destaque:{CREME if not cta else VERDE}">'
                    f"{logo}{eb}{titulo}{corpo}{sub}{fonte}{arroba}</div>")
                arq = d / f"{c['slug']}-{i:02d}.png"
                pg.set_content(pagina)
                pg.wait_for_timeout(250)
                pg.evaluate(AJUSTAR)
                pg.screenshot(path=str(arq))
                feitos.append(str(arq))
        b.close()
    return feitos
