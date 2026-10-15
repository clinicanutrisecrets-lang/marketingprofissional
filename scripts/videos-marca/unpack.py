import re,json,base64,gzip,sys
s=open(sys.argv[1],encoding='utf-8').read()
def blk(t):
    m=re.search(r'<script type="__bundler/'+t+r'">(.*?)</script>',s,re.S); return m.group(1) if m else None
tpl=json.loads(blk('template'))
open('template.html','w').write(tpl if isinstance(tpl,str) else json.dumps(tpl))
man=json.loads(blk('manifest'))
print(type(man), list(man)[:5] if isinstance(man,dict) else len(man))
import os; os.makedirs('res',exist_ok=True)
for k,v in man.items():
    d=v.get('data'); mime=v.get('mime') or v.get('type'); comp=v.get('compressed')
    b=base64.b64decode(d)
    if comp: b=gzip.decompress(b)
    ext={'application/javascript':'js','text/javascript':'js','text/css':'css','text/html':'html','image/png':'png','image/svg+xml':'svg'}.get(mime,'bin')
    open(f'res/{k}.{ext}','wb').write(b); print(k,mime,len(b))
print(blk('ext_resources')[:500]); print(blk('page_order')[:300])
