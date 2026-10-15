import re,sys
sys.path.insert(0,'.')
from repack import editar,tpl_padrao,load
fto=load([__import__('glob').glob('fto/res/dbc8b25f*.js')][0][0]).split('\n')
# prelúdio de marca do FTO (das helpers até o fim de applyBrand), sem a linha COL
ini=next(i for i,l in enumerate(fto) if l.startswith('// ---- Marca'))
fim=next(i for i,l in enumerate(fto) if l.strip()=='BASE.C = COL.tiff; BASE.G = COL.purple;')+1
PRE='\n'.join(fto[ini:fim+1])
def jsx(s):
    L=s.split('\n')
    assert L[1].startswith('const COL')
    L[1]=L[1]  # mantém COL original (tiff/purple de padrão)
    i_base=next(i for i,l in enumerate(L) if l.startswith('const BASE ='))
    L.insert(i_base+1, PRE+'\napplyBrand(BRAND.primaria, BRAND.secundaria);')
    s='\n'.join(L)
    corpo_ini=s.index('const COMP')
    cab,corpo=s[:corpo_ini],s[corpo_ini:]
    corpo=corpo.replace("'linear-gradient(135deg, #0ABFBC, #089896)'",'`linear-gradient(135deg, ${COL.tiffFill}, ${COL.tiffD})`')
    corpo=corpo.replace("'linear-gradient(135deg, #7B5EA7, #5C4080)'",'`linear-gradient(135deg, ${COL.purpleFill}, ${COL.purpleD})`')
    mapa={'#E6F9F9':'COL.tiff50','#F3EFF8':'COL.purple50','#E3DAF0':'COL.purple100','#7FDAD8':'COL.tiffL','#B9A5D6':'COL.purpleL',
          '#0ABFBC':'COL.tiff','#089896':'COL.tiffD','#7B5EA7':'COL.purple','#5C4080':'COL.purpleD'}
    for hx,v in mapa.items():
        corpo=re.sub(r'="'+hx+'"','={'+v+'}',corpo,flags=re.I)
        corpo=re.sub(r"'"+hx+"'",v,corpo,flags=re.I)
        assert hx.lower() not in corpo.lower(), hx
    corpo=corpo.replace('src={window.__resources.logo} alt="Scanner da Saúde"','src={LOGO()} alt={NOME()}')
    assert 'window.__resources.logo' not in corpo
    corpo=corpo.replace('function MetilacaoApp() {\n  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);',
      "let LOGO_CUR = BRAND_DEFAULT.logo, NOME_CUR = BRAND_DEFAULT.nome;\nconst LOGO = () => LOGO_CUR, NOME = () => NOME_CUR;\nfunction MetilacaoApp() {\n  const [tw, setTweak] = useTweaks(window.TWEAK_DEFAULTS);\n  applyBrand(BRAND.primaria || tw.primaria, BRAND.secundaria || tw.secundaria);\n  LOGO_CUR = BRAND.logo || BRAND_DEFAULT.logo; NOME_CUR = BRAND.nome || BRAND_DEFAULT.nome;",1)
    assert 'LOGO_CUR = BRAND.logo' in corpo
    return cab+corpo
def tpl(t):
    t=tpl_padrao(t)
    t=t.replace('"spin": 0.5}','"spin": 0.5, "primaria": "#0ABFBC", "secundaria": "#7B5EA7"}')
    assert '"primaria"' in t
    return t
editar(sys.argv[1],sys.argv[2],'71161fc3-a621-4a2f-8141-09c70cd973f9',jsx,tpl)
print('ok')
