# O cenário se gera uma vez, a tela se troca sempre

Sem pessoa reconhecível em cena, então **não gasta crédito**: sai no
ilimitado do site.

E gasta **uma vez só**. O clipe do aparelho é cenário: mesa, luz, tablet ou
monitor com a tela vazia. A tela é um retângulo, e retângulo se troca no
render quantas vezes quiser. Área genética hoje, plano alimentar amanhã,
scanner da saúde depois: o mesmo clipe serve a todos, e o que muda é um
arquivo HTML em `telas/`.

A regra que manda aqui é a mesma que já está em todos os outros prompts:
**gerador não escreve tela**. Ele borra ícone, inventa letra e troca
número, e uma tela sua com dado inventado é problema de outra ordem. A
área do paciente não pode ser gerada. Ela tem que ser a sua imagem real,
colada por cima.

São dois caminhos. O primeiro dá imagem nítida e legível, o segundo é o
mais rápido.

---

## Caminho 1, o que fica bom: gerar o tablet com a tela vazia

O gerador faz o tablet, a mesa e a luz. A tela sai num cinza liso e chapado
de propósito, e a sua captura entra por cima no render, com o recorte
exato da tela. Como a câmera é travada e o tablet não se mexe, a colagem
fica na mesma posição do primeiro ao último quadro e ninguém percebe.

Me manda o clipe gerado mais o print da área do paciente, e eu faço a
colagem aqui.

```
SCENE CONTEXT
A tablet standing on a desk in a bright modern consulting room, screen facing the camera, no people.

LOCATION MAP
A clean light wooden desk against a softly blurred consulting room. The tablet sits upright in a slim matte stand, centred, straight on, its screen square to the camera and filling a good part of the frame. A plain ceramic cup of coffee to one side and a small green plant to the other, both slightly out of focus.

OPTICS
50mm equivalent, shallow depth of field, the tablet screen in sharp focus and the room falling off softly behind it.

CAMERA
Completely static, locked off on a tripod. No pan, no tilt, no push in, no zoom, no handheld drift.

ACTION
Nothing in the scene moves except the ambience: thin steam rising slowly from the cup, one leaf of the plant shifting very slightly, and the daylight on the desk changing almost imperceptibly. The tablet itself is perfectly still for the whole shot.

LIGHTING
Soft even daylight from a large window in front of the tablet, warm neutral grade, low contrast. No hard reflection and no glare anywhere on the screen.

SCREEN
The screen is one flat, even, matte light grey, completely blank and uniform from edge to edge. No interface, no icons, no text, no numbers, no charts, no logo, no wallpaper, no glow, no reflection of the room, no fingerprints, no smudges. It never flickers and never changes brightness.

STYLE
Photoreal product cinematography, true to life colours, fine grain, clean and calm.

POSITIVE LOCKS
The tablet keeps exactly the same position, size, angle and shape in every frame, and its screen stays one flat even grey the whole time. The four corners of the screen stay exactly where they are. No hands, no arms, no people, no reflections of people. Vertical 9:16.
```

Duas coisas que valem o cuidado: **câmera travada** e **tela cinza liso**.
São elas que permitem a colagem. Se o tablet andar um pixel que seja, a
captura desliza por cima dele e denuncia a montagem.

---

## O enquadramento, que é o que deu errado na primeira geração

Sem instrução de tamanho o gerador afasta a câmera e o tablet sai pequeno
no meio da mesa. Ele também inclina o tablet, e tela inclinada perde
metade da legibilidade e estraga qualquer colagem por cima.

As três linhas que resolvem, e elas valem para qualquer um dos caminhos
aqui embaixo:

```
FRAMING
Vertical 9:16, the camera close to the tablet. The tablet is centred and fills the frame: its screen occupies at least 85 percent of the frame width, with only a small margin of desk visible around it.

GEOMETRY
The tablet is shot straight on, its screen square and parallel to the camera, flat to the lens. It is not tilted, not angled, not turned, and there is no perspective distortion: the screen reads as a clean rectangle with straight edges and square corners.

CAMERA
Completely static, locked off on a tripod. No pan, no tilt, no push in, no zoom, no handheld drift.
```

Substitua os blocos `FRAMING`, `GEOMETRY` e `CAMERA` do prompt por estes,
ou cole os três no fim do prompt que você já usou.

---

## Caminho 2, o mais rápido: animar a sua própria montagem

Monte antes uma imagem parada com o print já dentro do tablet, no Canva
ou em qualquer mockup, e use essa imagem como **frame inicial** no
Higgsfield. Aí o gerador só anima o que já existe, e a tela continua
sendo a sua.

```
MOTION
Animate this still image with the gentlest possible motion: a very slow push in toward the tablet over the whole shot, no more than a few percent, plus the faintest ambient movement of light across the desk.

LOCKS
The content of the tablet screen stays pixel identical to the source image at all times: the same layout, the same words, the same numbers, the same colours, nothing sliding, nothing scrolling, nothing fading, no new element appearing and no element disappearing. The tablet keeps the same shape and proportion, its edges stay straight and its corners stay square. No hands, no arms, no people enter the frame. No new objects appear on the desk. Photoreal, true to life colours, no stylisation. Vertical 9:16.
```

É mais rápido e mais barato, mas o gerador tende a "respirar" em cima do
texto da tela quando o zoom anda, e letra pequena treme. Se a sua área do
paciente tem tabela ou valor pequeno, vá pelo caminho 1.

---

## Em qualquer um dos dois

Duração mais curta disponível, 9:16, resolução máxima, **"enhance prompt"
desligado**, sem áudio. Duas gerações e fica com a melhor.

E antes de publicar: **nenhum dado real de paciente na tela**. Nome,
data de nascimento, CPF e telefone saem, ou a captura é de um cadastro
fictício. Vale o mesmo selo dos outros: "Caso clínico ilustrativo ·
paciente fictícia".


---

# A mesa do escritório, com o monitor

Mesmo princípio do tablet, em outro aparelho: a tela sai vazia e recebe a
tela real por cima. Serve pra mostrar o software como quem atende vê.

O monitor é deitado e o reel é em pé, então o enquadramento põe o monitor
nos dois terços de cima e deixa a mesa embaixo. Sobra faixa livre pra
legenda, que é o que o motor de edição procura.

## Versão 1, a mesa sem ninguém

```
SCENE CONTEXT
The point of view of someone sitting at their own desk in a consulting room, looking at their computer monitor. No people in frame.

LOCATION MAP
A wide light wooden desk seen from the chair behind it. A slim modern monitor stands centred on the desk, its screen facing the camera. On the desk, in soft focus: a closed notebook, a pen, a plain ceramic cup and a small green plant. Behind the monitor, an empty upholstered armchair for the patient, softly out of focus, and beyond it a calm consulting room wall.

FRAMING
Vertical 9:16. The monitor occupies the upper two thirds of the frame and its screen fills at least 80 percent of the frame width. The near edge of the desk fills the lower part of the frame, uncluttered.

GEOMETRY
The monitor is seen straight on, its screen square and parallel to the camera, flat to the lens. It is not tilted, not angled, not turned, and there is no perspective distortion: the screen reads as a clean rectangle with straight edges and square corners.

OPTICS
35mm equivalent, the screen in sharp focus, the room behind falling off softly.

CAMERA
Completely static, locked off on a tripod at seated eye height. No pan, no tilt, no push in, no zoom, no handheld drift.

ACTION
Nothing in the scene moves except the ambience: thin steam rising slowly from the cup, one leaf of the plant shifting very slightly, and the daylight changing almost imperceptibly across the desk.

LIGHTING
Soft even daylight from a large window behind the camera, warm neutral grade, low contrast. No hard reflection and no glare anywhere on the screen.

SCREEN
The screen is one flat, even, matte light grey, completely blank and uniform from edge to edge. No interface, no icons, no text, no numbers, no charts, no logo, no wallpaper, no glow, no reflection of the room, no fingerprints, no smudges. It never flickers and never changes brightness.

STYLE
Photoreal cinematography, true to life colours, fine grain, calm and premium.

POSITIVE LOCKS
The monitor keeps exactly the same position, size, angle and shape in every frame, and its screen stays one flat even grey the whole time. The four corners of the screen stay exactly where they are. No hands, no arms, no people, no reflections of people. Vertical 9:16.
```

## Versão 2, com a paciente na poltrona

Igual à de cima, trocando estes dois blocos. A paciente nunca é
reconhecível: é nuca e ombro, fora de foco, atrás do monitor.

```
LOCATION MAP
A wide light wooden desk seen from the chair behind it. A slim modern monitor stands centred on the desk, its screen facing the camera. On the desk, in soft focus: a closed notebook, a pen, a plain ceramic cup and a small green plant. Behind the monitor and well beyond it, a patient sits in an upholstered armchair, seen only as a soft out of focus shape at the edge of the frame, and beyond her a calm consulting room wall.

FOREGROUND AND BACKGROUND
The patient is only a blurred silhouette far behind the monitor, strongly out of focus, never sharp, never recognisable: no face, no features, no eyes, never looking at the camera. She sits still and does not move. She is dressed in plain neutral clothes. The monitor and the desk stay in sharp focus and she stays soft.
```

Vai no ar com o selo **"Caso clínico ilustrativo · paciente fictícia"**,
como os outros. E a mesma regra de sempre: nenhum dado real de paciente
na tela.

---

# Sobre a duração

O clipe gerado é curto, cinco segundos. Isso não limita o vídeo final.

Como a cena é quase parada, ela **repete sem emenda aparente**: o clipe
corre pra frente, volta de trás pra frente e corre de novo, o que rende
vinte, trinta segundos do mesmo cenário. O que muda ao longo do tempo é a
tela, que rola sozinha, e é isso que o olho segue.

Ou seja: um crédito de cenário, e o tempo que o roteiro pedir.


---

# Terceiro cenário: o tablet com chá e livros

O que muda em relação ao primeiro tablet não é o aparelho, é a hora do
dia. Mesa de madeira escura, luz quente de fim de tarde, pilha de livros
ao lado e uma xícara de chá com vapor. Serve pra conteúdo de rotina,
longevidade e sono, onde o consultório frio não combina.

O vapor do chá é o que dá vida: é o único movimento do plano, e foi ele
que salvou o clipe do monitor de parecer foto parada.

```
SCENE CONTEXT
A tablet standing on a wooden table at the end of the afternoon, screen facing the camera, no people.

LOCATION MAP
A dark wooden table against a calm softly blurred room. The tablet sits upright in a slim matte stand, centred. To one side, a short stack of three hardcover books lying flat with a small green plant on top of them. To the other side, a plain ceramic cup of herbal tea with thin steam rising from it. Behind, a bookshelf far out of focus.

FRAMING
Vertical 9:16, the camera close to the tablet. The tablet is centred and fills the frame: its screen occupies at least 80 percent of the frame width, in the upper two thirds. The near edge of the table fills the lower part of the frame, uncluttered.

GEOMETRY
The tablet is shot straight on, its screen square and parallel to the camera, flat to the lens. It is not tilted, not angled, not turned, and there is no perspective distortion: the screen reads as a clean rectangle with straight edges and square corners.

OPTICS
50mm equivalent, shallow depth of field, the tablet screen in sharp focus and everything behind it falling off softly.

CAMERA
Completely static, locked off on a tripod. No pan, no tilt, no push in, no zoom, no handheld drift.

ACTION
Nothing in the scene moves except the ambience: thin steam rising slowly and continuously from the cup of tea, one leaf of the plant shifting very slightly, and the warm light changing almost imperceptibly across the wood. The tablet, the books and the cup are perfectly still for the whole shot.

LIGHTING
Warm late afternoon light coming in low from one side and bounced back soft from the front, so the scene is warm but nothing casts a hard shadow and there is no glare anywhere on the screen. Low contrast, cosy, calm.

SCREEN
The screen is one flat, even, matte light grey, completely blank and uniform from edge to edge. No interface, no icons, no text, no numbers, no charts, no logo, no wallpaper, no glow, no reflection of the room, no fingerprints, no smudges. It never flickers and never changes brightness.

BOOKS
The books are plain hardcovers in muted colours, closed and stacked flat. Their covers and spines carry no readable text, no titles, no author names, no logos: only soft blurred marks where lettering would be.

STYLE
Photoreal cinematography, true to life colours, fine grain, warm and calm, like a quiet corner at the end of the day.

POSITIVE LOCKS
The tablet keeps exactly the same position, size, angle and shape in every frame, and its screen stays one flat even grey the whole time. The four corners of the screen stay exactly where they are. The steam is thin and light, never a cloud. No hands, no arms, no people, no reflections of people, no cat, no candle, no fire. Vertical 9:16.
```

## A variação da noite, se quiser duas

Sem gastar nada a mais, dá pra ter o mesmo canto em outra hora. Troque
só o bloco `LIGHTING`:

```
LIGHTING
Warm lamp light at night from a single soft source beside the table, bounced back gently from the front so nothing on the scene casts a hard shadow and there is no glare anywhere on the screen. The room behind is dim and calm. Low contrast, cosy.
```

## Por que o bloco dos livros existe

Lombada de livro é texto, e texto é onde o gerador inventa. Sem a trava,
ele escreve títulos tortos e nomes de autor que não existem, e isso
aparece no primeiro quadro. Com ela, a lombada vira marca borrada, que é
como a gente já lida com rótulo, tela e laudo em todo o resto.

## Depois de gerar

Manda o clipe que eu meço os cantos da tela e guardo em `cenarios/`, junto
com os outros dois. Aí ele passa a servir a qualquer tela de `telas/`,
para sempre, sem novo crédito.
