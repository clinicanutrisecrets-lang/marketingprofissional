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

## A tela final

Os dois terminam na mesma tela, `telas/desafio-fim.html`, renderizada a
1080x1920 e entrando por cima do vídeo com meio segundo de fade. Ela
existe porque quatro linhas de ASS não davam conta: o da cozinha termina
no meio da frase ("...ainda está bem ali inseguro de como"), e mesmo o
outro, que tem chamada falada, não pode depender de a pessoa ouvir até o
fim.

O que está escrito nela **sai da fala dela nos dois vídeos**, nada é
promessa inventada: os seis dias de segunda a sábado, o paciente real que
pode ser ela mesma, exame e sintoma e genética e estilo de vida na mesma
página, dieta e suplementação com a justificativa do lado, marketing
ético e posicionamento, e o "não é protocolo, é autonomia".

```
6 DIAS · DE SEGUNDA A SÁBADO
Meu consultório de precisão
   1  Um paciente real, do começo ao fim
   2  Exame, sintoma, genética e estilo de vida na mesma página
   3  Dieta e suplementação, cada parte com a justificativa
   4  Marketing ético, comunicação e posicionamento
Não é para ser protocolo. É para você ter autonomia.
VEM PARA O DESAFIO
clique no link abaixo
@NUTRI_SECRETS
```

No JSON é `"cartao": {"segundos": 6.5, "imagem": "tela-desafio-fim.png"}`.
Com imagem, o ASS não escreve nada no fim: quem manda é o PNG. Sem
imagem, o script volta a desenhar a chamada em quatro linhas, que serve
pra teste rápido.

**A palavra "gratuito" não entra em texto nenhum.** Nem no título, nem na
legenda, nem na tela final.

No vídeo do escritório ela fala "o meu software que eu vou liberar
gratuito durante o desafio" aos 2:18. Texto a gente controla, áudio não —
então a palavra é **cortada do vídeo**, com imagem e som juntos, em
`"cortes": [[138.05, 138.66]]`. São 0,6 segundo; a frase fica "o meu
software que eu vou liberar durante o desafio" e o corte passa como um
corte seco comum. Conferido transcrevendo o resultado. A transcrição é
reancorada sozinha, senão toda a legenda depois do corte ficaria
adiantada.

## O enquadramento

O padrão é `"modo": "cheio"`: o vídeo do celular é 9:16 e ocupa os
1080x1920 inteiros, sem cortar nada. O texto mora por cima, e a
legibilidade vem de halo — a mesma frase desenhada duas vezes, a de trás
preta com `bord28 blur18`. Halo e não retângulo porque o escuro segue a
forma da letra e a cena continua aparecendo por baixo.

Existe também `"modo": "faixa"`, que encolhe o vídeo pra uma tira quase
quadrada no meio (`recorte 720x707 a partir de y=200`, faixa `1080x1060`
em `y=470`) e põe o texto no fundo de marca, sem halo. Dá mais respiro ao
texto, mas corta o alto do quadro e a barriga — **ela não quis**, e com
razão: o enquadramento dela já é fechado, cortar de novo aperta.

Se um dia voltar a usar o modo faixa, o `y=200` não é chute: o rosto dela
ocupa de y≈230 a y≈820 nos 1280 de altura nos dois vídeos. Testar com três
quadros espalhados antes de renderizar é o que evita descobrir o corte
errado depois de meia hora de render.

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
