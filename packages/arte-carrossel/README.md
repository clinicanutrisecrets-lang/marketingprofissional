# Arte dos carrosséis — 1080x1080

`slides.py` desenha os slides em Chromium e salva PNG; `dados.py` é o conteúdo
(a copy de cada carrossel). Rodar:

```bash
python3 -c "import slides, dados; slides.render(dados.TODOS, destino='saida')"
```

## 🔴 O destaque é ROXO — nem rosa, nem vinho

A paleta antiga trazia magenta `#D6336C`, que nos olhos da Aline lê como
"rosão". Eu errei duas vezes aqui: primeiro mantive o rosa, depois troquei por
vinho (`#9E2A4A`) achando que era a mesma correção do batom. **Não era.** Ela:
*"lembra que a gente tinha falado que é roxo e não é rosa?"*

O valor é **`#7B5EA7`** — o roxo de marca do Scanner da Saúde. Mora em
`slides.ROXO`, e `dados.py` importa de lá: duas cópias do mesmo hex divergem
calado.

## 🔴 O verde é o da logo dela, e ele é CLARO

Estava `#0E5959`, que é o dark teal de APOIO da paleta, não o "verdezinho" da
marca. Ela: *"o verde não está muito escuro? achei que era o nosso verdezinho"*.

Amostrado do PNG da logo, o tom dominante é `#00A8A8` — o valor em uso é
**`#0AA8A8`**. Título em verde escuro lê como cinza-petróleo e ela não reconhece
como sendo dela. `VERDE_TEXTO` (`#0A7A78`) existe só onde corpo pequeno precisa
de contraste em fundo claro.

## 🔴 A logo é o arquivo dela, e é uma POR PERFIL

Era um SVG que eu desenhei de cabeça — uma gota com uma folha dentro. Ela
reparou na hora: *"você botou essa gota aí com uma folha, não sei o que é"*.
Marca não se aproxima: ou é o arquivo, ou não é a marca.

E são **duas marcas**: `@nutri_secrets` usa o símbolo teal da Nutri Secrets,
`@scannerdasaude` usa o losango do Scanner da Saúde. Carimbar a mesma nos três
assina o post no nome do perfil errado. O perfil sai de `c["perfil"]` ou, na
falta dele, do `arroba` do CTA.

Cada marca tem variante **clara**, porque o slide de CTA tem fundo teal: a marca
escura simplesmente some lá.

⚠️ Os PNGs da Nutri Secrets que eu tenho (`logo-ns-*.png`) **estão cortados na
borda direita** — é recorte, não arquivo original. Vale pedir o original pra ela.

## 🔴 A frase de fecho ganha um retângulo

Pedido dela: *"dá pra ter aquele retângulo atrás? só pra dar uma diferenciada da
outra parte do texto"*. É `.sub`, `display:inline-block` **de propósito**: a
caixa acompanha a frase, não a coluna inteira — faixa da largura toda leria como
tarja, e tarja ela já recusou na legenda do vídeo.

E o texto dentro dela é **centralizado com `text-wrap: balance`**. Alinhado à
esquerda, quando a frase quebra em duas linhas a sobra fica encostada num canto
— *"um pedaço ficou palhinha embaixo"*. O `balance` divide as linhas por peso em
vez de encher a primeira até o fim, que é o que evita a órfã de uma palavra só
("Vem / comigo.").

⚠️ E **sem cor inline no elemento**: o `style` do elemento vence a regra da
folha, então pintar o texto com a cor do destaque (que virou o fundo da caixa)
deixa roxo sobre roxo — retângulo aparece vazio, sem erro nenhum.

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

## 🔴 O miolo usa a MESMA família da capa

Antes o corpo era Lora (serifa) e a capa era Anton: davam a impressão de dois
posts de marcas diferentes dentro do mesmo carrossel. A Aline reparou — *"os
demais conteúdos você fez em outro layout, letras pequenas e tudo"*.

A unificação **não** é pôr tudo em caixa alta gigante. Capa e miolo têm
trabalhos diferentes: a capa para o rolar na grade, o miolo é lido depois que a
pessoa já parou. Caixa alta gigante em texto científico cansa e derruba a
compreensão. **O que unifica é a família e a escala**, não o tamanho:

- título do slide (`h2`): Anton caixa alta, 82px (a capa vai de 104 a 176)
- corpo (`p`): Montserrat 500, 46px — era serifa em 43px
- destaque (`b`): Montserrat 800 em roxo

## O `fecho`: a caixa também no miolo

`sl["fecho"]` põe a frase de conclusão do slide dentro da **mesma caixa roxa da
capa** (reusa `.sub`, só menor). Pedido da Aline olhando o "Quem só usa a
primeira porta…": aquela linha é a conclusão, e estava com o mesmo peso das
três definições acima dela.

🔴 **Reusar `.sub` é a decisão, não um atalho.** Uma caixa parecida-mas-diferente
para o miolo daria duas coisas que quase combinam, que é pior do que não ter
nenhuma. Um device só, no carrossel inteiro.

## Os fundos se revezam, dentro da paleta

Era branco em quase todo slide. A rotação agora é
**branco → verde clarinho (#E2F4F3) → creme (#FBF3E9)**, com a capa no creme
forte e o CTA no verde cheio.

🔴 **Sem subir o contraste.** O carrossel é denso: quem chama atenção é a LETRA
e o destaque roxo, não o fundo. Fundo forte por slide brigaria com o texto e
cansaria antes do CTA. Três tons quietos bastam pra não parecer oito telas
iguais.
