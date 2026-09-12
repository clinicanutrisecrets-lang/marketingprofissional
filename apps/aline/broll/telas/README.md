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


## Tela em perspectiva: o monitor

O tablet estava de frente, então a tela entrou por cima como retângulo. O
monitor fica de lado na mesa, e aí a tela é um **trapézio**: colar um
retângulo nele denuncia a montagem na hora.

O filtro `perspective` resolve. Ele leva os quatro cantos da imagem para
os quatro cantos que a gente mandar, e é isso que encaixa a tela na
inclinação do monitor.

Achar os quatro cantos do clipe (eles não mudam, a câmera é travada):

```python
g = cv2.cvtColor(quadro, cv2.COLOR_BGR2GRAY)
m = (g > 95).astype(np.uint8)
# maior componente claro que não encosta na borda = a tela
# depois: approxPolyDP no contorno dela, e ordena os 4 cantos por soma e
# diferença das coordenadas (TL, TR, BR, BL)
```

E o render, com os cantos já em 1080x1920:

```bash
ffmpeg -i monitor.mp4 -loop 1 -i tela.png -loop 1 -i mascara.png -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,fps=24[v];\
[1:v]crop=2300:1294:0:'min(1430,max(0,(t-0.7)*190))',scale=1080:1920:flags=lanczos,\
perspective=102:598:991:500:78:1140:975:1188:sense=destination:interpolation=linear[p];\
[2:v]format=gray[m];[p][m]alphamerge[s];\
[v][s]overlay=0:0:shortest=1[o]" -map "[o]" -map 0:a? saida.mp4
```

A ordem dos pontos no `perspective` é canto superior esquerdo, superior
direito, **inferior esquerdo**, inferior direito. Trocar os dois últimos
torce a imagem em ampulheta.

## Tipografia: renderizar estreito pra sair grande

A tela do monitor ocupa pouca altura num quadro em pé, então o texto
desenhado em 1600 de largura sai pequeno demais pra ler no celular.
Renderizar a **mesma página** em 1150 de largura aumenta tudo em quase
50% em relação à tela, sem mexer em nenhum tamanho de fonte:

```python
pg = b.new_page(viewport={"width": 1150, "height": 700}, device_scale_factor=2)
pg.add_style_tag(content="body{width:1150px}")
```

## Clipe curto, vídeo longo

Cena quase parada repete sem emenda: o clipe corre pra frente e volta de
trás pra frente. Seis segundos viram doze, e o que muda no meio é a tela
rolando.

```bash
ffmpeg -i clipe.mp4 -filter_complex \
"[0:v]split[a][b];[b]reverse,trim=start=0.05,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1[o]" \
-map "[o]" -an saida.mp4
```
