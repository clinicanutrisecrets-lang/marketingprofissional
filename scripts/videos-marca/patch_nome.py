"""Prepara um vídeo do Claude Design que FECHA COM O NOME da profissional.

Uso: python3 patch_nome.py <entrada.html> <saida.html>

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


def achar_uuid(src):
    s = load(src)
    man = json.loads(blk_re('manifest').search(s).group(2).strip())
    achados = []
    for k, e in man.items():
        b = base64.b64decode(e['data'])
        if e.get('compressed'):
            b = gzip.decompress(b)
        if b'{t.nome}' in b:
            achados.append(k)
    assert len(achados) == 1, f'esperava 1 recurso com t.nome, achei {achados}'
    return achados[0]


def jsx(s):
    s, n = re.subn(LOGO_ANTES, LOGO_DEPOIS, s)
    assert n == 2, f'logo: esperava 2 trocas, fiz {n}'
    assert 'window.__resources.logo' not in s
    antes = s
    s = s.replace("{t.nome} · Nutricionista {t.crn}", "{[t.nome, t.crn].filter(Boolean).join(' · ')}")
    s = s.replace("Nutricionista · {t.crn}", "{t.crn}")
    s = s.replace("nome: 'Aline Quissak', crn: 'CRN 8 10607'", "nome: '', crn: ''")
    assert s != antes
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
    t2, n = re.subn(r'window\.TWEAK_DEFAULTS = /\*EDITMODE-BEGIN\*/\{[^}]*\}/\*EDITMODE-END\*/;', PRELUDIO, t)
    assert n == 1, f'TWEAK_DEFAULTS: esperava 1 troca, fiz {n}'
    assert 'Aline' not in t2
    return t2


if __name__ == '__main__':
    entrada, saida = sys.argv[1], sys.argv[2]
    editar(entrada, saida, achar_uuid(entrada), jsx, tpl)
    print('ok')
