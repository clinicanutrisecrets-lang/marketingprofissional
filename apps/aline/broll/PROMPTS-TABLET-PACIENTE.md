# O tablet mostrando a área do paciente

Sem pessoa em cena, então **não gasta crédito**: sai no ilimitado do site.

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
