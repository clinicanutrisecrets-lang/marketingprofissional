# Biblioteca de clipes

Todo clipe gerado serve a qualquer roteiro. O motor (`montar-video-h.py`)
aceita uma lista de `clipes` de fontes diferentes, então dá pra fechar uma
receita com a cena do laboratório, ou ilustrar "adoro cozinhar" com o
preparo do mousse.

Os arquivos ficam em `broll/video/`, fora do Git (o repositório é
público). O mapa de nomes está em `video/biblioteca.json`.

## O acervo, em 9:16

| nome | dur | o que tem |
|---|---|---|
| `centrifuga` | 20s | centrífuga (0-9s), micro+monitor (10-16s), cozinha (17-19s) |
| `micro` | 20s | monitor atravessado (0-5s), **microscópio (6-19s)** |
| `lab` | 15s | bancada com laudo, chá, bioimpedância, cozinha com bowl |
| `bolo` | 20s | cozinha, ela atrás do bolo (0-9s), depois zoom no rosto |
| `mousseA` | 19s | preparo: cacau, melado, canela, leite, verde virando marrom |
| `mousseB` | 20s | ingredientes, macro do cacau, abacate com azeite, finalização |
| `aveia1` | 15s | aveia, chia e melado, leite caindo, mistura |
| `aveia2` | 15s | geladeira, manga, nozes, colherada |
| `aveia3` | 15s | aveia caindo, leite, mistura, manga |
| `consult1` | 12s | consultório, blusa creme, laudo na mesa |
| `consult2` | 6s | consultório, ela ao computador |
| `consult3` | 6s | consultório; **os 3s iniciais mostram o verso do monitor** |

Total: ~183s de material aproveitável.

## O que isso resolve

Antes eu esticava um clipe curto com câmera lenta pesada pra alcançar a
duração da narração — o microscópio ficava parado tempo demais e a comida
não batia com a fala da receita. Cruzando o acervo, o "Meu dia" saiu a
**velocidade natural**, e as receitas caíram de 0,51× para ~0,80×.

## Trechos a evitar

- `micro` 0-6s: o monitor atravessa o quadro
- `consult3` 0-3s: verso do monitor
- `centrifuga` 10-16s: micro em zoom exagerado
- `centrifuga` 17-19s: enquadramento da cozinha que ela não gostou
- `consulta.mp4` (16:9) 40,5-44s: o sorriso que a IA deformou
- `aveia1` 13,8-15s: a mão entrando pra fechar a tampa
- `aveia2` 3,0-4,8s: quadro escuro e a mão abrindo a tampa
- `bolo`: é torta de chocolate. Serve de dia a dia, nunca de
  ilustração de outra receita — apareceu no reel da mousse e no da
  aveia e as duas vezes foi a primeira coisa que ela viu

## O que falta gerar

Os dois reels de receita fecham com o material que existe, mas parte do
tempo é coberta por laboratório e consultório. Isso não é remendo — a
narração nesses trechos é genética, não receita — só que hoje a proporção
está em ~30% na mousse e ~37% na aveia. Um clipe de 20s por receita
derruba isso quase a zero.

Regra 17 do guia: sem pessoa em cena não há identidade pra derivar, então
um clipe único de 20s com quatro cenas rende quatro blocos de montagem
por um gasto só. 9:16.

### Mousse de abacate — o que não existe hoje

Não temos: abacate sendo retirado da casca, canela (ela fala "vai com
canela" e só existe o pau de canela desfocado no plano de ingredientes),
e a colher servindo em duas taças.

```
SCENE CONTEXT
Four short shots of a chocolate avocado mousse being prepared and served, food only, no people.

LOCATION MAP
A clear straight-sided glass on a dark wooden kitchen counter. Background: blurred neutral kitchen. Camera at glass height, straight on. Light from a window on the left.

FORMAT MODE
Four separate shots with hard cuts between them, no dissolves. Same counter, same light and same lens in all four.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
Scene 1 (0-5s): a spoon scoops the flesh out of half a ripe avocado and the smooth green flesh falls into the glass.
Hard cut.
Scene 2 (5-10s): extreme macro of a cinnamon stick lying on the counter, and a small measured spoonful of finely ground cinnamon, about half a level teaspoon, falls beside it in a fine dust.
Hard cut.
Scene 3 (10-15s): the finished dark chocolate mousse in the glass, a spoon presses its surface and lifts, leaving a soft glossy peak.
Hard cut.
Scene 4 (15-20s): two identical glasses of finished mousse side by side on the counter, a spoon rests against one of them.

PHYSICS
The avocado flesh is dense and falls in soft heavy pieces, never splashing. The cinnamon falls as a fine dust, never as a heap. The mousse is thick and holds the mark of the spoon.

LIGHTING
Soft afternoon window light from the left, gentle sheen on the glossy surface.

STYLE
Photoreal food cinematography, visible natural texture, true to life colors, fine grain.

POSITIVE LOCKS
The amount of cinnamon is modest, about half a level teaspoon, never a heap, never covering the surface. The cinnamon is finely ground powder plus one whole stick, never loose bark chips. The mousse stays thick like a dense mousse at all times, never liquid. Only the spoon is visible, entering from the top of the frame, no hands, no arms, no people. No text or labels.
```

### Overnight oats — o que não existe hoje

Não temos: macro da textura do gel de aveia com chia, macro da manga em
cubos e macro das nozes quebradas. O plano da geladeira existe mas dura
3s e é o único.

```
SCENE CONTEXT
Four short shots of overnight oats, food only, no people.

LOCATION MAP
A clear glass mason jar on a light wooden kitchen counter, blurred neutral background. Camera at jar height, straight on. Soft morning window light from the left.

FORMAT MODE
Four separate shots with hard cuts between them, no dissolves. Same counter, same light and same lens in all four.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
Scene 1 (0-5s): extreme macro of the set oats, the surface thick and creamy with chia seeds suspended all through it, a spoon presses in and lifts, leaving a soft trail.
Hard cut.
Scene 2 (5-10s): extreme macro of about two tablespoons of small ripe mango cubes falling onto the creamy surface and settling.
Hard cut.
Scene 3 (10-15s): extreme macro of about one tablespoon of coarsely broken walnut pieces falling beside the mango.
Hard cut.
Scene 4 (15-20s): the closed jar with its metal lid on, sitting on the counter, condensation on the glass, the layers visible through the side.

PHYSICS
The oats are thick and set, never runny, and hold the mark of the spoon. The chia seeds are dispersed evenly through the cream, never in a separate layer at the bottom. The mango cubes and the walnut pieces land and stay on the surface, they do not sink.

LIGHTING
Soft morning window light from the left.

STYLE
Photoreal food cinematography, visible natural texture, true to life colors, fine grain.

POSITIVE LOCKS
The amount of mango is modest, about two tablespoons of cubes, never filling the jar. The walnuts are coarsely broken pieces, never whole nuts, about one tablespoon. The chia is dispersed in the cream, no separate layers. Only the spoon is visible, entering from the top of the frame, no hands, no arms, no people. No text or labels.
```
