# Os dois vídeos montados no tablet

Mesma cena, dois públicos. O tablet de `../cenarios/tablet-frontal.mp4`
fica parado o vídeo inteiro e o que muda é a página dentro dele — que é
como um tablet se comporta de verdade, e evita ter emenda pra disfarçar.

| vídeo | público | telas |
|---|---|---|
| `roteiro_paciente.py` | paciente, Instagram | plano alimentar, exames, questionário, prato, suplementação, genética, trilha |
| `roteiro_profissional.py` | nutricionista | correlação, área genética, exames, questionário, prato, trilha |

## A ordem

```bash
python3 telas_tab.py       # HTML -> PNG, cada tela na sua largura
python3 preescalar.py      # PNG -> 794px de largura, o tamanho da tela
python3 compor.py paciente # cola as telas dentro do tablet, quadro a quadro
python3 roteiro_paciente.py paciente.ass
python3 finalizar.py tab-paciente.mp4 paciente.ass saida.mp4
```

Precisa de `base-tablet.mp4` antes, que é o cenário em vai-e-volta até
passar de 59s:

```bash
ffmpeg -i ../cenarios/tablet-frontal.mp4 -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,fps=24,setsar=1,split[a][b];\
[b]reverse,trim=start=0.042,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1:a=0[o]" \
 -map "[o]" -an -c:v libx264 -crf 18 ciclo.mp4
ffmpeg -stream_loop 4 -i ciclo.mp4 -t 59 -c copy base-tablet.mp4
```

## Quatro coisas que custaram tempo

**Não componha com `-loop 1 -i tela.png`.** O ffmpeg redecodifica o PNG a
cada quadro; com cinco telas grandes o render de um minuto de vídeo
passou de meia hora e o processo chegou a 13 GB de RAM. `compor.py` faz
a mesma coisa em numpy, com a imagem uma vez na memória: 1m15.

**Pré-escale a página pra 794px antes.** Assim o único cálculo por quadro
é o recorte da rolagem. `crop` seguido de `scale` dentro do filtro é
reescalar uma imagem grande mil e quatrocentas vezes.

**Renderize a página mais estreita que os 1150px do `body`.** O layout
reflui, a página cresce em altura e a letra fica maior em relação à tela
sem mexer em nenhum `font-size`. As larguras estão em `telas_tab.py`.

**Nem toda tela reflui.** `alelos-wide` e `gene-risco-wide` têm largura
mínima de conteúdo (902 e 1020px) e não descem disso: sozinhas numa tela
retrato sobrariam 40% de vazio. As duas viram uma página só, empilhada, e
o vídeo rola de uma pra outra — que é exatamente a ordem em que a legenda
fala das duas. Está em `telas_tab.py`, no bloco da genética.

## Onde o texto mora

A tela ocupa de y=375 a y=1575. Sobra 340px em cima, na estante, e 345px
embaixo, na mesa. O texto fica nessas duas faixas e nunca entra na tela,
senão tapa o que o vídeo está mostrando.

Consequência: **título de uma linha só**. Duas não cabem junto com o
chapéu, e diminuir a letra derrota o propósito de ter brigado pra
aumentar a tela.

Tudo branco, sem @, sem nome e sem CRN: os dois vídeos servem a qualquer
profissional do Scanner. O escuro atrás do texto vem de halo e não de
retângulo — a mesma frase desenhada duas vezes, a de trás preta com
`bord26 blur17`. O halo segue a forma da letra, então a mesa continua
aparecendo por trás.

## O que ainda falta

O fecho da versão do profissional está sem chamada de ação de verdade.
Hoje é `DO GENE À CONDUTA`, que é síntese e não convite. Quando ela
disser qual é a oferta para nutricionista, troca-se a linha `chamada` em
`roteiro_profissional.py`.
