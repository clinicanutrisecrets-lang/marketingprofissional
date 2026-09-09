# Prompts de B-roll com a Aline em cena

Estes são os que **gastam crédito**: cena com o rosto dela precisa de Soul
ID e de modelo que aceita frame inicial. Cena sem o rosto sai no ilimitado
do site — a última seção lista as que não valem crédito nenhum.

Ordenados pelo que a biblioteca não tem. O item 1 é o mais urgente por
uma margem larga.

---

## O bloco de travas que vai em todos

Cole no fim de cada prompt, sem editar. Cada linha nasceu de um erro que
já aconteceu.

```
LOCKS
She is 30 years old. Her face, glasses, hair and clothing match the reference exactly, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is smooth and even, with a natural healthy tone, no freckles, no blemishes, no age spots, no redness. Her teeth are natural ivory, slightly warm, never bright white. At most a slight closed-lip smile, never a wide smile, never laughing. Natural blinks, eyebrows move with the sentence. Nothing on any screen, paper or label is readable, no text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

Por que cada uma existe:

- **30 anos** e **pele lisa**: o gerador envelhece o rosto e inventa mancha
  e sarda. Sem essa trava, sobra retoque na edição.
- **cabelo igual dos dois lados**: é o primeiro detalhe a derivar, antes
  mesmo do rosto.
- **dente marfim**: sem isso sai dente de propaganda.
- **sorriso fechado**: o sorriso largo gerado deforma a boca na pausa. Já
  aconteceu no vídeo da menopausa.
- **nada legível**: laudo ou tela com número inventado num vídeo seu é
  problema de outra ordem.
- **quadro parado**: com movimento de câmera o rosto deriva mais rápido.

E mais uma trava de produção, que é minha e não do gerador:

```
FRAMING FOR TEXT
Medium shot, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame. Vertical 9:16.
```

O motor de edição procura a faixa livre do quadro pra pôr a legenda. Se o
plano não tem faixa livre, a legenda acaba no rodapé, que é onde a
interface do Instagram cobre. Pedir o vão na geração resolve na origem.

---

## 1. Frontal falando com a câmera — gere 3 variações

**Por que primeiro**: é o plano mais escasso e o mais caro de faltar. No
vídeo do Lótus o mesmo trecho de 7 segundos teve que servir de gancho, de
apresentação e de chamada final. Com três variações de figurino, cada
vídeo abre diferente.

```
SCENE
A nutritionist sitting at her consulting room desk, speaking directly to the camera as if explaining something to one person.

ACTION
She looks straight into the lens and speaks calmly and warmly, with small nods and natural pauses. Between sentences she glances briefly down at the desk, lips closed, then looks back up at the lens. Her hands rest on the desk, still.

LIGHTING
Soft daylight from a window on her left, warm neutral grade, shallow depth of field, bookshelf blurred behind her.
```

Nas variações troque só isto, mantendo o resto palavra por palavra:
uma com **blusa creme de seda**, uma com **jaleco branco sobre blusa
escura**, uma com **blazer verde-escuro**. Mesmo cenário, mesma luz. É o
figurino que faz parecer dia diferente.

---

## 2. Em pé, jaleco, no corredor da clínica

**Por que**: todo plano dela hoje é sentada. Um plano em pé abre reel de
outro jeito e serve de transição entre dois assuntos.

```
SCENE
A nutritionist in a white coat standing in the corridor of a modern clinic, one hand holding a closed folder against her chest.

ACTION
She stands still and speaks to the camera, calm and confident. She shifts her weight once, very slightly. She does not walk.

LIGHTING
Cool clinical daylight, fluorescent ceiling panels, corridor receding blurred behind her.
```

---

## 3. Escrevendo a prescrição

**Por que**: você fala de conduta o tempo todo e não tem nenhuma imagem de
conduta acontecendo.

```
SCENE
Close on a nutritionist's hands writing on a prescription pad at her desk, her face visible and slightly out of focus behind her hands.

ACTION
She writes two lines, pauses, looks up at the camera for a moment, then goes back to writing. The pen moves continuously and never leaves an unnatural mark.

LIGHTING
Warm desk lamp from the right, soft daylight fill, shallow depth of field on the pad.

HANDS
Both hands are visible and anatomically correct, five fingers each, nails short and unpainted, no rings. The pen stays whole in her hand at all times.
```

O bloco `HANDS` substitui a linha de mãos fora de quadro das travas: aqui
a mão é o assunto, e é onde o gerador mais erra. **Gere duas variações e
confira dedo por dedo antes de usar.**

---

## 4. Segurando o laudo genético

**Por que**: é a imagem da sua tese e ela não existe no banco.

```
SCENE
A nutritionist at her desk holding a printed multi-page report in both hands, reading it.

ACTION
She reads the pages for a moment, turns one page, then lowers the report slightly and looks at the camera with a small nod, as if about to explain what she found.

LIGHTING
Soft daylight from the left, warm neutral grade, shallow depth of field.

PAPER
The pages are plain printed sheets with unreadable blurred lines of text, no charts, no logos, no numbers, no colour highlights.
```

---

## 5. Ensinando, de pé, apontando para uma tela

**Por que**: os anúncios do imersivo são para nutricionistas, e precisam
de você professora, não de você atendendo.

```
SCENE
A nutritionist standing beside a large wall screen in a bright teaching room, turned three quarters toward the camera, one hand raised toward the screen.

ACTION
She looks at the camera while she speaks, gestures once toward the screen with an open hand, then brings the hand back down. Confident and clear, the tone of someone teaching a room of colleagues.

LIGHTING
Bright even room light, the screen glowing softly out of focus behind her.

SCREEN
The screen shows only soft abstract shapes and colour, completely unreadable, no text, no charts, no letters.
```

---

## 6. Escutando a paciente, plano por trás do ombro

**Por que**: mostra consulta sem expor ninguém — a paciente é só uma nuca
desfocada.

```
SCENE
Over the shoulder of a seated patient, foreground and out of focus, looking toward a nutritionist across the desk.

ACTION
The nutritionist listens, nods slowly twice, and answers calmly. The patient in the foreground does not move.

FOREGROUND
The patient is only a blurred shoulder and the back of a head, never their face, never recognisable.

LIGHTING
Soft daylight from the window behind the nutritionist, warm neutral grade.
```

Esse ainda vai no ar com o selo **"Caso clínico ilustrativo · paciente
fictícia"**, como os outros.

---

## Estes NÃO valem crédito

Sem o rosto dela não existe identidade pra derivar, então **não precisa de
Soul ID**: gere no site, no ilimitado, e com quatro cenas encadeadas num
clipe só (regra 17 do guia).

- mãos com pipeta e tubos, close, sem rosto
- mãos abrindo o kit de coleta de saliva
- a balança de bioimpedância acendendo, só o aparelho
- a mesa do consultório vazia, luz da manhã, com a caneta e o bloco

Guarde os créditos para os seis de cima. Um clipe sem rosto que consome
crédito é crédito jogado fora.

---

## Antes de gerar, o checklist do guia

Duração mais curta disponível, 9:16, resolução máxima, um único movimento
de câmera (aqui: nenhum), **"enhance prompt" desligado**, sem áudio. Duas
variações de cada e fica com a melhor. Com pessoa em cena o clipe é
**curto**: acima de uns 6 segundos o rosto começa a derivar, e é por isso
que os multi-cena de 20s só valem para comida e cenário.
