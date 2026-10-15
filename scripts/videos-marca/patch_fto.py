"""FTO Marca: a cor padrão (tiffany/roxo) não existia no COL, então o molde
quebrava ao abrir sem ?primaria. Aqui ela entra; o resto do arquivo fica igual."""
import sys
sys.path.insert(0,'.')
from repack import editar,tpl_padrao
ANTES="const COL = { bg: '#F8F9FE',"
DEPOIS="const COL = { bg: '#F8F9FE', tiff: '#0ABFBC', purple: '#7B5EA7',"
def jsx(s):
    assert s.count(ANTES)==1
    return s.replace(ANTES,DEPOIS)
editar(sys.argv[1],sys.argv[2],'dbc8b25f-ff9d-4f58-8405-7e7f4f6691fd',jsx,tpl_padrao)
print('ok')
