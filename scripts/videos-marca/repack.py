"""Edita um bundle do Claude Design: aplica uma função nos recursos JSX e no template, e regrava."""
import re,json,base64,gzip,sys
def load(p): return open(p,encoding='utf-8').read()
def blk_re(t): return re.compile(r'(<script type="__bundler/'+t+r'">)(.*?)(</script>)',re.S)
def editar(src_path, dst_path, uuid_jsx, fn_jsx, fn_tpl):
    s=load(src_path)
    m=blk_re('manifest').search(s); man=json.loads(m.group(2).strip())
    e=man[uuid_jsx]; b=base64.b64decode(e['data']); comp=e.get('compressed')
    if comp: b=gzip.decompress(b)
    novo=fn_jsx(b.decode('utf-8')).encode('utf-8')
    if comp: novo=gzip.compress(novo,9)
    e['data']=base64.b64encode(novo).decode()
    s=s[:m.start(2)]+json.dumps(man).replace('</','<\\u002F')+s[m.end(2):]
    m=blk_re('template').search(s); tpl=json.loads(m.group(2).strip())
    tpl=fn_tpl(tpl)
    s=s[:m.start(2)]+json.dumps(tpl).replace('</','<\\u002F')+s[m.end(2):]
    open(dst_path,'w',encoding='utf-8').write(s)
def tpl_padrao(tpl):
    # Editor desligado e legendas LIGADAS (Aline 16/10: a profissional narra
    # por cima, mas o texto escrito aparece na tela).
    t2=re.sub(r'"motionEditor":\s*true','"motionEditor": false',tpl)
    t2=re.sub(r'"legendas":\s*false','"legendas": true',t2)
    return t2
