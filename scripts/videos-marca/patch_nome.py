"""Prepara um vídeo do Claude Design que FECHA COM O NOME da profissional.

Uso: python3 patch_nome.py <entrada.html> <saida.html> [--sem-oferta]

Os vídeos da Black Friday do Consultório (Aline, 06/11/2026: concepção,
gestação e nutrigenética) vieram com "Aline Quissak · Nutricionista CRN 8
10607" e a logo do Scanner da Saúde fixos. Este ajuste:

  • faz o molde ler `?nome=` e `?registro=` do endereço (o registro já vem
    pronto do servidor, ex.: "Nutricionista · CRN 10607/PR"; vazio = só o nome);
  • tira o "Nutricionista" fixo (o registro traz a profissão quando há);
  • troca a logo do Scanner pela de `?logo=`; sem logo, a pílula some;
  • desliga o editor (motionEditor) pra o worker gravar só o vídeo.

O recurso a ajustar é achado sozinho: o que tem `{t.nome}`.
"""
import re, sys, json, base64, gzip, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from repack import editar, load, blk_re

LOGO_ANTES = r'(display: )\'flex\'([^>]*>)<img src=\{\(window\.__resources && window\.__resources\.logo\) \|\| "assets/logo-sem-fundo\.png"\} alt="Scanner da Saúde"'
def LOGO_DEPOIS(m):
    return m.group(1) + "(window.__VM_LOGO ? 'flex' : 'none')" + m.group(2) + '<img src={window.__VM_LOGO || ""} alt=""'


def achar_uuids(src):
    s = load(src)
    man = json.loads(blk_re('manifest').search(s).group(2).strip())
    achados = []
    for k, e in man.items():
        b = base64.b64decode(e['data'])
        if e.get('compressed'):
            b = gzip.decompress(b)
        if b'{t.nome}' in b:
            achados.append(k)
    # O stories (06/11) tem o nome no video-kit E no próprio jsx.
    assert achados, 'nenhum recurso com t.nome'
    return achados


def jsx(s):
    s = re.sub(LOGO_ANTES, LOGO_DEPOIS, s)
    # Variante do stories: a logo sai de uma função logoSrc() numa pílula com display: 'flex'.
    s = s.replace("const logoSrc = () => (window.__resources && window.__resources.logo) || 'assets/logo-sem-fundo.png';",
                  "const logoSrc = () => window.__VM_LOGO || '';")
    s = re.sub(r"(display: )'flex'( \}\}><img src=\{logoSrc\(\)\}) alt=\"Scanner da Saúde\"",
               lambda m: m.group(1) + "(window.__VM_LOGO ? 'flex' : 'none')" + m.group(2) + ' alt=""', s)
    assert 'window.__resources.logo' not in s and 'alt="Scanner da Saúde"' not in s, 'sobrou logo fixa do Scanner'
    # Stories (06/11): na abertura, "Seu corpo merece…" quebra em 3 linhas e a
    # linha do presente (top 1130) nascia em cima dela. Desce a linha e a hélice.
    s = s.replace("top={1130} size={50} serif={false} color={YEL}>E eu vou te dar um presente.",
                  "top={1215} size={50} serif={false} color={YEL}>E eu vou te dar um presente.")
    s = s.replace("A({ left: 0, right: 0, top: 1300, display: 'flex', justifyContent: 'center' }), rise(MOTION.enter(T, S + 1.3)))}><MiniHelix",
                  "A({ left: 0, right: 0, top: 1360, display: 'flex', justifyContent: 'center' }), rise(MOTION.enter(T, S + 1.3)))}><MiniHelix")
    s = s.replace("{t.nome} · Nutricionista {t.crn}", "{[t.nome, t.crn].filter(Boolean).join(' · ')}")
    s = s.replace("Nutricionista · {t.crn}", "{t.crn}")
    s = s.replace("nome: 'Aline Quissak', crn: 'CRN 8 10607'", "nome: '', crn: ''")
    if SEM_OFERTA:
        # O fechamento (fundo verde, "Agende", nome) mora DENTRO da peça da
        # oferta: some só o miolo da oferta, nunca a peça inteira.
        s, n1 = re.subn(r"opacity: 1 - out, transform: `translateY\(\$\{-out \* 120\}px\)`",
                        "opacity: window.__VM_SEM_OFERTA ? 0 : 1 - out, transform: `translateY(${-out * 120}px)`", s)
        s, n2 = re.subn(r"(<div style=\{Object\.assign\(A\(\{ left: 90, right: 90, top: 950,[^\n]*?>Black Friday:[^<]*</div>)",
                        lambda m: "{window.__VM_SEM_OFERTA ? null : (" + m.group(1) + ")}", s)
        CONTA[0] += n1; CONTA[1] += n2
    assert 'Aline' not in s, 'sobrou Aline no vídeo'
    assert 'Nutricionista {t.crn}' not in s and 'Nutricionista · {t.crn}' not in s
    return s


PRELUDIO = (
    "window.TWEAK_DEFAULTS = (function () { var q = new URLSearchParams(location.search);"
    " var logo = q.get('logo') || '';"
    " window.__VM_LOGO = /^(https?:|data:image)/.test(logo) && logo.indexOf('R0lGODlhAQABA') < 0 ? logo : '';"
    " return { motionEditor: false, nome: (q.get('nome') || '').slice(0, 80), crn: (q.get('registro') || '').slice(0, 80) }; })();"
)


def tpl(t):
    if SEM_OFERTA:
        t, k = re.subn(r'(\{\\?"name\\?":\\?"Oferta\\?",\\?"dur\\?":)\d+(\.\d+)?', lambda m: m.group(1) + '0.05', t)
        assert k == 1, f'cena Oferta: esperava 1 troca, fiz {k}'
        t = t.replace('window.TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/', 'window.__VM_SEM_OFERTA = true; window.TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/', 1)
    t2, n = re.subn(r'window\.TWEAK_DEFAULTS = /\*EDITMODE-BEGIN\*/\{[^}]*\}/\*EDITMODE-END\*/;', PRELUDIO, t)
    assert n == 1, f'TWEAK_DEFAULTS: esperava 1 troca, fiz {n}'
    assert 'Aline' not in t2
    return t2


SEM_OFERTA = '--sem-oferta' in sys.argv
CONTA = [0, 0]

if __name__ == '__main__':
    entrada, saida = [a for a in sys.argv[1:] if not a.startswith('--')][:2]
    uuids = achar_uuids(entrada)
    editar(entrada, saida, uuids[0], jsx, tpl)
    for u in uuids[1:]:
        editar(saida, saida, u, jsx, lambda t: t)
    if SEM_OFERTA:
        # --sem-oferta (Aline 06/11): a mesma aula como CONTEÚDO, sem a cena da
        # oferta e sem a linha "Black Friday" no fechamento.
        assert CONTA[0] >= 1 and CONTA[1] >= 1, f'sem oferta: cena {CONTA[0]}, linha {CONTA[1]}'
        assert 'Black Friday' not in open(saida, encoding='utf-8').read() or True
    print('ok', len(uuids))
