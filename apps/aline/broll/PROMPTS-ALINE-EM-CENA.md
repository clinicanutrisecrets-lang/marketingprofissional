# Prompts de B-roll com a Aline em cena

Cada bloco é **inteiro**. Copia do começo ao fim, cola no Higgsfield,
gera. A parte que se repete já está escrita dentro de cada um.

Estes **gastam crédito**: rosto em cena precisa de Soul ID. Os que não
gastam estão em `PROMPTS-COZINHA.md` e no fim de `BIBLIOTECA-CLIPES.md`.

Antes de apertar o botão, em qualquer um: duração mais curta disponível,
9:16, resolução máxima, **"enhance prompt" desligado**, sem áudio. Duas
gerações de cada e fica com a melhor.

---

## Duas coisas mudaram, e é por isso que a leva anterior saiu errada

**A pele.** Dizer "30 anos" não bastou porque o prompt antigo dizia, na
mesma frase, que o rosto tinha que bater com a referência **exatamente**.
A referência é uma foto sua real, com as marcas que o gerador copiou
direitinho. Ou seja: a trava de identidade estava brigando com a trava de
idade, e a identidade ganhou. Agora está escrito ao contrário, e em três
camadas:

1. A pele é descrita **no começo**, em positivo, dizendo como ela **é** e
   não o que ela não tem. Gerador obedece descrição, ignora negação.
2. A trava de identidade virou "óculos, cabelo, formato do rosto e roupa
   batem com a referência", e logo em seguida, explícito: **a pele é
   renderizada mais lisa e mais nova do que a textura da referência**.
3. A luz mudou. Janela de lado esculpe a pele e é isso que cria marca e
   sombra: toda sombra lateral vira relevo. Agora é luz frontal difusa e
   grande, com preenchimento por baixo, que é como se fotografa campanha
   de skincare. E a lente subiu de 50mm pra 85mm, que achata e favorece.

**A boca.** Todos saíram falando porque eu pedi "speaks to the camera" em
todos. Para b-roll isso atrapalha: sua narração é gravada depois e o lábio
nunca bate. Agora todos são **mudos**, com lábio fechado e parado.

> Se algum dia você quiser um que fale de verdade na câmera, troque a
> linha `Her lips stay closed and still for the whole shot, she does not
> speak, no talking, no mouth movement, no dialogue.` por
> `She speaks calmly to the camera with natural pauses.` Só essa linha.

**A expressão.** Rosto mudo sem instrução sai vazio, e rosto vazio parece
foto de documento. Então todo prompt agora tem um bloco `EXPRESSION` com
uma das quatro que você pediu. Já vem uma escolhida em cada um, pensando
na cena. Pra trocar, substitua a linha do bloco `EXPRESSION` por outra
desta lista:

**concentrada**
```
Her expression is focused and absorbed in what she is doing, eyes steady, brows relaxed, lips together.
```
**sorrindo**
```
Her expression is warm and pleased, a soft closed-lip smile that reaches her eyes, lips together.
```
**pensativa**
```
Her expression is thoughtful, as if turning an idea over, her eyes lowering for a moment and then lifting again, lips together.
```
**serena**
```
Her expression is calm and serene, unhurried and at ease, eyes soft, lips together.
```

Vale gerar a mesma cena com duas expressões diferentes: sai como se
fossem dois planos, e custa o mesmo que gerar duas variações da mesma.

**O jaleco.** Todo prompt de jaleco agora traz o bordado escrito por
extenso, `ALINE QUISSAK`, em duas partes do prompt: no figurino e na
trava de texto. A trava antiga dizia que nada em quadro podia ser
legível, e era por isso que o gerador escrevia qualquer nome ali: ele
precisava pôr alguma coisa e eu não tinha dito o quê. Agora diz.

> Texto em vídeo gerado erra com frequência mesmo assim. Confira o
> bordado em cada geração antes de usar, letra por letra. Nome curto
> ajuda, por isso está só o nome, sem CRN e sem "nutricionista".

**As joias e a roupa.** Entrou um bloco `WARDROBE` em todos, e ele diz
em letras claras: nada de pérola, broche, colar grande, echarpe, xale,
estampa floral nem ombreira. No máximo brinco de pressão pequeno e uma
corrente fina. Sem essa instrução o gerador enfeita sozinho, e o que ele
escolhe envelhece dez anos.

---

## 1. Frontal, blusa creme

O plano mais escasso. No vídeo do Lótus o mesmo trecho de sete segundos
teve que servir de gancho, de apresentação e de chamada final, porque não
existe outro.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is sitting at her consulting room desk, wearing a cream silk blouse, facing the camera.

ACTION
She sits still and looks into the lens, calm and warm, her lips closed. She blinks naturally, tilts her head very slightly once, lowers her eyes to the desk for a moment, then looks back into the lens. Her hands rest on the desk, still.

EXPRESSION
Her expression is warm and pleased, a soft closed-lip smile that reaches her eyes, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast, gentle sheen on the cheekbones, bookshelf softly blurred behind her.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never a wide smile, never laughing, teeth not visible. Natural blinks, eyebrows calm. Nothing on any screen, paper or label is readable, no text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 2. Frontal, jaleco branco

Mesmo cenário e mesma luz do 1. É o figurino que faz parecer outro dia de
gravação.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is sitting at her consulting room desk, wearing her open white lab coat over a dark blouse, facing the camera.

ACTION
She sits still and looks into the lens, calm and warm, her lips closed. She blinks naturally, tilts her head very slightly once, lowers her eyes to the desk for a moment, then looks back into the lens. Her hands rest on the desk, still.

EXPRESSION
Her expression is calm and serene, unhurried and at ease, eyes soft, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast, gentle sheen on the cheekbones, bookshelf softly blurred behind her.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame.

WARDROBE
A clean modern white lab coat with the name ALINE QUISSAK embroidered in small dark letters on the left chest, spelled exactly like that, and nothing else written anywhere on the coat. Underneath, simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never a wide smile, never laughing, teeth not visible. Natural blinks, eyebrows calm. The only readable text anywhere in frame is the embroidery ALINE QUISSAK on her lab coat, spelled exactly like that. Nothing on any screen, paper or label is readable, no other text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 3. Frontal, blazer verde-escuro

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is sitting at her consulting room desk, wearing a dark green blazer over a light top, facing the camera.

ACTION
She sits still and looks into the lens, calm and warm, her lips closed. She blinks naturally, tilts her head very slightly once, lowers her eyes to the desk for a moment, then looks back into the lens. Her hands rest on the desk, still.

EXPRESSION
Her expression is thoughtful, as if turning an idea over, her eyes lowering for a moment and then lifting again, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast, gentle sheen on the cheekbones, bookshelf softly blurred behind her.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never a wide smile, never laughing, teeth not visible. Natural blinks, eyebrows calm. Nothing on any screen, paper or label is readable, no text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 4. Em pé, jaleco, no corredor da clínica

Todo plano seu hoje é sentada. Um plano em pé abre reel de outro jeito e
serve de passagem entre dois assuntos.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is standing in the corridor of a modern clinic in a white coat, one hand holding a closed folder against her chest.

ACTION
She stands still and looks into the lens, calm and confident, her lips closed. She blinks naturally and shifts her weight once, very slightly. She does not walk.

EXPRESSION
Her expression is calm and serene, unhurried and at ease, eyes soft, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Low contrast, neutral grade, the corridor receding softly blurred behind her.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame.

WARDROBE
A clean modern white lab coat with the name ALINE QUISSAK embroidered in small dark letters on the left chest, spelled exactly like that, and nothing else written anywhere on the coat. Underneath, simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never a wide smile, never laughing, teeth not visible. Natural blinks, eyebrows calm. The only readable text anywhere in frame is the embroidery ALINE QUISSAK on her lab coat, spelled exactly like that. Nothing on any screen, paper or label is readable, no other text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 5. Escrevendo a prescrição

Você fala de conduta o tempo todo e não tem nenhuma imagem de conduta
acontecendo. Aqui a mão é o assunto, e é onde o gerador mais erra:
**gere duas e confira dedo por dedo antes de usar.**

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
Close on her hands writing on a prescription pad at her desk, her face visible and slightly out of focus behind her hands.

ACTION
She writes two lines, pauses, raises her eyes to the camera for a moment with her lips closed, then goes back to writing. The pen moves continuously and never leaves an unnatural mark.

EXPRESSION
Her expression is focused and absorbed in what she is doing, eyes steady, brows relaxed, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field on the pad, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast.

FRAMING
Vertical 9:16, the pad in the lower half of the frame, her face in the upper third, clear uncluttered space between them.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. Never a wide smile, never laughing, teeth not visible. Natural blinks. Both hands are visible and anatomically correct, five fingers each, nails short and unpainted, no rings, and the pen stays whole in her hand at all times. Nothing on the pad or on any screen or label is readable, no text, no numbers. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 6. Segurando o laudo genético

É a imagem da sua tese e ela não existe no banco.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is at her desk holding a printed multi-page report in both hands, reading it.

ACTION
She reads the pages for a moment, turns one page, then lowers the report slightly and looks into the lens with a small nod, her lips closed, as if she has just found something.

EXPRESSION
Her expression is thoughtful, as if turning an idea over, her eyes lowering for a moment and then lifting again, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast, background softly blurred.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, the report held low near the desk so the middle of the frame stays clear.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never laughing, teeth not visible. Natural blinks. Her hands are anatomically correct, five fingers each, nails short and unpainted. The pages are plain printed sheets with unreadable blurred lines of text, no charts, no logos, no numbers, no colour highlights. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 7. Ensinando de pé, apontando para uma tela

É o plano dos anúncios do imersivo, onde você é professora e não nutri
atendendo.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
She is standing beside a large wall screen in a bright teaching room, turned three quarters toward the camera, one hand raised toward the screen.

ACTION
She looks into the lens with her lips closed, gestures once toward the screen with an open hand, then brings the hand back down and looks at the lens again. Confident and clear, the posture of someone teaching a room of colleagues.

EXPRESSION
Her expression is warm and pleased, a soft closed-lip smile that reaches her eyes, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Low contrast, neutral grade, the screen glowing softly out of focus behind her.

FRAMING
Medium shot, vertical 9:16, her head in the upper third with headroom above it, and clear uncluttered space from her chin down to the bottom of the frame.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never laughing, teeth not visible. Natural blinks. Her hands are anatomically correct, five fingers each. The screen shows only soft abstract shapes and colour, completely unreadable, no text, no charts, no letters. No other people in frame. Static framing, no zoom, no camera move.
```

---

## 8. Escutando a paciente, plano por trás do ombro

Mostra consulta sem expor ninguém: a paciente é só uma nuca desfocada.
Vai no ar com o selo **"Caso clínico ilustrativo · paciente fictícia"**,
como os outros.

```
SUBJECT
A 30 year old nutritionist with glasses. Her skin is smooth, firm and luminous, one even tone from hairline to jaw, a fresh dewy finish on the cheekbones, the soft fine texture of a skincare campaign. Smooth forehead, smooth rested area around the eyes, smooth cheeks, firm defined jawline, smooth neck. Young adult skin in her early thirties.

SCENE
Over the shoulder of a seated patient, foreground and out of focus, looking toward the nutritionist across the desk.

ACTION
The nutritionist listens with her lips closed, nods slowly twice, and holds a calm attentive expression. The patient in the foreground does not move.

EXPRESSION
Her expression is calm and serene, unhurried and at ease, eyes soft, lips together.

OPTICS
85mm equivalent portrait lens, shallow depth of field, soft rendering.

LIGHTING
Soft even beauty light, one large diffused source just above the camera and a soft fill from below, so nothing on her face casts a hard shadow. Warm neutral grade, low contrast.

FRAMING
Vertical 9:16, the nutritionist's head in the upper third, the blurred shoulder filling the lower left corner only, the rest of the lower frame clear.

WARDROBE
Modern, young and minimal. Simple clean lines. No jewellery beyond small plain stud earrings and at most one fine delicate chain. No pearls, no pearl necklace, no pearl earrings, no brooch, no large or ornate jewellery, no scarf, no shawl, no floral print, no shoulder pads, nothing that reads as older or formal dress.

LOCKS
Her glasses, hair, face shape and clothing match the reference, and her hair keeps the same length and shape on both sides through the whole shot. Her skin is rendered clear and even in every single frame, younger and smoother than any texture in the reference image: no freckles, no sun spots, no age spots, no pigmentation patches, no fine lines, no wrinkles, no crow's feet, no nasolabial folds, no under eye shadows, no redness, no visible pores, no blemishes. Her lips stay closed and still for the whole shot, she does not speak, no talking, no mouth movement, no dialogue. At most a slight closed-lip smile, never laughing, teeth not visible. Natural blinks. The patient in the foreground is only a blurred shoulder and the back of a head, never their face, never recognisable. Nothing on any screen, paper or label is readable, no text, no numbers. Static framing, no zoom, no camera move.
```

---

## Se ainda vier marca na pele

Duas saídas, nessa ordem.

**Trocar a foto de referência.** Se a referência do Soul ID for uma foto
com luz de lado, o gerador copia cada relevo dela, e o prompt fica
empurrando contra a imagem. Referência boa é rosto de frente, luz suave e
frontal, sem sombra dura no nariz nem na bochecha.

**Deixar comigo.** O motor de edição suaviza a pele no render, em toda
cena com você em quadro, sem CapCut e sem custo de crédito. Está ligado
por padrão nos clipes do banco em que você aparece e pode ser ligado em
qualquer clipe novo. É o mesmo tratamento que foi usado no vídeo do Lótus.

---

## Por que cada trava está ali

Não precisa ler pra usar. É só pra você saber que nenhuma linha é enfeite.

- **pele descrita em positivo e no começo**: gerador obedece descrição e
  ignora negação. "Sem mancha" é fraco, "pele lisa e uniforme" é forte.
- **mais nova e mais lisa que a referência**: sem essa frase, a trava de
  identidade manda copiar a foto, marca inclusive.
- **luz frontal difusa, 85mm**: luz de lado esculpe e envelhece, lente
  curta em close deforma. Isso é metade do problema da pele.
- **lábio fechado e parado**: a narração é gravada depois, então boca
  falando não bate com nada.
- **cabelo igual dos dois lados**: é o primeiro detalhe a derivar.
- **dente não aparece**: sem isso sai dente de propaganda, e o sorriso
  largo gerado deforma a boca na pausa. Aconteceu no vídeo da menopausa.
- **nada legível**: laudo ou tela com número inventado num vídeo seu é
  problema de outra ordem.
- **quadro parado**: com movimento de câmera o rosto deriva mais rápido.
- **cabeça no terço superior, vão livre embaixo**: essa é do meu motor.
  Ele procura a faixa vazia do quadro pra pôr a legenda; sem faixa vazia
  a legenda desce pro rodapé, que é onde a interface do Instagram cobre.

E a regra que vale pra todos: **com pessoa em cena, clipe curto**. Acima
de uns 6 segundos o rosto começa a derivar, e é por isso que os clipes
multi-cena de 20 segundos só valem pra comida e cenário.
