# Anúncio do Desafio

Dois vídeos de celular, gravados de uma vez só, virando anúncio no mesmo
desenho do anúncio da formação: fundo de marca, título fixo em cima,
karaokê palavra a palavra embaixo, assinatura no rodapé.

| arquivo | onde | assunto | chamada |
|---|---|---|---|
| `roteiro-desafio-4338.json` | escritório | "você ficou pra trás?" — os números dos alunos, confiança baixa, o que falta não é saber, é fazer | falada no fim + cartão |
| `roteiro-desafio-4339.json` | cozinha | "o paciente já chegou" — quem trouxe nutrigenética pro consultório foi o paciente, não o congresso | só cartão |

Monta com `montar-desafio.py roteiro.json`. A transcrição vem do
faster-whisper (`small`, `int8`, `word_timestamps=True`).

## O que a chamada diz, e o que ela não diz

```
DESAFIO DE 6 DIAS
VEM PARA O DESAFIO
MEU CONSULTÓRIO DE PRECISÃO
clique no link abaixo
```

**A palavra "gratuito" não entra em texto nenhum.** Nem no título, nem na
legenda, nem no cartão.

No vídeo do escritório ela fala "o meu software que eu vou liberar
gratuito durante o desafio" aos 2:18. Texto a gente controla, áudio não —
então a palavra é **cortada do vídeo**, com imagem e som juntos, em
`"cortes": [[138.05, 138.66]]`. São 0,6 segundo; a frase fica "o meu
software que eu vou liberar durante o desafio" e o corte passa como um
corte seco comum, que é o que esse formato tem de sobra. A transcrição é
reancorada sozinha, senão toda a legenda depois do corte ficaria adiantada.

## O enquadramento

O vídeo do celular é 9:16 e enche o quadro. Se ficar assim não sobra
lugar pro texto, e texto por cima do rosto durante três minutos cansa.
Então ele vira uma faixa quase quadrada no meio:

```
recorte 720x707 a partir de y=200   →   faixa 1080x1060 em y=470
```

O `y=200` não é chute: o rosto dela ocupa de y≈230 a y≈820 nos 1280 de
altura nos dois vídeos. Cortando de 200 a 907 sobra ar em cima da cabeça
e o queixo não encosta na borda. Testar com três quadros espalhados pelo
vídeo antes de renderizar é o que evita descobrir o corte errado depois de
meia hora de render.

Sobra faixa de marca de 0 a 470 (chapéu, título, régua) e de 1530 a 1920
(karaokê e assinatura).

## Insertos

`"insertos": [{"de": 40.0, "ate": 44.0, "clipe": "..."}]` troca a faixa do
rosto por um B-roll durante a janela, mantendo o áudio. Serve pra tapar um
defeito sem regravar, e de quebra muda o plano — num anúncio de três
minutos isso já vale por si.

O B-roll é mais estreito que a faixa, então antes dele a faixa inteira é
pintada de fundo de marca. Sem isso o rosto aparece nas laterais.

## Duas coisas que o `montar-ads.py` fazia errado

**Legenda empilhada.** Lá o último evento de um bloco terminava em
`fim + 0.12` sem olhar o bloco seguinte. Quando a fala emendava rápido,
dois blocos apareciam ao mesmo tempo na mesma linha — dá pra ver no
anúncio da formação, "qu…ta" por cima de "super bacana,". Aqui o fim do
bloco é limitado pelo começo do próximo.

**Correção só palavra a palavra.** O whisper escreve "nutrigenético" como
"noutro e genético": três tokens no lugar de um, e nenhuma troca palavra a
palavra alcança isso. Agora existe `"frases"`, que troca sequências e
reparte o tempo entre as palavras novas. É o que conserta "noutros",
"conteste noutro e genético", "tudo sobre saudade", "guardem a gaveta".

## O que ainda falta

- **O filtro do olho.** Num dos vídeos o filtro de beleza escorrega no
  olho dela. Dois detectores não acharam: nem pico de diferença na região
  dos olhos, nem transiente que volta ao normal. Precisa do minuto
  aproximado pra virar um inserto de 3 a 4 segundos.
- **Duração.** O do escritório dá 3:14 com o cartão, acima do limite de
  3:00 do Reels. Ou corta um trecho da fala, ou vai como vídeo de feed.
