# Telas do app, feitas pra caber no tablet

Gerador de vídeo não escreve tela: borra ícone, inventa letra e troca
número. Então a tela do tablet sai vazia na geração e recebe a tela de
verdade por cima, no render.

Estes arquivos são as telas, em HTML, desenhadas no formato do tablet em
pé. Editar texto aqui é editar texto num arquivo, não num vídeo.

Como virar imagem e entrar no vídeo:

```bash
# 1. a tela vira PNG, na largura da tela do tablet no vídeo final
python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1176, "height": 900})
    pg.goto("file:///caminho/ritmo-circadiano.html"); pg.wait_for_timeout(400)
    alt = pg.evaluate("() => Math.ceil([...document.body.children].pop().getBoundingClientRect().bottom) + 40")
    pg.set_viewport_size({"width": 1176, "height": alt})
    pg.screenshot(path="tela.png"); b.close()
PY

# 2. a tela entra no lugar da tela do tablet, rolando devagar
#    (66,188)+588x939 é o retângulo da tela no clipe de origem, em 720x1280
ffmpeg -i tablet.mp4 -loop 1 -i tela.png -loop 1 -i mascara.png -filter_complex "\
[0:v]scale=2160:3840:flags=lanczos,fps=24[v];\
[1:v]crop=882:1408:0:'min(227,max(0,(t-0.8)*58))',scale=1764:2816[c];\
[2:v]format=gray,scale=1764:2816[m];[c][m]alphamerge[s];\
[v][s]overlay=198:564:shortest=1[o];\
[o]zoompan=z='min(1.05,1+0.05*on/120)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=1080x1920:fps=24[z]" \
-map "[z]" -map 0:a? -c:v libx264 -crf 19 -pix_fmt yuv420p saida.mp4
```

A máscara é um retângulo branco de cantos arredondados do tamanho da
tela: sem ela a colagem cobre os cantos arredondados do tablet e a
montagem aparece.

O retângulo da tela muda a cada clipe gerado. Achar o dele:

```python
g = cv2.cvtColor(quadro, cv2.COLOR_BGR2GRAY)
m = (g > 100).astype(np.uint8)
# maior componente claro que NÃO encosta na borda: a parede encosta, a tela não
```
