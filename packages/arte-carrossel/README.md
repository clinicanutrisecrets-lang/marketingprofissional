# Arte dos carrosséis — 1080x1080

`slides.py` desenha os slides em Chromium e salva PNG; `dados.py` é o conteúdo
(a copy de cada carrossel). Rodar:

```bash
python3 -c "import slides, dados; slides.render(dados.TODOS, destino='saida')"
```

## 🔴 O destaque é VINHO, não rosa

A paleta da marca traz magenta `#D6336C`, e nos olhos da Aline ele lê como
"rosão". Ela corrigiu isso duas vezes na mesma semana — primeiro no batom
(12/09) e depois na arte (13/09: *"ainda tá vindo com o rosa que a gente já
conversou"*).

O valor em uso é **`#9E2A4A`**. Trocar só o matiz não resolve: **o que separa
vinho de rosa é a luminância**, então o valor novo precisa ser mais escuro, não
só mais vermelho. O hex mora em `slides.MAG` e o `dados.py` importa de lá — duas
cópias do mesmo hex divergem calado.

## 🔴 A capa tem um "soco"

`sl["soco"]` é um título de 2–3 palavras em Anton caixa alta, e o gancho inteiro
desce pra baixo dele, menor. Sem isso o gancho vira 4 linhas de caixa alta.

O motivo é a **grade do perfil**: ali a capa aparece com cerca de um terço da
largura, e só o soco sobrevive nesse tamanho. Foi a proporção que a Aline
apontou no perfil de referência, onde as capas são "CANSEI", "COMER DEVAGAR",
"AMENDOIM FAZ BEM?".

## 🔴 A fonte vai EMBUTIDA em base64

O Chromium renderiza `set_content` sem base URL, então caminho relativo vira
fonte faltando — e o fallback é silencioso: o título sai em Impact/sans no PNG e
só se descobre olhando a arte pronta. Ver `_css()`.

## 🔴 Entrelinha 1.14 na caixa alta

Em português a caixa alta carrega acento (NÃO, VOCÊ, GENÉTICA) e o circunflexo
sobe acima da altura das maiúsculas. Com a entrelinha que o inglês aguenta, o
acento de uma linha encosta na letra da linha de cima — e isso só aparece na
frase certa, nunca no teste.

A letra grande é a mesma do vídeo: ver `packages/video-filtro/engine/tipografia.py`.

## 🔴 O título encolhe até caber

O slide tem altura fixa (1080) com `overflow:hidden` e `justify-content:center`.
Título comprido não gera erro nenhum: ele **vaza pelos dois lados** e o PNG sai
com a sobrancelha cortada em cima e o CTA cortado embaixo. Aconteceu com
"EXAME NORMAL, CORPO CANSADO", que em Anton 176px dá três linhas.

`AJUSTAR` roda no navegador depois de montar a página: mede a altura real do
conteúdo (com `justify-content:flex-start`, senão o transbordo de cima não
entra na conta), encolhe o título de 4 em 4 px até caber, e só no último caso
mexe no corpo. É a mesma regra da legenda do vídeo — a proporção é fixa, o
corpo é que sai do texto.

## 🔴 Zero rede durante o render

Todas as fontes vão embutidas em base64 (`FACES` + `_faces()`), não por `<link>`
pro Google Fonts. Com o link, numa sessão com a saída de rede bloqueada, cada
slide ficava parado esperando `fonts.googleapis.com` e os 22 slides não
terminavam. Sem rede: **21 segundos** pros 22.
