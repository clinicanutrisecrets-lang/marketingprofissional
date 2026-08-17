# Salmão com brócolis no vapor — gene a gene

Reel [ADS] para nutricionistas. O prato mais banal do consultório é o que
carrega mais nutrigenômica: **um alimento que precisa ser preparado
certo pra existir** (o brócolis) e um que resolve uma conversão que nem
todo mundo faz (o salmão).

**Gancho**: o modo de preparo não é detalhe de cozinha, é conduta.

---

## Os genes deste prato

| Gene / via | O que explica | Conduta na receita |
|---|---|---|
| **mirosinase** (não é gene, é a enzima do próprio brócolis) | a glucorafanina só vira sulforafano quando a mirosinase age, e ela desnatura no calor alto | vapor curto, 3 a 5 minutos; fervido em água perde o composto que interessa |
| **NRF2** (via) | o sulforafano é o indutor alimentar mais estudado dessa via de defesa antioxidante | é o mecanismo, não uma variante a testar |
| **GSTM1** | a deleção (genótipo nulo) muda a velocidade de conjugação e excreção do sulforafano — a exposição não é a mesma em duas pessoas | quem é nulo mantém o composto por mais tempo na circulação; a frequência do brócolis na semana muda com isso |
| **FADS1** | dessaturase que converte ALA em EPA e DHA; quem carrega a variante converte pouco | fonte pronta, e é exatamente o que o salmão é — não depende de conversão |
| **VDR** | receptor da vitamina D: a mesma dose rende diferente | o salmão é fonte alimentar, e a refeição com gordura melhora a absorção |
| **GPX1** | glutationa peroxidase, selênio-dependente | o selênio do salmão é cofator; variante depende mais do aporte alimentar |
| **MTHFR** | o brócolis também é fonte de folato alimentar | entra na conta junto com a forma ativa prescrita |

### Cuidado ao falar do GSTM1

A interação GSTM1 × sulforafano está bem descrita **na farmacocinética**:
o nulo conjuga e excreta mais devagar, então a exposição é maior. A
**direção do desfecho clínico** ainda é discutida na literatura — tem
estudo dos dois lados. Por isso o texto fala em *exposição diferente*, e
não em "o nulo se beneficia mais". Falar do mecanismo é seguro; prometer
o desfecho, não.

---

## Texto para gravar (~85s)

Escrito pra ser lido em voz alta, na cadência dos outros. Adapta o que
quiser — o motor sincroniza a legenda pelo áudio que você mandar.

```
Nutricionista, esse prato aqui parece simples. Salmão, brócolis e limão. Mas ele tem cinco genes por trás, e o modo de preparo muda o resultado de todos eles.

Começa pelo brócolis. Ele não tem sulforafano. Ele tem glucorafanina, e ela só vira sulforafano quando a mirosinase age. E a mirosinase morre no calor alto. Por isso vapor curto, três a cinco minutos. Fervido na água, você perde justamente o composto que interessa.

O sulforafano acende a via NRF2, que é a via de defesa antioxidante da célula. E aqui entra o GSTM1. Quem tem a deleção elimina o sulforafano mais devagar, então a exposição é maior. Mesmo prato, exposição diferente.

O brócolis ainda traz folato. Se a sua paciente tem MTHFR, esse folato entra na conta junto com a forma ativa que você prescreve.

Agora o salmão. O FADS1 diz quem converte bem o ômega três vegetal e quem não converte. Quem não converte precisa da fonte pronta, e é exatamente isso que o salmão é. EPA e DHA direto, sem depender de conversão.

O salmão também é vitamina D. E o VDR muda o quanto essa vitamina D rende. A mesma dose não faz o mesmo efeito em duas pessoas. E como ela é lipossolúvel, a gordura do próprio peixe já ajuda na absorção.

E tem o selênio, que é cofator da glutationa peroxidase. Quem tem variante no GPX1 depende mais do selênio que vem da dieta.

Repara: nada disso é o alimento sozinho. É o alimento, o gene e o modo de preparo. Trocar a fervura pelo vapor não é detalhe de cozinha. É conduta.

Quer aprender a fazer essa leitura na sua consulta? Vem para o imersivo de nutrigenética. A aula é gratuita e exclusiva para nutricionistas.
```

### Nomes escritos para o TTS e para a sua leitura

- **GSTM1** → "gê-esse-tê-eme-um" sai melhor que tentar ler junto
- **GPX1** → "gê-pê-xis-um"
- **FADS1** → "fads-um"
- **NRF2** → "êne-erre-efe-dois"
- **VDR** → dá pra dizer "receptor da vitamina D", que soa melhor em consulta

O `corrige_transcricao.py` já conhece esses nomes, então mesmo que o
reconhecimento erre na hora de virar legenda, a tela sai certa.

---

## O clipe que falta

O primeiro clipe (20s) tem quatro cenas: brócolis no vapor · molho
caindo sobre o brócolis · salmão desfiando no garfo · prato montado com
limão. Isso cobre a receita **pronta**, mas não o **preparo**, e é
justamente o preparo que o texto defende.

O segundo clipe cobre o que falta e não repete nenhum enquadramento do
primeiro: os floretes crus, o vapor saindo, o filé cru com a pele, e o
limão espremido no fim, fora do calor.

```
SCENE CONTEXT
Four short shots of salmon and broccoli being prepared, food only, no people.

LOCATION MAP
A dark stone kitchen counter, blurred neutral kitchen behind. Camera at counter height, straight on. Light from a window on the left.

FORMAT MODE
Four separate shots with hard cuts between them, no dissolves. Same counter, same light and same lens in all four.

OPTICS
Extreme close-up, 50mm equivalent, shallow depth of field.

CAMERA
Static locked off, no movement.

ACTION
Scene 1 (0-5s): extreme macro of raw broccoli florets on the counter, deep green and tight, a few drops of water on them.
Hard cut.
Scene 2 (5-10s): the lid of a bamboo steamer lifts straight up and a thick cloud of steam rises off the bright green florets inside.
Hard cut.
Scene 3 (10-15s): a raw salmon fillet skin side down on the counter, and about half a level teaspoon of coarse salt falls over it in a thin scatter.
Hard cut.
Scene 4 (15-20s): half a lemon is squeezed over the cooked salmon fillet and a few drops fall on it.

PHYSICS
The steam rises and curls slowly upward, never filling the whole frame. The salt falls as separate coarse grains, never as a heap. The lemon releases a few drops and a fine spray, never a stream.

LIGHTING
Soft window light from the left.

STYLE
Photoreal food cinematography, visible natural texture, true to life colors, fine grain.

POSITIVE LOCKS
The broccoli is bright deep green and firm, never yellowed, never overcooked and mushy. The amount of salt is modest, about half a level teaspoon of coarse grains, never covering the fillet. The salmon is a single fillet, never sliced, never in pieces. Only the steamer lid and the lemon half are visible, entering from the top of the frame, no hands, no arms, no people. No text or labels.
```

Com esse segundo clipe o reel narrado fecha com **40 segundos de comida**
para ~85s de fala, e as cenas de laboratório e consultório voltam a ser
só o que a fala pede — gene e paciente —, não tapa-buraco.
