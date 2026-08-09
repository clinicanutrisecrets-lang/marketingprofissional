# Receita em cenas — Overnight Oats (só comida, sem mão)

Reel de receita montado em plano-a-plano. Cada plano é um clipe curto
gerado separado no site (Seedance 2.5, ilimitado); a sequência vira reel na
montagem. **Nenhuma mão, nenhum braço, nenhuma pessoa em quadro.**

Duração: 8 planos × 5s gerados → cortados em 2-3s cada → reel de ~22s.

---

## A regra de ouro da continuidade

O que faz parecer **uma receita** e não 8 vídeos soltos: repetir **a mesma
descrição de cenário, luz e recipiente** em TODOS os prompts, palavra por
palavra. Sempre o mesmo bloco:

```
in a clear glass mason jar on a light wooden kitchen counter, soft morning
window light from the left, shallow depth of field, blurred neutral
background
```

Se mudar a luz ou a bancada entre planos, o corte "pula" e quebra a
sensação de receita.

---

## O truque das mãos invisíveis

A Aline não quer mão em quadro — e mão é justamente onde a IA erra. Duas
estratégias, e a segunda é a rede de segurança:

- **Plano de ação** (colher mexendo, leite caindo): funciona com
  enquadramento fechado e `no hands, no arms, no people` explícito. É o
  estilo "chef invisível", comum em vídeo de comida. Gerar 2-3 variações:
  às vezes a IA insiste em colocar uma mão — descarta e refaz.
- **Plano de estado** (o pote *antes* e o pote *depois*): sem ação nenhuma,
  só a câmera se movendo devagar. **Nunca falha.** No corte, o "antes →
  depois" cria a sensação de que a ação aconteceu, mesmo sem mostrar.

Os planos abaixo estão marcados 🟢 (seguro) ou 🟡 (gerar variações).

---

## Versão em plano único (testada em 2026-08-08)

A montagem inteira num vídeo só, câmera parada, ingredientes entrando em
sequência — funciona e casa com o plano 8 gerado separado.

**Erro do primeiro teste**: o prompt dizia `layers building up one after
another` e o modelo fez exatamente isso — camadas separadas, chia seca no
fundo. Chia em camada não hidrata; ela precisa estar **dispersa no
líquido**. Correção: descrever a mistura na ACTION, a dispersão na PHYSICS,
e travar `no separate layers` nos LOCKS. A colher voltou (o teste provou
que "entra de cima, fora do quadro" segura bem a ausência de mão).

⚠️ Conferir **9:16** no gerador — o primeiro teste saiu em 16:9.
Duração: ~19s funciona bem (dá tempo de todas as etapas).

### Versão final: 2 vídeos (receita completa)

Dez etapas não cabem em 19s. Divide em dois, com o mesmo pote / bancada /
luz — emendam sem costura na montagem.

#### Vídeo A — Montagem (até tampar e guardar)

```
SCENE CONTEXT
Overnight oats being assembled inside a glass jar on a kitchen counter, morning. The ingredients end up fully mixed into one cream, never in separate layers.

LOCATION MAP
Foreground: a clear glass mason jar on a light wooden kitchen counter. Background: blurred neutral kitchen. Camera at jar height, straight on. Light from a window on the left.

FIRST FRAME / BLOCKING
The empty jar is already centred in frame, rolled oats beginning to fall into it.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
Rolled oats pour into the jar and settle. Tiny black chia seeds sprinkle over them. A thin amber ribbon of honey falls slowly and coils on the surface. Two dark drops of vanilla extract fall and bloom into the mixture. Creamy coconut milk pours in with force and floods the jar. A wooden spoon enters from the top of the frame and stirs in slow circles until oats, chia and honey are evenly dispersed into one uniform speckled cream. The spoon lifts out. A metal lid lowers onto the jar and seals it.

PHYSICS
Honey falls as a slow viscous ribbon that folds on itself before sinking. Vanilla drops disperse in dark swirls. The milk swirls with real fluid motion, chia seeds tumble and spread through the liquid instead of sinking in a layer. The mixture thickens visibly as it is stirred.

LIGHTING
Soft morning window light from the left, gentle highlight on the wet surface of the mixture, warm glow through the glass.

STYLE
Photoreal food cinematography, individual oat flakes with visible ridges, tiny speckled chia seeds, natural uneven texture, true to life colors, fine grain.

POSITIVE LOCKS
Everything falls or enters from above, outside the frame. Only the spoon and the lid are visible, no hands, no arms, no people, no bowls or pitchers. The oats and chia end up evenly mixed into the milk, no separate layers. No text or labels.
```

#### Vídeo B — Da geladeira à colherada

```
SCENE CONTEXT
The finished overnight oats rest in the fridge overnight, then are opened, topped and served the next morning.

LOCATION MAP
CUT 1 is inside a refrigerator, the closed jar on a wire shelf. CUT 2 to CUT 4 are on the same light wooden kitchen counter, camera at jar height, straight on, window light from the left.

FIRST FRAME / BLOCKING
The closed jar already sits on the refrigerator shelf, thick mixture visible through the glass.

FORMAT MODE
Sequence of cuts, no timecodes. Cuts only at the specified points, the camera does not cut on its own.

CUT 1 — The closed jar on the refrigerator shelf, fine condensation beading on the cold glass, cold light dimming as the fridge door closes.
CUT 2 — The same jar on the wooden counter in warm morning light, the metal lid lifts straight up and away, revealing a thick set cream.
CUT 3 — Fresh diced mango cubes and cracked walnut pieces drop onto the surface from above, then a wooden spoon stirs them gently through the top layer.
CUT 4 — The spoon lifts a thick creamy scoop out of the jar and holds it, a slow drip falling back down.

OPTICS
Extreme close-up throughout, 50mm equivalent, shallow depth of field, no drift mid-segment.

CAMERA
Static locked off in every cut.

PHYSICS
The set mixture holds its shape and keeps the mark of the spoon. Mango cubes press into the surface when they land. The scoop on the spoon holds its form, a single thick drip falling back into the jar.

PERFORMANCE
Texture is the subject: chia seeds swollen into translucent gel beads, oats softened and plump, matte creamy surface, glistening mango edges, dry cracked walnut pieces.

LIGHTING
CUT 1: cold refrigerator light. CUT 2 to CUT 4: soft warm morning window light from the left, gentle sheen on the cream.

STYLE
Photoreal food cinematography, natural uneven texture, true to life colors, fine grain.

POSITIVE LOCKS
Same jar, same wooden counter, same window light from the left in every cut after the fridge. Only the lid and the spoon are visible, no hands, no arms, no people. The mixture stays thick and set, not liquid. No text or labels.
```

---

### Prompt anterior (só a montagem, sem mel/baunilha/geladeira)

```
SCENE CONTEXT
Overnight oats being assembled inside a glass jar on a kitchen counter, morning. The ingredients end up fully mixed, not layered.

LOCATION MAP
Foreground: a clear glass mason jar on a light wooden kitchen counter. Background: blurred neutral kitchen. Camera at jar height, straight on. Light from a window on the left.

FIRST FRAME / BLOCKING
The empty jar is already centred in frame, rolled oats beginning to fall into it.

FORMAT MODE
One continuous shot, the camera does not cut on its own.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
Rolled oats pour into the jar and settle. Black chia seeds sprinkle over them. Creamy coconut milk pours in with force and floods the jar. A wooden spoon enters from the top of the frame and stirs in slow circles until the oats and chia are evenly dispersed through the milk into one uniform speckled cream. The spoon lifts out. Fresh diced mango cubes and cracked walnut pieces drop on top of the mixed cream.

PHYSICS
The milk swirls with real fluid motion, chia seeds tumble and spread through the liquid instead of sinking in a layer, the mixture thickens as it is stirred, mango cubes displace the surface when they land.

LIGHTING
Soft morning window light from the left, gentle highlight on the wet surface of the mixture.

STYLE
Photoreal food cinematography, natural texture, true to life colors, fine grain.

POSITIVE LOCKS
Everything falls or enters from above, outside the frame. Only the spoon is visible, no hands, no arms, no people, no bowls or pitchers. The oats and chia end up evenly mixed into the milk, no separate layers. No text or labels.
```

## Os 8 planos (alternativa, um clipe por etapa)

### Plano 1 🟢 — Ingredientes na bancada (abertura)
> Extreme close-up food cinematography, an empty clear glass mason jar on a
> light wooden kitchen counter surrounded by small bowls of rolled oats,
> chia seeds, fresh mango and walnuts, soft morning window light from the
> left, shallow depth of field, blurred neutral background, slow pan across
> the ingredients, visible natural texture, no hands, no arms, no people,
> no text or labels, no packaging, photorealistic, vertical 9:16

### Plano 2 🟡 — Aveia caindo no pote
> Extreme close-up food cinematography, rolled oats falling into a clear
> glass mason jar on a light wooden kitchen counter, oats settling at the
> bottom, soft morning window light from the left, shallow depth of field,
> blurred neutral background, static camera slight push in, visible grain
> texture, no hands, no arms, no people, no text or labels, photorealistic,
> vertical 9:16

### Plano 3 🟡 — Chia caindo por cima
> Extreme close-up food cinematography, black chia seeds sprinkling over
> rolled oats inside a clear glass mason jar on a light wooden kitchen
> counter, seeds scattering across the surface, soft morning window light
> from the left, shallow depth of field, blurred neutral background, slow
> push in, no hands, no arms, no people, no text or labels, photorealistic,
> vertical 9:16

### Plano 4 🟡 — Leite de coco sendo despejado
> Extreme close-up food cinematography, creamy coconut milk pouring in a
> smooth stream into a clear glass mason jar filled with oats and chia
> seeds, milk swirling around the seeds, on a light wooden kitchen counter,
> soft morning window light from the left, shallow depth of field, blurred
> neutral background, static camera, no hands, no arms, no people, no
> pitcher visible, no text or labels, photorealistic, vertical 9:16

*(Se aparecer jarra ou mão: trocar `pouring` por `a stream of coconut milk
falling` e fechar mais o plano.)*

### Plano 5 🟡 — Colher mexendo (visto de cima)
> Top-down extreme close-up food cinematography, a wooden spoon slowly
> stirring oats chia and coconut milk inside a clear glass mason jar on a
> light wooden kitchen counter, only the spoon visible entering from the
> top of the frame, creamy swirls forming, soft morning window light,
> shallow depth of field, slow rotation of the mixture, no hands, no arms,
> no people, no text or labels, photorealistic, vertical 9:16

*(Este é o mais arriscado. Se toda variação vier com mão: substituir pelo
plano de estado — a mistura já cremosa, com marcas de redemoinho na
superfície, câmera em slow push in.)*

### Plano 6 🟡 — Manga e nozes por cima
> Extreme close-up food cinematography, fresh diced mango cubes and cracked
> walnut pieces falling onto a creamy oat and chia mixture inside a clear
> glass mason jar on a light wooden kitchen counter, fruit glistening, soft
> morning window light from the left, shallow depth of field, blurred
> neutral background, slow push in, visible texture, no hands, no arms, no
> people, no text or labels, photorealistic, vertical 9:16

### Plano 7 🟢 — Na geladeira (a passagem do tempo)
> Extreme close-up food cinematography, a closed clear glass mason jar with
> layered oats chia and mango sitting on a refrigerator shelf, cool
> refrigerator light, condensation forming on the glass, shallow depth of
> field, slow push in as the fridge door slowly closes and light dims, no
> hands, no arms, no people, no text or labels, photorealistic,
> vertical 9:16

### Plano 8 🟢 — O resultado (o plano que vende)
> Extreme close-up food cinematography, an open clear glass mason jar of
> thick creamy overnight oats topped with fresh mango cubes and cracked
> walnuts, a spoon resting inside lifting a thick creamy scoop, visible
> creamy texture and swollen chia seeds, on a light wooden kitchen counter,
> soft morning window light from the left, shallow depth of field, blurred
> neutral background, slow orbit around the jar, no hands, no arms, no
> people, no text or labels, photorealistic, vertical 9:16

---

## Textos de tela (montagem)

Padrão Detetive da Saúde: gancho → o porquê de cada ingrediente → CTA.

| Plano | Texto |
|---|---|
| 1 | **O café da manhã que você monta hoje e come amanhã** |
| 2 | Aveia — a **beta-glucana**, uma fibra solúvel que vira gel no intestino |
| 3 | Chia — fibra + **ômega-3 vegetal**, que incha e dá corpo à mistura |
| 4 | Leite de coco + baunilha (sem açúcar) |
| 5 | Mexe e deixa a fibra trabalhar |
| 6 | Manga pela **vitamina C** e nozes pelo **ômega-3** |
| 7 | **8 horas na geladeira** — é aqui que a mágica acontece |
| 8 | Na prática? Essa fibra vira **comida pra sua microbiota** — e ajuda a segurar a fome da manhã |

CTA final: 💚 Marca quem vive sem tempo de manhã · 📌 Salva a receita ·
🔍 @nutri_secrets

**Cuidado de linguagem** (regras da marca): "pode favorecer", "está
associado a", "ajuda a" — nunca "cura", "elimina", "garante".

---

## Molde pra qualquer receita futura

Toda receita da Aline vira reel com esta mesma estrutura de 8 planos:

1. 🟢 Ingredientes na bancada (abertura)
2. 🟡 Ingrediente seco 1 entrando no recipiente
3. 🟡 Ingrediente seco 2 entrando
4. 🟡 Líquido sendo despejado
5. 🟡 Mistura/mexida vista de cima
6. 🟡 Topping caindo
7. 🟢 Descanso / forno / geladeira (passagem do tempo)
8. 🟢 O resultado, com movimento lento em volta

Trocar só os ingredientes, **mantendo o bloco de continuidade** (mesmo
recipiente, mesma bancada, mesma luz) e as proibições
(`no hands, no arms, no people, no text or labels`).

Receitas quentes: no lugar do plano 7 usar a panela/forno com
`gentle steam rising`; no plano 8, `steam rising from the finished dish`.
