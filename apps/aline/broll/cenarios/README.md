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
| `dna-helice.mp4` | hélice de DNA dourada girando, fundo escuro, 6s, 720x1280 | não tem tela: é fecho de vídeo |

As coordenadas estão em `telas.json`, já medidas. Não precisa achar de
novo: a câmera é travada nos dois e a tela não anda um pixel do primeiro
ao último quadro.

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
