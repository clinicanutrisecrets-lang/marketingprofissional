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
