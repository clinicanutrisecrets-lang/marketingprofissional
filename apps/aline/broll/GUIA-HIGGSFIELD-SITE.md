# Guia prático — gerar no site do Higgsfield (sem pessoa)

Pela **API os créditos não entram no ilimitado** — então cenas sem pessoa
(comida, cenários, moléculas) a Aline gera **no site**, onde o ilimitado
vale. O CLI fica só pro Soul ID e pra automação futura.

Este guia é pras cenas **sem a Aline**. Nenhuma delas precisa de Soul ID.

---

## 1. Qual modelo escolher

| Cena | Modelo no site | Por quê |
|---|---|---|
| Comida, cenário vazio, molécula | **Seedance 2.5** | está no ilimitado, e nenhuma delas precisa de frame inicial |
| Cenas com o rosto da Aline | Kling 3.0 (com frame do Soul) | único que aceita frame inicial; **gasta crédito** |

Regra de bolso: **se não tem a Aline em cena, usa Seedance 2.5 no site.**

---

## 2. Ajustes antes de gerar (o checklist)

Os nomes dos botões mudam com as atualizações do site, mas procure sempre
por estes ajustes:

1. **Proporção (aspect ratio): 9:16.** Sempre. É Reels.
2. **Duração: a mais curta disponível** (5s costuma bastar; na edição o
   corte usado é de 4-6s). Duração maior só gasta mais.
3. **Resolução: a maior que o plano permitir.** Comida em macro perde muito
   em resolução baixa.
4. **Movimento de câmera: escolher UM.** Se o site tiver lista de presets
   (dolly, orbit, push in, pan), escolher um só e não descrever outro
   movimento no texto — senão a câmera "briga" consigo mesma.
5. **"Enhance prompt" / melhorar prompt automático: desligar** se existir.
   Ele reescreve o texto e costuma acrescentar brilho e perfeição plástica
   — o oposto do que a marca quer.
6. **Sem áudio.** O som entra depois.

Gerar **2 variações** de cada cena e ficar com a melhor.

---

## 3. Como um prompt bom é montado

Sempre nesta ordem, separado por vírgulas, **em inglês** (os modelos
entendem muito melhor):

```
[tipo de plano] + [assunto concreto] + [luz] + [movimento único] +
[detalhes de textura] + [proibições] + vertical 9:16
```

Proibições que entram em **todos** os prompts:
`no hands, no people, no text or labels, no packaging`
(nas cenas de cenário, trocar por `no people`).

Por que "no text or labels": IA escreve letras embaralhadas. Rótulo legível
nunca sai bom — melhor proibir.

---

## 4. Como deixar a COMIDA realista

O que faz um vídeo de comida parecer real (referência: o vídeo que a Aline
gravou num restaurante — macro, movimento lento, luz quente):

| Quero | Escrever no prompt |
|---|---|
| Textura de verdade | `visible texture, imperfect rustic plating, crumbs and drips on the plate` |
| Brilho de molho/azeite | `glistening sauce, olive oil sheen, moist surface` |
| Vapor de comida quente | `gentle steam rising` |
| Fundo desfocado bonito | `shallow depth of field, blurred background, macro lens` |
| Luz que valoriza | `soft side light` ou `warm backlight rim` (luz de lado ou de trás) |
| Frescor | `fresh herbs, dew drops on greens` |

**Evitar** (deixa com cara de propaganda falsa): `perfect`, `flawless`,
`studio product shot`, `hyperreal`, `8k`, `symmetrical`. Prato perfeito
demais denuncia IA.

**Nunca**: mão em quadro, garfo cortando, líquido sendo despejado. Mão e
manipulação são onde a IA erra feio.

---

## 5. Como deixar o LABORATÓRIO realista

| Quero | Escrever no prompt |
|---|---|
| Luz clínica correta | `cool white clinical lighting, fluorescent ceiling panels` |
| Profundidade | `shallow depth of field, equipment blurred in background` |
| Ar de ambiente real | `subtle haze, soft reflections on stainless steel` |
| Toque de marca | `subtle teal accents` (o Tiffany da marca) |
| Realismo | `photorealistic, documentary style, natural imperfections` |

**Evitar**: `futuristic`, `sci-fi`, `neon`, `holographic` — vira ficção
científica e perde credibilidade clínica.

**Sempre**: `no people, no readable text or labels`.

---

## 6. Como fazer as MOLÉCULAS (para o Instagram)

Decisão da Aline: para o feed, precisa ser **plausível e bonita**, não
exata. (Para a formação, o mecanismo correto entra em diagrama por cima —
outro fluxo.)

Base que funciona:

```
Cinematic 3D medical animation, [assunto], glowing molecular structures,
teal and magenta bioluminescent lighting on dark background, floating
particles, soft depth of field, elegant scientific visualization,
slow orbit, no text no labels no letters, vertical 9:16
```

Teal + magenta = paleta da marca, então já sai "cara de Nutri Secrets".
`no text no labels no letters` é obrigatório: legenda gerada por IA sempre
sai embaralhada.

---

## 7. Prompts prontos — COMIDA por condição

Receitas terapêuticas. Os nutrientes citados são coerentes com o tema, mas
o vídeo é ilustrativo — a orientação clínica vai no texto por cima.

**TDAH / foco — ovos, abacate e sementes de abóbora**
(proteína/tirosina + magnésio + B6)
> Extreme close-up food cinematography, soft scrambled eggs with sliced
> avocado and pumpkin seeds on a rustic ceramic plate, gentle steam rising,
> visible texture, soft side light from a window, shallow depth of field,
> slow push in, fresh herbs scattered, no hands, no people, no text or
> labels, photorealistic, vertical 9:16

**Cortisol / sono — banana, castanhas e canela**
(magnésio + triptofano)
> Extreme close-up food cinematography, sliced banana with walnuts, chia
> and a dusting of cinnamon in a small bowl, warm evening light, honey
> drizzle glistening, shallow depth of field, slow orbit, visible texture,
> no hands, no people, no text or labels, photorealistic, vertical 9:16

**Microbiota / intestino — iogurte, frutas vermelhas e chia**
(fibras + polifenóis + fermentados)
> Extreme close-up food cinematography, natural yogurt bowl topped with
> raspberries blueberries and hydrated chia seeds, dew drops on the fruit,
> soft morning light, shallow depth of field, slow pan across the bowl,
> creamy texture visible, no hands, no people, no text or labels,
> photorealistic, vertical 9:16

**Tireoide — salmão, castanha-do-pará e folhas verdes**
(selênio + zinco + ômega-3)
> Extreme close-up food cinematography, grilled salmon fillet flaking
> apart beside dark leafy greens and brazil nuts, olive oil sheen, gentle
> steam, warm backlight rim, shallow depth of field, slow push in, no
> hands, no people, no text or labels, photorealistic, vertical 9:16

**Resistência insulínica / SOP — bowl de proteína, folhas e canela**
> Extreme close-up food cinematography, colorful bowl with grilled chicken
> strips, leafy greens, chickpeas and roasted vegetables, rustic imperfect
> plating, soft side light, shallow depth of field, slow orbit, visible
> texture, no hands, no people, no text or labels, photorealistic,
> vertical 9:16

**Menopausa — linhaça, tofu e verdes escuros**
(fitoestrógenos + cálcio)
> Extreme close-up food cinematography, warm tofu cubes with sautéed dark
> leafy greens and golden flaxseed, glistening sauce, gentle steam rising,
> soft window light, shallow depth of field, slow pan, no hands, no people,
> no text or labels, photorealistic, vertical 9:16

**Chá / pausa** (serve de respiro em qualquer reel)
> Extreme close-up cinematography, herbal tea being poured into a ceramic
> cup, steam rising slowly, warm morning light through a window, water
> surface rippling, shallow depth of field, slow push in, no hands visible,
> no people, no text or labels, photorealistic, vertical 9:16

*(A Aline vai passar as condições dela — cada nova condição vira um prompt
neste mesmo formato.)*

---

## 8. Prompts prontos — CENÁRIOS vazios

**Laboratório de genética**
> Empty modern genetics laboratory, cool white clinical lighting,
> sequencing equipment and centrifuges, subtle teal accents, soft
> reflections on stainless steel, shallow depth of field, subtle haze,
> slow dolly forward, no people, no readable text or labels,
> photorealistic documentary style, vertical 9:16

**Bancada de laboratório em detalhe**
> Close-up of a laboratory bench, pipettes resting in a rack and petri
> dishes, cool clinical light, shallow depth of field, slow pan across the
> bench, photorealistic, no people, no readable text or labels,
> vertical 9:16

**Consultório vazio ao amanhecer**
> Empty warm consultation room at dawn, wooden desk, plants, soft golden
> light through blinds, shallow depth of field, slow push in, no people,
> no readable text or labels, photorealistic, vertical 9:16

**Cozinha clara de manhã**
> Empty bright kitchen counter in soft morning light, fresh vegetables and
> a wooden board, dust particles floating in the light beam, shallow depth
> of field, slow pan, no people, no packaging, no readable text,
> photorealistic, vertical 9:16

**Sala de aula / auditório vazio**
> Empty small auditorium before a lecture, warm lighting, rows of empty
> chairs facing a blank screen, shallow depth of field, slow dolly forward,
> no people, no readable text, photorealistic, vertical 9:16

---

## 9. Prompts prontos — MOLÉCULAS e célula

**Dopamina no cérebro** (reel de TDAH)
> Cinematic 3D medical animation, a glowing dopamine molecule floating
> between neurons, synapses firing gently in the distance, teal and magenta
> bioluminescent lighting on dark background, soft depth of field, slow
> orbit, no text no labels no letters, vertical 9:16

**DNA / metilação** (nutrigenética)
> Cinematic 3D medical animation, a DNA double helix slowly rotating with
> small glowing methyl groups attaching along the strand, teal and magenta
> bioluminescent lighting on dark background, floating particles, soft
> depth of field, slow orbit, no text no labels no letters, vertical 9:16

**Vitamina sendo metabolizada na célula**
> Cinematic 3D medical animation, interior of a human cell, glowing vitamin
> molecules entering and transforming near the mitochondria, teal and
> magenta bioluminescent lighting, floating particles, soft depth of field,
> slow push in, no text no labels no letters, vertical 9:16

**Microbiota intestinal**
> Cinematic 3D medical animation, beneficial bacteria colonies glowing
> softly along the intestinal wall lining, warm teal bioluminescent
> lighting on dark background, gentle organic movement, soft depth of
> field, slow pan, no text no labels no letters, vertical 9:16

**Receptor / hormônio se encaixando**
> Cinematic 3D medical animation, a glowing hormone molecule slowly docking
> into a cell surface receptor, teal and magenta bioluminescent lighting on
> dark background, particles drifting, soft depth of field, slow orbit,
> no text no labels no letters, vertical 9:16

---

## 10. Deu errado? O que ajustar

| Problema | Ajuste |
|---|---|
| Comida com cara de plástico/propaganda | tirar `perfect`/`hyperreal`; acrescentar `rustic imperfect plating, visible texture, crumbs` |
| Apareceu mão ou pessoa | reforçar `no hands, no people` e trocar pra plano mais fechado (`extreme close-up`) |
| Letras embaralhadas na cena | acrescentar `no text, no labels, no letters, no packaging` |
| Câmera mexendo demais / enjoativo | deixar **um** movimento; tirar do texto qualquer outro verbo de movimento |
| Laboratório com cara de ficção | tirar `futuristic/neon/holographic`; acrescentar `documentary style, photorealistic` |
| Molécula genérica demais | citar o objeto concreto (neurônio, hélice, mitocôndria) em vez de "science" |
| Ficou escuro/sem graça | trocar a luz: `soft side light`, `warm backlight rim`, `golden light through blinds` |

---

## 11. Depois de gerar

Baixar os MP4 e organizar por pasta (`comida/`, `cenarios/`, `moleculas/`).
Guardar **tudo que prestou** — B-roll sem pessoa é reutilizável pra sempre e
serve pra qualquer tema futuro.

A montagem (juntar cenas, cortes no ritmo, texto queimado na paleta da
marca, áudio) é feita depois — a Aline não edita.
