# Variações do overnight oats — 5 coberturas, 5 sinergias

A base (vídeo A: aveia, chia, mel, baunilha, leite de coco) é sempre a
mesma. Muda só a cobertura — e com ela muda o tema do reel. Um vídeo A,
cinco finais: cinco posts.

**Continuidade**: subir o último frame do vídeo A em "Add elements or
references" e usar o bloco `ACTIVE REFERENCES` de cada prompt.

---

## As 5 combinações e o que cada uma entrega

| Cobertura | Sinergia | Tema do reel |
|---|---|---|
| Mirtilo + raspas de limão | antocianinas do mirtilo + flavonoides e vitamina C da raspa | memória e foco |
| Morango + nibs de cacau | vitamina C do morango + ferro não-heme do cacau | cansaço e ferro |
| Abacaxi + pistache | bromelina do abacaxi + proteína e B6 do pistache | digestão e saciedade |
| Kiwi + cranberry | actinidina e vitamina C do kiwi + proantocianidinas da cranberry | sono e microbiota |
| Mamão + ameixa | papaína do mamão + fibra e sorbitol da ameixa | trânsito intestinal |

**A do morango é a mais forte cientificamente**: o morango tem vitamina C
de verdade (~59 mg/100 g) e o nib de cacau tem ferro não-heme relevante
(~13 mg/100 g) — a vitamina C aumenta a absorção desse ferro. É a sinergia
que a manga não sustentava.

---

## Prompt A — só o final (a colherada)

O mais usado: gera só o plano do resultado e emenda no vídeo que já existe.
Trocar o trecho em **negrito**.

```
SCENE CONTEXT
A finished jar of overnight oats topped and served, morning light.

ACTIVE REFERENCES
@image1: the glass jar of overnight oats on the wooden counter. The jar, the counter and the creamy mixture 100% match the reference.

LOCATION MAP
Foreground: the open glass mason jar on a light wooden kitchen counter. Background: blurred neutral kitchen. Camera at jar height, straight on. Light from a window on the left.

FIRST FRAME / BLOCKING
The open jar is already centred in frame, thick set cream visible inside.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
**[COBERTURA]** drop onto the surface from above, then a wooden spoon stirs them gently through the top layer and lifts a thick creamy scoop out of the jar, holding it as a slow drip falls back down.

PHYSICS
The set mixture holds its shape and keeps the mark of the spoon. The topping presses into the surface when it lands. The scoop holds its form, a single thick drip falling back into the jar.

PERFORMANCE
Texture is the subject: chia seeds swollen into translucent gel beads, oats softened and plump, matte creamy surface, **[TEXTURA DA COBERTURA]**.

LIGHTING
Soft warm morning window light from the left, gentle sheen on the cream.

STYLE
Photoreal food cinematography, natural uneven texture, true to life colors, fine grain.

POSITIVE LOCKS
The jar, counter and mixture stay identical to the reference. Only the spoon is visible, no hands, no arms, no people. The mixture stays thick and set, not liquid. No text or labels.
```

### Preencher assim

**1. Mirtilo + raspas de limão**
- ACTION: `Fresh whole blueberries and fine lemon zest curls`
- PERFORMANCE: `glossy deep blue blueberry skins with a natural bloom, bright yellow zest curls`

**2. Morango + nibs de cacau**
- ACTION: `Sliced fresh strawberries and dark cacao nibs`
- PERFORMANCE: `wet glistening strawberry slices showing their seeds, dry matte dark cacao nibs`

**3. Abacaxi + pistache**
- ACTION: `Fresh diced pineapple cubes and chopped green pistachios`
- PERFORMANCE: `translucent juicy pineapple cubes, vivid green pistachio pieces with dry edges`

**4. Kiwi + cranberry**
- ACTION: `Sliced green kiwi rounds and dried cranberries`
- PERFORMANCE: `translucent kiwi slices with visible black seeds, wrinkled deep red dried cranberries`

**5. Mamão + ameixa**
- ACTION: `Fresh diced papaya cubes and sliced dried prunes`
- PERFORMANCE: `soft coral papaya cubes with a wet sheen, dark wrinkled prune slices`

---

## Prompt B — o final completo (geladeira → abrir → cobrir → colherada)

Quando quiser o bloco inteiro, e não só a colherada. Mesmo esquema: trocar
`[COBERTURA]` no CUT 3.

```
SCENE CONTEXT
The finished overnight oats rest in the fridge overnight, then are opened, topped and served the next morning.

ACTIVE REFERENCES
@image1: the closed glass jar of overnight oats on the wooden counter. The jar, the lid, the counter and the mixture 100% match the reference.

LOCATION MAP
CUT 1 is inside a refrigerator, the closed jar on a wire shelf. CUT 2 to CUT 4 are on the same light wooden kitchen counter, camera at jar height, straight on, window light from the left.

FIRST FRAME / BLOCKING
The closed jar already sits on the refrigerator shelf, thick mixture visible through the glass.

FORMAT MODE
Sequence of cuts, no timecodes. Cuts only at the specified points, the camera does not cut on its own.

CUT 1 — The closed jar on the refrigerator shelf, fine condensation beading on the cold glass, cold light dimming as the fridge door closes.
CUT 2 — The same jar on the wooden counter in warm morning light, the metal lid lifts straight up and away, revealing a thick set cream.
CUT 3 — **[COBERTURA]** drop onto the surface from above, then a wooden spoon stirs them gently through the top layer.
CUT 4 — The spoon lifts a thick creamy scoop out of the jar and holds it, a slow drip falling back down.

OPTICS
Extreme close-up throughout, 50mm equivalent, shallow depth of field, no drift mid-segment.

CAMERA
Static locked off in every cut.

PHYSICS
The set mixture holds its shape and keeps the mark of the spoon. The topping presses into the surface when it lands. The scoop holds its form, a single thick drip falling back into the jar.

PERFORMANCE
Texture is the subject: chia seeds swollen into translucent gel beads, oats softened and plump, matte creamy surface, **[TEXTURA DA COBERTURA]**.

LIGHTING
CUT 1: cold refrigerator light. CUT 2 to CUT 4: soft warm morning window light from the left, gentle sheen on the cream.

STYLE
Photoreal food cinematography, natural uneven texture, true to life colors, fine grain.

POSITIVE LOCKS
Same jar, same wooden counter, same window light from the left in every cut after the fridge. Only the lid and the spoon are visible, no hands, no arms, no people. The mixture stays thick and set, not liquid. No text or labels.
```

⚠️ No vídeo B original a IA desenhou mão ao abrir a tampa (4s) e ao jogar
as nozes (7s). Se repetir, gerar de novo ou cortar o trecho na montagem —
o `montar-reel.py` tem o campo `trechos` pra isso.

---

## Ajustes de texto por variação (para a montagem)

Só o miolo do reel muda; abertura e fecho seguem iguais.

| Cobertura | Gancho de abertura | Texto do final |
|---|---|---|
| Mirtilo + limão | acorda sem ***Energia*** e com a memória ruim? | antocianinas · memória |
| Morango + cacau | cansaço que ***não passa***? | vitamina C + ferro do cacau |
| Abacaxi + pistache | come e sente ***peso***? | bromelina · digestão |
| Kiwi + cranberry | dorme mal e acorda ***moída***? | kiwi · sono e microbiota |
| Mamão + ameixa | intestino ***travado***? | papaína + fibra · trânsito |
