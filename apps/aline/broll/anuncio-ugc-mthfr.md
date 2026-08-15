# Anúncio UGC — MTHFR e a paciente ansiosa

Anúncio para o **Intensivo de Nutrigenética**. Quem fala **não é a Aline**:
é uma nutricionista (personagem, gerada por IA) no formato UGC — celular na
mão, ambiente real, sem produção. Ela ensina o raciocínio e passa a bola
para a Aline no fecho.

---

## ⚠️ Antes de rodar como anúncio

Três cuidados, porque quem aparece na tela é uma nutricionista falando de
conduta clínica:

1. **Nada de testemunhal.** O roteiro nunca faz a personagem dizer "eu tive
   esse resultado" ou "minha paciente curou". Ela fala de um caso
   didático dirigido ao espectador ("se você tem uma paciente que…"). O CFN
   veda testemunhal e promessa de resultado em publicidade de nutricionista
   — mantenha assim mesmo quando for tentador.
2. **Não coloque CRN na tela.** A personagem não existe; um número de
   registro inventado (ou o de outra pessoa) é problema sério. Se precisar
   de selo de credibilidade, o selo é o da Aline, no fecho.
3. **Predisposição, não destino.** Manter a ressalva na legenda, como ela
   já usa no laudo.

Se você quiser ser conservadora, dá pra colocar um "conteúdo produzido com
IA" pequeno num canto — o Meta já pede isso em várias categorias e isso
não derruba conversão.

---

## Roteiro adaptado (~72s)

Corte de 340 para 185 palavras. Cada bloco é um clipe.

| # | t | Fala | Imagem |
|---|---|---|---|
| 1 | 0-7s | "Nutri, se você tem uma paciente ansiosa que já mudou a dieta, já toma tudo que você passou, e continua acordando às três da manhã com o coração disparado… presta atenção nisso aqui." | avatar falando, câmera frontal |
| 2 | 7-18s | "Ela se irrita à toa, chora sem saber por quê, e já começou a achar que o problema é ela. Você troca o magnésio, ajusta o sono, reforça o triptofano. E ela volta igual." | avatar falando |
| 3 | 18-30s | "O que pode estar travando é o gene MTHFR. Ele comanda a metilação, que transforma o folato na forma ativa. E é essa forma ativa que o corpo usa pra fabricar serotonina e dopamina." | B-roll 1 (laudo genético) |
| 4 | 30-39s | "Uma meta-análise que juntou vinte e seis estudos ligou justamente a variante desse gene a um risco maior de depressão." | B-roll 2 (artigos na tela) |
| 5 | 39-53s | "Se ela tem essa variante e você prescreve ácido fólico comum, você tá entregando o combustível na forma que o corpo dela não consegue queimar." | avatar falando |
| 6 | 53-63s | "A chave não é mais um calmante natural. É a vitamina na forma ativa, na dose certa, com B12 metilada e o olho na homocisteína." | B-roll 3 (suplemento / prescrição) |
| 7 | 63-72s | "Você para de adivinhar e passa a enxergar o corpo dela por dentro. Quem sistematizou esse raciocínio foi a Aline Quissak, mestre em Genética e Bioquímica, criadora do Scanner da Saúde." | avatar falando |
| 8 | 72-82s | "Ela vai abrir o Intensivo de Nutrigenética. Aula gratuita, sem replay. Clica no link e garante sua vaga." | avatar falando + selo |

**Versão de 35s (para teste A/B)** — blocos 1, 3, 5 e 8, nesta ordem, com o
bloco 4 virando só um texto de tela ("26 estudos. Uma meta-análise.").

### O que mudou do seu texto e por quê

- **"Deixa eu te mostrar" saiu.** Em UGC quem fala é par, não palco. Virou
  "o que pode estar travando é".
- **A apresentação da Aline foi para o fecho e encurtou.** Numa boca que
  não é a dela, credencial longa soa a script lido.
- **"Ela te chama de a profissional que descobriu" foi cortado.** É a parte
  mais próxima de promessa de resultado, e é a que menos segura retenção.
- **"vinte e seis" por extenso** no roteiro de fala: TTS lê número melhor
  escrito assim.

---

## Passo 1 — Gerar o rosto da personagem

Modelo de imagem (Nano Banana / text2image no site). Gere **4 variações** e
escolha uma; guarde o arquivo, porque toda cena depois usa essa mesma
imagem como referência.

```
A candid vertical selfie of a Brazilian woman in her early thirties, a
nutritionist, sitting in a small real consulting room. She holds the phone
herself at arm's length, slightly above eye level, so the framing is a
little off centre and tilted.

She has warm brown skin, dark wavy shoulder-length hair loosely tied back
with a few strands escaping, thin eyebrows, no makeup beyond a little
concealer. She wears a plain soft-blue scrub top, slightly creased, worn
not new. A simple thin necklace.

Behind her: a wooden desk with a real working mess, a stack of printed
papers, a ceramic mug, a small plant, a blood pressure cuff. Ordinary white
wall, a slightly crooked framed diploma out of focus.

Lighting is ordinary daylight from a window on her left plus the flat light
of the room, not studio light. Slight sensor noise, slight lens distortion
from a phone front camera, mild motion blur.

Pore-level skin realism with visible pores, fine lines around the eyes,
slight asymmetry in the face, a small mole. No smoothing, no retouching, no
beauty filter. Living eyes with a soft window catch-light.

Photoreal amateur phone photo, 9:16 vertical, true to life colours, natural
grain.

Locks: her expression is neutral and attentive with the lips closed. No
text, logos, badges, name tags or readable paper anywhere in frame. Only
one person. Both hands are not visible. She does not look like a model or
a campaign render.
```

**Ela não pode se parecer com você.** Se sair parecida, mude no prompt: a
idade (`late twenties`), o cabelo (`straight dark hair cut at the chin`) e
o tom de pele. Rode de novo.

### Variações de cenário (para testar qual converte)

Trocar só o bloco do fundo, mantendo o resto igual:

- **Cozinha de casa**: `standing in a home kitchen, a counter with a glass
  of water and a fruit bowl behind her, ordinary domestic clutter`
- **Carro parado**: `sitting in the driver seat of a parked car, seatbelt
  on, daylight through the windscreen, headrest visible behind her`
- **Fim do dia no consultório**: `the room lights already on and the window
  dark behind her, a lamp on the desk`

Carro e cozinha costumam ler como UGC mais rápido que consultório.

---

## Passo 2 — Fazer o avatar falar

Precisa de dois pedaços: **áudio** e **lip sync**.

### O áudio (ElevenLabs, que você já tem)

Gere cada bloco como um arquivo separado — fica mais fácil de refazer um
pedaço sem refazer tudo.

- **Voz**: feminina brasileira, tom médio, não locutora. Procure algo
  descrito como *conversational* ou *narração natural*, nunca *newscaster*.
- **Stability ~40%** (mais baixo = mais variação, mais humano) e
  **similarity ~75%**.
- **Speed**: 1.0 ou 0.95. UGC apressado não engaja.
- Escreva as **reticências e vírgulas** do roteiro: é assim que se compra a
  pausa. "…presta atenção nisso aqui." com as reticências soa diferente de
  sem.
- Números por extenso: *vinte e seis*, *três da manhã*.
- **MTHFR** o TTS lê errado. Escreva no texto do áudio:
  `ême-tê-agá-efe-érre`. Ouça antes de usar.

### O lip sync

No site do Higgsfield, procure o modo de **avatar falante** (Speak /
Talking Avatar / Lipsync — o nome muda com as atualizações). Ele recebe a
**imagem do passo 1** e o **áudio do ElevenLabs** e devolve o vídeo.

Se não achar no Higgsfield, **HeyGen** faz exatamente isso com foto + áudio
e é o padrão do mercado de UGC. O resultado é o mesmo para o que você
precisa.

Ajustes no clipe falado:

- **9:16**, sempre.
- Movimento de câmera: **nenhum**. UGC é celular na mão, não travelling.
  Se houver opção de "handheld" leve, ligue; se for um preset de dolly ou
  orbit, desligue.
- Se houver campo de prompt junto com o áudio, use este bloco curto:

```
She talks straight into the phone camera she is holding, the way you talk
to a colleague, not to an audience. Small natural head movements, eyebrows
move with the sentence, two or three blinks, one small shift of the
shoulders. Her free hand comes into frame once, briefly, on the emphasis,
then drops out again. Very slight handheld drift the whole time.

Locks: her face, hair and top match the reference exactly and her hair
keeps the same length and shape on both sides through the whole shot. She
never smiles wide, she never laughs. No zoom, no camera move. No text or
logos in frame. Only one person.
```

⚠️ **Máximo 10 segundos por clipe falado.** Depois disso a identidade
começa a derivar — cabelo muda de comprimento de um lado, o rosto escorrega.
Por isso o roteiro está cortado em blocos: cada bloco é uma geração.

---

## Passo 3 — Os B-rolls (blocos 3, 4 e 6)

Sem pessoa, então é Seedance no site e entra no ilimitado. Um clipe de 20s
com as três cenas encadeadas (a regra 17 do guia) resolve os três de uma
vez:

```
SCENE CONTEXT
Three short shots of clinical desk material about a genetic report, shot
like documentary B-roll, no people.

LOCATION MAP
A wooden desk under a desk lamp, late afternoon. Papers, a laptop half
closed, a glass of water. Camera close, at desk height.

FORMAT MODE
Three separate shots with hard cuts between them, no dissolves.

OPTICS
Close-up, 50mm equivalent, shallow depth of field.

ACTION
Shot 1 (0-7s): very slow push in across a printed report on the desk, the
paper slightly curled at the corner, a yellow highlighter lying beside it.
Hard cut.
Shot 2 (7-14s): a laptop screen seen at a steep angle, showing a wall of
small dense paragraphs of a scientific paper, the scroll moving slowly
downward on its own. The screen is soft and unreadable.
Hard cut.
Shot 3 (14-20s): a small amber glass supplement bottle standing beside a
prescription pad, a slow lateral drift past them, a few capsules resting on
the wood.

PHYSICS
Contact shadows under every object. The paper holds its curl. The capsules
sit with real weight.

LIGHTING
Warm lamp light from the upper left, the rest of the room one stop darker.
Same light in all three shots.

STYLE
Photoreal documentary B-roll, real desk clutter, true to life colours,
fine grain.

POSITIVE LOCKS
No hands, no arms, no people in any shot. All text on paper and screen
stays soft and completely unreadable, no letters, no numbers, no logos, no
labels on the bottle. Nothing is styled or arranged, it looks like a desk
someone was working at.
```

O texto legível você põe depois na edição, com os overlays reais — nunca
deixe a IA escrever.

---

## Passo 4 — Texto de tela

O anúncio roda **muito no mudo**, então o texto carrega. Estilo já validado:
grande, centralizado na metade de baixo, sem tarja preta, sombra dupla,
palavra de destaque em serifada italic, sigla de gene em sans.

| t | Texto | Estilo |
|---|---|---|
| 0-7s | Ela já mudou a dieta. E continua acordando às 3h. | frase |
| 7-18s | O problema **não é ela** | hero, destaque |
| 18-30s | gene do **MTHFR** · metilação | hero, sans, Tiffany |
| 30-39s | 26 estudos. Uma meta-análise. | frase |
| 39-53s | Ácido fólico comum **não serve** para todo mundo | hero, destaque |
| 53-63s | Forma ativa · B12 metilada · homocisteína | grupo curto |
| 63-72s | Você para de **adivinhar** | hero |
| 72-82s | INTENSIVO DE NUTRIGENÉTICA · aula gratuita, sem replay | selo Tiffany |

---

## Legenda do post

> Nutri, essa é a paciente que não melhora com nada.
>
> Ansiosa, acorda de madrugada com o coração disparado, se irrita à toa e
> já começou a achar que o problema é ela. Você já trocou o magnésio, já
> ajustou o sono, já reforçou o triptofano.
>
> Antes de trocar o suplemento de novo, olhe o **MTHFR**.
>
> Esse gene comanda a metilação — o processo que converte o folato na forma
> ativa. É essa forma ativa que entra na fabricação de serotonina e
> dopamina. Se a paciente carrega a variante e recebe ácido fólico comum,
> você entregou o combustível numa forma que o corpo dela tem dificuldade
> de usar.
>
> A conduta não é mais um calmante natural. É a vitamina na forma ativa, na
> dose certa, com B12 metilada e a homocisteína no radar.
>
> É isso que separa adivinhar de enxergar.
>
> A **Aline Quissak** — mestre em Genética e Bioquímica, criadora do
> Scanner da Saúde — vai abrir o **Intensivo de Nutrigenética**. Aula
> gratuita, exclusiva para nutricionistas, sem replay.
>
> ⚠️ Genética é predisposição, não destino. Nada aqui substitui avaliação
> individual.

---

## Uma correção que vale fazer

No texto original: *"transforma o ácido fólico na forma ativa, o
metilfolato, que o corpo usa pra fabricar serotonina e dopamina."*

Está simplificado a ponto de um avaliador mais técnico poder contestar. O
metilfolato não vira neurotransmissor: ele doa metil na remetilação da
homocisteína, o que sustenta o ciclo do SAMe e regenera a **BH4**, que é o
cofator direto da tirosina hidroxilase e da triptofano hidroxilase — as
enzimas que de fato fabricam dopamina e serotonina.

Para o anúncio, a versão que mantém o ritmo e fica correta:

> "Ele comanda a metilação. E é a metilação que mantém funcionando o
> cofator que as enzimas usam pra fabricar serotonina e dopamina."

Se preferir manter a sua versão pela fluidez, a saída é deixar a cadeia
completa na legenda — onde há espaço — e a versão curta na fala.

Sobre a meta-análise: vale citar a referência na legenda. Existem
meta-análises de MTHFR C677T e depressão com esse tamanho de amostra, mas
com o número do estudo na mão o argumento fica blindado.
