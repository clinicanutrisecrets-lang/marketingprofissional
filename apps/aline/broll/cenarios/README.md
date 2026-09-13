# Cenários: os clipes que ficam

Clipe gerado vive na sessão em que foi enviado, e sessão acaba. Estes
aqui não: estão no Git, versionados, e qualquer sessão futura clona o
repositório e já tem o cenário na mão.

Cada um custou uma geração e serve pra sempre, porque a tela deles é
vazia. O que muda é o HTML em `../telas/`.

| arquivo | o que é | tela |
|---|---|---|
| `tablet-em-pe.mp4` | tablet de frente, mesa clara, 5s, 720x1280 | retângulo, `(66,188)` `588x939` |
| `monitor-na-mesa.mp4` | monitor na mesa do consultório, luz de janela, caneca com vapor, poltrona ao fundo, 6s, 720x1280 | trapézio, cantos em `telas.json` |
| `tablet-frontal.mp4` | **o bom**: tablet de frente, enorme, estante ao fundo, 6s, 720x1280 | retângulo `(99,250)` `529x800` |
| `tablet-de-frente.mp4` | tablet grande na mesa escura, luz de fim de tarde, livros e caneca, 6s, 720x1280 | trapézio + máscara, em `telas.json` |
| `dna-helice.mp4` | hélice de DNA dourada girando, fundo escuro, 6s, 720x1280 | não tem tela: é fecho de vídeo |

As coordenadas estão em `telas.json`, já medidas. Não precisa achar de
novo: a câmera é travada nos dois e a tela não anda um pixel do primeiro
ao último quadro.

## O tablet frontal, que é o que se usa

`tablet-frontal.mp4` é o que a terceira tentativa de prompt entregou, e é
o melhor cenário da pasta. Frontal de verdade: a tela é um retângulo
limpo, `(99,250)` `529x800` em 720x1280, e nada tapa os cantos. Não
precisa de `perspective` nem de máscara complicada — `scale` e `overlay`
resolvem.

Em 1080x1920 a tela fica em `(148,375)` `794x1200`, proporção 0.6613. É
retrato, e as telas de `../telas/` foram desenhadas deitadas. Em vez de
refazer cada uma, elas são renderizadas **mais estreitas**: o layout
reflui, a página cresce em altura e a letra fica maior em relação à tela,
sem mexer em nenhum `font-size`. As larguras escolhidas estão em
`montar-video-tablet/`.

Duas coisas que economizam muito tempo de render:

- **Pré-escale a página** para 794px de largura antes de entrar no
  ffmpeg. Com o PNG já na largura certa, o único cálculo por quadro é o
  `crop` da rolagem. Fazendo `crop` e depois `scale` dentro do filtro,
  são 1400 reescalas de imagem grande e o render leva dez vezes mais.
- **Uma cena só, sem corte.** O tablet fica parado o vídeo inteiro e o
  que muda é a página dentro dele, com `overlay=...:enable='between(t,a,b)'`.
  É como um tablet se comporta de verdade, e não tem emenda pra disfarçar.

O texto do vídeo mora fora da tela: sobra uma faixa de 340px em cima, na
estante desfocada, e 345px embaixo, na mesa. Isso obriga **título de uma
linha só** — duas não cabem junto com o chapéu, e diminuir a letra
derrota o propósito de ter aumentado a tela.

## O outro tablet, e a máscara que ele precisa

`tablet-de-frente.mp4` é o clipe original recortado: na geração o tablet
saía com 53% da largura do quadro, e uma tela densa nesse tamanho não se
lê no celular. O corte deixa a tela com 71%. Perde nitidez na madeira e
no acabamento, mas a tela em si entra por cima em PNG e continua limpa,
que é o que importa.

Ele é o único dos três que **não pode ser composto só pelo trapézio**.
Os livros tapam o canto de baixo à esquerda da tela e a caneca morde a
direita; se você usar o quadrilátero cheio, a imagem passa por cima dos
livros e a cena desmonta. Por isso vem com `mascara-tablet-frente.png`,
que é a região visível da tela já recortada, medida por cor no próprio
quadro: claro e sem saturação é tela, quente e saturado é livro ou
caneca.

```bash
ffmpeg -i tablet-de-frente.mp4 -loop 1 -i tela.png -loop 1 -i mascara-tablet-frente.png \
 -filter_complex "\
[0:v]scale=1080:1920:flags=lanczos,fps=24[v];\
[1:v]crop=2352:3449:0:'min(911,max(0,(t-0.8)*150))',scale=1080:1920:flags=lanczos,\
perspective=211:379:975:398:80:1491:857:1544:sense=destination:interpolation=linear[p];\
[2:v]format=gray[m];[p][m]alphamerge[s];[v][s]overlay=0:0:shortest=1[o]" \
 -map "[o]" -an -r 24 -c:v libx264 -crf 20 saida.mp4
```

O `crop` tem proporção 0.682, que é a da tela depois da perspectiva, e
não 9:16. Se você cortar em 9:16 a página sai espremida. E a página é
renderizada com viewport de 1176px: mais estreito que isso, a letra
cresce em relação à tela sem mexer em nenhum `font-size`.

## O fecho

`dna-helice.mp4` não tem tela pra trocar: ele é o final. Seis segundos de
hélice girando, que viram oito com `setpts=1.34*PTS` — no ritmo original
o giro atropela a leitura da chamada. O texto por cima só fica legível
com faixa escura atrás, porque a hélice é dourada e clara no meio do
quadro; nos vídeos montados aqui a faixa vai de 0 a 760 e de 1380 a 1920,
que é onde o texto senta e onde a hélice não está.

```bash
ffmpeg -i dna-helice.mp4 -vf "setpts=1.34*PTS,eq=brightness=-0.03:saturation=1.05,fps=24" \
  -r 24 -an -c:v libx264 -crf 20 fecho.mp4
```

Pra emendar no fim de um vídeo, `fade` nos dois lados e `concat` — `xfade`
erra a conta da duração quando as entradas têm base de tempo diferente.

## O que pode entrar aqui

Cenário **sem pessoa e sem dado**: mesa, aparelho, tela vazia, laboratório,
comida. É o que pode morar num repositório público sem pensar duas vezes.

## O que nunca entra

- **Clipe com o rosto dela.** O repositório é público. Esses ficam na pasta
  do Drive, fora do Git, e o caminho está em `../PEDIR-EM-OUTRA-SESSAO.md`.
- **Tela com dado real de paciente.** Nome, nascimento, documento, telefone.
  As telas em `../telas/` são todas de paciente fictícia, de propósito.
- **Vídeo pronto pra publicar.** Entregue é entregue; o que fica guardado
  é a matéria-prima e a receita, porque o vídeo se remonta em minutos e
  ocupa dez vezes mais espaço.

## Peso

Vídeo em Git fica na história pra sempre, mesmo se for apagado depois.
Por isso: só clipe curto de cenário, e só o que vai ser reusado. Estes
dois somam 5 MB. Se um dia isso virar dezenas de arquivos, a conversa
muda pra Git LFS ou pro Drive.
