# Filtro de vídeo — maquiagem e troca de cenário

Motor que a Aline pediu para parar de gravar no Instagram só por causa do
filtro (gravar lá, baixar, subir no Estúdio). Ela grava do jeito que quiser e
isto devolve o vídeo pronto.

    python3 engine/cli.py entrada.mp4 saida.mp4 \
        [--cenario foto.png] [--verde] [--sem-maquiagem]

No Estúdio, quem roda é o workflow `.github/workflows/filtro-video.yml`
(mesmo desenho do `render-reel`): a plataforma dispara por `workflow_dispatch`,
o Actions processa e sobe o MP4 no bucket `franqueadas-assets`.

**Por que não roda na Vercel:** cada quadro custa de 0,6 s (só maquiagem) a
2,5 s (com matting). Um minuto de vídeo são 1.800 quadros.

## O preset (aprovado pela Aline em 12–13/09/2026)

`engine/preset_elegante.py`. Cada número abaixo saiu de uma reprovação dela:

| o quê | valor | por quê |
|---|---|---|
| cabelo | contraste 0,30 · profundidade 0,22 | ela reprovou saturação: "o cabelo ficou com uma cor apagada". O que lê como *preto com brilho* é **contraste**, não saturação |
| pele | limpeza 0,30 · nitidez 52 | **não clareia e não dessatura**. A versão que clareava virou "cara de asiático com pó de arroz" |
| batom | `(160,46,52)` · força 0,52 · escurecer 0,12 | vinho avermelhado. Só trocar a cor **não faz vinho** — mantendo a luminância, qualquer cor sai clara e lê como rosa |
| delineador | força 0,95 · asa 0,36 · levantar 0,55 | acima dos cílios, asa curta que **sobe**. Tangente pura vai pra baixo (a linha do cílio desce no canto externo) |
| dentes | 0,72 | peso por *claro* **E** *amarelado*, senão pega língua e gengiva |
| lifting | médio | deslocamento de 1–3% da largura do rosto; o campo morre fora do oval, senão a parede ondula |

🔴 **Roupa não é tocada por padrão** (decisão dela, 13/09): "a blusa eu posso
sempre usar; no máximo você muda a cor, e se ficar estranha deixa quieto".
`alisar()` e `trocar_cor()` existem e funcionam em **blusa fechada** (o
segmentador acha 8–11% do quadro). Em roupão de decote grande ele acha 0,4% —
confunde a peça com pele — e aí borra a mão e o colo. Por isso há um piso de 3%.

## Os dois caminhos de recorte

🔴 **O padrão é o segundo (fundo comum), por decisão da Aline em 13/09.** Ela
viu o teste do avatar do HeyGen em chroma e descartou. O caminho `--verde`
continua no código porque funciona e é barato de manter, mas **não é o que ela
usa** — não sugira "grava em verde" como solução numa sessão nova sem ela pedir.


| | fundo verde (`--verde`) | fundo comum (padrão) |
|---|---|---|
| como | **calculado**: quanto de verde sobra sobre o maior dos outros canais | **estimado**: rede neural + matting |
| custo | ~0,35 s/quadro | ~2,5 s/quadro |
| cabelo | perfeito | bom, com matting |

**Medido em 13/09**, mesmo cenário, os três materiais dela:

- quarto (parede creme, roupão rosa claro): pior caso — vãos do cabelo levam o
  quarto junto, tremor de **0,027** no lado da manga clara contra **0,010** no
  lado do móvel escuro (contraste de borda 220 × 324). Não é aleatório: é o
  contraste daquele pedaço da parede.
- porta branca: recorte limpo mesmo em vídeo 480×360 do WhatsApp.
- verde do HeyGen: 77,8% de fundo, 21,2% de pessoa, **0,98% de borda** — o
  recorte deixa de ser um problema.

## Armadilhas que já custaram horas

🔴 **`ProcessPoolExecutor` com `fork` TRAVA.** O pai já rodou o mediapipe (pra
achar o topo da cabeça) e o fork herda mutex do TF-Lite travados: os filhos
nascem dormindo num futex, 0% de CPU, **sem erro nenhum**. Sempre `spawn`.

🔴 **`Executor.map` consome o gerador inteiro na hora.** Ele leu os 410 quadros
crus (2,5 GB) antes de entregar o primeiro resultado e empacou. A submissão é
limitada a uma janela pequena de propósito.

🔴 **Os limiares do chroma saem do próprio quadro.** Chutei (0,10/0,35) e o
verde do HeyGen, que é escuro (6,91,24 ⇒ d=0,26), caiu no meio da rampa: o fundo
inteiro ficou 36% opaco. Pano verde varia com marca, luz e compressão.

🔴 **O HeyGen entrega o verde dentro de tarjas brancas.** Chavear o quadro todo
trata a tarja como pessoa. `faixa_verde()` localiza a faixa antes.

🔴 **Caminho de modelo tem que ser absoluto.** Relativo só funciona rodando de
dentro da pasta; no worker o cwd é a raiz do repo e o modelo "some".

🔴 **Despill / derrame.** A última fileira de pixels da borda é *mistura* dela
com o fundo antigo. Colada num cenário mais escuro, vira contorno luminoso —
o "fantasminha". Escurecer a borda só muda a cor do halo; o que resolve é
**substituir a cor da orla pela cor de dentro**, empurrada pra fora. No verde,
o mesmo problema aparece como contorno esverdeado.

## O que depende da GRAVAÇÃO, não do software

1. **Fundo liso.** Parede clara já resolve quase tudo (cabelo dela é escuro).
2. **Luz de frente.** No teste da porta branca ela mediu **80** de luz contra
   **113** do cenário — é isso que faz parecer que a pessoa não pertence ao
   lugar, mais que o recorte. Clarear depois levanta ruído e chapa o rosto.
3. **Plano médio** (tronco visível) cola muito melhor que close, porque o corpo
   ocupa mais ou menos o mesmo espaço que a pessoa da foto de cenário ocupava.
4. **Foto de cenário sem ninguém.** Retrato com pessoa deixa um remendo do
   tamanho de uma pessoa exatamente onde o vídeo não cobre.

## Fotos de cenário

`cena.janela_limpa()` escolhe o pedaço da foto com menos pessoa dentro;
`cena.limpar_cenario()` apaga o resto e **desfoca pesado só a área remendada**
(cor esticada some quando some a forma). Melhor que consertar é não precisar:
peça a foto da sala **vazia**.

⚠️ **Fundo desfocado piora.** Sem micro-contraste, vira borrão liso atrás de
uma pessoa cheia de textura. `desfoque_fundo=0` é o padrão.

---

## A letra grande (vídeo e capa) — `engine/tipografia.py`

Pedido da Aline (13/09), olhando o perfil do Flávio Passos: *"esse tipo de
letra, essa fonte que eu falo pra você — olha o tamanho, e a fonte, e a
proporção no vídeo e nas capas"*.

**Fonte: Anton** (`engine/fontes/Anton.ttf`), caixa alta, branco com contorno
preto. Apoio: Montserrat ExtraBold. É a MESMA letra no vídeo e na capa do
carrossel — era isso que ela estava apontando, consistência entre as duas
superfícies.

### 🔴 O corpo é DERIVADO do texto, nunca fixo

Era `px=54` fixo. Lá no perfil dele a palavra ocupa sempre a mesma fatia da
tela: palavra curta sai gigante, frase longa quebra em duas linhas e ocupa a
mesma largura. Com corpo fixo, frase curta sai pequena e frase longa vaza —
a letra lê como legenda de streaming, não como capa.

`ajustar()` faz busca binária pelo maior corpo em que o texto cabe em
`max_linhas` preenchendo `ocupa` da largura (padrão 0.86–0.88).

### 🔴 Entrelinha 1.14, não 0.98/1.06

Em português a caixa alta carrega acento (NÃO, VOCÊ, GENÉTICA) e o circunflexo
sobe ACIMA da altura das maiúsculas. Com a entrelinha que o inglês aguenta, o
acento de uma linha encosta na letra da linha de cima — e isso só aparece na
frase certa, nunca no teste com texto sem acento.

### 🔴 Contorno, nunca tarja

A Aline recusou tarja atrás do texto. O contorno é desenhado em círculo
(`passos` posições ao redor), não nas 8 direções — em corpo grande as 8
direções deixam serrilha nos cantos diagonais.

### 🔴 Anton já É o peso

Não tem negrito nem itálico. Pedir `bold` nele faz o Chromium simular
engordando o traço, o que borra a contra-forma em corpo grande.

### 🔴 Na capa do carrossel a fonte vai EMBUTIDA em base64

O Chromium renderiza `set_content` sem base URL, então caminho relativo vira
fonte faltando — e o fallback é silencioso: o título sai em Impact/sans no PNG
e só se descobre olhando a arte pronta.

### Estrutura de capa

Três formatos, que a Aline escolhe por peça:
- **B** — o gancho inteiro em Anton (fica com 3–4 linhas em gancho longo);
- **C** — `soco` curto de 2–3 palavras em Anton + o gancho inteiro em
  Montserrat embaixo. É a proporção do perfil de referência, e é o que lê na
  miniatura da grade, onde a capa tem ~1/3 da largura.

---

## Aula longa (30–60 min): `.github/workflows/filtro-aula.yml`

**Medido em 13/09**, 4 núcleos, 150 quadros (5 s de vídeo):

| resolução | tempo | custo | aula de 1 h |
|---|---|---|---|
| 720x1280  | 17 s | **3,4× o tempo do vídeo** | ~3 h 25 min |
| 1080x1920 | 40 s | **8× o tempo do vídeo**   | ~8 h |

🔴 **A resolução mais que dobra a conta.** Gravar em 1080 custa 2,3× o que custa
gravar em 720 — vale escolher isso ANTES de gravar, não depois.

Por isso a aula não passa pelo `filtro-video.yml` (timeout de 90 min, pensado
pra reel de 1 min). O `filtro-aula.yml` **corta a aula em pedaços de 5 min que
rodam em paralelo**: 12 pedaços terminam juntos, em torno de 20 min de relógio.

### 🔴 O corte também é a rede de segurança

Pedido da Aline: *"quando são aula de meia hora, de uma hora, eu não quero
correr o risco de gravar e depois não conseguir botar o filtro"*. Com
`fail-fast: false`, um pedaço que falha não derruba os outros — só ele é
refeito. Gravar uma hora e perder tudo por causa de um erro no minuto 52 deixa
de ser possível.

E o job `juntar` **confere a contagem antes de juntar**: sem isso, um pedaço
que falhou vira aula com um buraco de 5 minutos no meio, e o arquivo final
parece perfeitamente normal.

### 🔴 O áudio sai UMA VEZ, do original inteiro

Processar áudio por pedaço e juntar depois acumula desvio de sincronia. Num
vídeo de uma hora isso vira labial fora do lugar no fim da aula. O vídeo é
cortado com `-c copy` (corte em quadro-chave, nenhum quadro perdido nem
recodificado), e no fim o áudio original é remuxado por cima.

### 🔴 `segundos_teste` — use ANTES de gravar a aula toda

O input `segundos_teste` processa só os primeiros N segundos. O caminho seguro é
sempre o mesmo: grave **1 minuto de teste** na mesma luz, na mesma roupa e no
mesmo enquadramento da aula, rode com `segundos_teste: 60`, olhe o resultado —
e só então grave a hora inteira. É a única forma de eliminar de verdade o risco
que ela levantou; nenhuma promessa minha substitui esse um minuto.

---

## 🔴 Vídeo do Higgsfield NÃO leva filtro

A Aline (13/09): *"os vídeos que eu já estou te mandando não é pra aplicar
filtro, eles já estão com filtro, já estou bonitinha neles."*

O filtro de maquiagem é pro que **ela grava** — webcam, celular, aula com
teleprompter. O que vem do Higgsfield já chega tratado; passar o filtro por
cima é retrabalho e soma dois tratamentos na mesma imagem.

Regra prática: **a origem decide.** Gravou ela → filtro. Veio gerado → só
legenda e montagem.

## A chamada na tela é EMPILHADA, não sequencial

Correção dela na mesma conversa. A versão anterior alternava duas frases
grandes no rodapé e ela vetou: *"colocou embaixo e quase não dá pra ver"* — ali
o texto disputa com o balcão e com o liquidificador.

O desenho aprovado é um bloco só, **centrado na altura da tela**:

- **frase principal** em Anton caixa alta, no meio: "A fruta que você deveria
  consumir todos os dias";
- **linha de público** logo abaixo, em corpo bem menor (metade da principal):
  "Se você sofre com dor crônica, inflamação e doenças autoimunes".

A de público entra ~1,7 s depois da principal, pra dar uma batida.

⚠️ O número ("17x mais vitamina C") **não vai pra tela** — ela cortou: *"vitamina
C é muito batido, isso pode ser parte do conteúdo da legenda, mas não a frase
do meio do vídeo"*. A tela desperta; a legenda informa.

### A tarja da linha de público é VERDE, e translúcida

Pedido dela: *"um pouquinho daquela transparência, mas ao invés de preto, o
Tiffany da Nutri Secrets"*. `TARJA = (10, 168, 168, 214)` — o verde da marca a
84%.

🔴 **Translúcida sim, clara não.** O fundo ali é blusa branca e mármore: verde
com alfa baixo sobre claro vira um pastel e o texto branco some. 84% ainda
deixa a cena aparecer através, que é o efeito que ela pediu, e mantém o branco
legível. Com a tarja, o texto perde o contorno e a sombra — os três juntos
viram sujeira.

### A segunda linha entra no SEGUNDO clipe

O vídeo é a emenda de dois clipes (o primeiro acaba em 9,05 s). A linha de
público entra em **9,4 s**, logo depois do corte. Duas frases juntas desde o
começo entregam tudo de uma vez; segurar a segunda dá tempo de ler a primeira,
e a própria troca de cena marca a entrada, sem precisar de animação.

### O terceiro tempo LIMPA a tela

Na hora em que o suco cai no copo, as duas primeiras frases saem e entra **uma
linha curta** que manda pra legenda: *"O jeito de tomar muda tudo. Eu conto na
legenda."*

🔴 **Sai, não soma.** Empilhar a terceira embaixo das outras duas poria três
blocos em cima do copo, que é a imagem mais bonita do vídeo. E a régua do
formato é uma ideia por vez.

🔴 **A chamada abre uma curiosidade que a legenda FECHA.** "Leia a legenda" sem
motivo ninguém obedece; "tem um detalhe na hora de tomar" a pessoa quer saber.
A legenda entrega mesmo (a vitamina C oxida, é de bater e beber) — promessa que
a legenda não paga treina a pessoa a ignorar a próxima.

⚠️ **Nada de credencial na tela.** As duas primeiras frases falam do
ESPECTADOR; uma terceira falando da nutricionista troca o sujeito no fim e
perde o fio. Autoridade vive na legenda e na bio, onde quem já se interessou vai
procurar.

⚠️ Armadilha de código: no laço das camadas, a variável de saída **não pode se
chamar `sai`** — o processo de saída do ffmpeg já se chama assim, e o
sombreamento só estoura no primeiro quadro.
