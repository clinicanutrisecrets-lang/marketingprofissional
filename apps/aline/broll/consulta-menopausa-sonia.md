# Vídeo de consulta — Sonia, menopausa

Formato: a Aline (clone HeyGen, frame lateral no consultório) explicando
resultados para uma paciente sentada do outro lado da mesa, fora de quadro.
~2 minutos. **Caso didático, paciente fictícia.**

Serve para [ORG] — mostra como é uma consulta dela, sem vender nada.

---

## ⚠️ Antes de gerar

- **Selo de caso didático.** Põe na tela, pequeno, no primeiro plano:
  *"Caso clínico ilustrativo. Paciente fictícia."* Sem isso, um vídeo
  nomeando queixas e resultados de exame parece atendimento real exposto.
- **Nada legível na tela nem no papel.** A IA inventa números e nomes, e
  laudo falso legível num vídeo seu é problema de outra ordem. O lock está
  no motion; confere nos primeiros frames.
- **Nenhuma palavra sobre terapia hormonal.** O script fala do estrogênio
  como fisiologia e para na conduta nutricional. Reposição é do médico.
- **Sem valor numérico de exame.** "Vitamina D baixa", "ferritina no chão
  do intervalo" — descrever a direção, nunca o número, que é o que
  transforma exemplo em laudo.

---

## O script (~2 min)

```
Sonia, deixa eu te mostrar o que eu vi aqui. Porque nada do que você está sentindo é frescura, e nada disso é só a idade.

Você me trouxe cinco queixas. O peso que subiu, a gordura que foi toda pro abdômen, a memória que falha, as articulações doendo e o intestino que travou. Parecem cinco problemas diferentes. Não são. É um só.

O que mudou foi o estrogênio. E o estrogênio não cuidava só do seu ciclo. Ele participava de onde o seu corpo guardava gordura, de como o seu cérebro usava a dopamina, de quanta inflamação você segurava, e até de como o seu intestino se movia.

Quando ele cai, essas quatro coisas desandam juntas. É por isso que as suas queixas vieram todas no mesmo ano.

Agora olha o seu sangue.

A sua vitamina D está baixa, e ela participa do osso, da dor e do humor. A sua ferritina está no chão do intervalo, e é isso que rouba a sua disposição. A sua insulina de jejum subiu, mesmo com a glicose ainda normal, e é ela que empurra a gordura pro abdômen antes da balança acusar. E a sua proteína C reativa está levemente elevada, que é a inflamação de fundo que dói na articulação.

E aí entra a sua genética, que é o que explica por que foi com você, e não com a sua irmã.

Você tem uma variante no PPAR gama, que muda o quanto a sua célula de gordura responde à insulina.

Tem uma variante na COMT. E a COMT depende do estrogênio pra manter a dopamina do foco. Isso é a sua memória.

Tem uma variante no receptor da vitamina D, que faz a mesma dose render menos em você do que renderia em outra pessoa.

E no gene FUT dois, você é não secretora. Isso reduz a sua bifidobactéria, e é isso que está segurando o seu intestino.

Nada disso é sentença, Sonia. Isso é direção.

Então a gente não vai fazer dieta. A gente vai fazer conduta.

Você não está quebrada. Você está num corpo diferente do que era há cinco anos. E esse corpo tem instruções próprias.
```

### Por que os genes são esses

| Gene | Liga em qual queixa |
|---|---|
| **PPARG** | adipogênese e sensibilidade à insulina — a gordura que migra pro abdômen |
| **COMT** | degrada dopamina no córtex pré-frontal, e a atividade dela é modulada por estrogênio — a névoa mental da menopausa |
| **VDR** | resposta à vitamina D — dor musculoesquelética, osso e humor |
| **FUT2** | não secretora tem menos bifidobactéria aderida à mucosa — trânsito e microbiota |

A tese que costura tudo: **uma causa (a queda do estrogênio), quatro
sistemas, e a genética explicando a intensidade em cada um.**

### Nomes escritos para o TTS

Sigla de gene em áudio soa mal e o TTS erra. Por isso o script diz:

- **PPAR gama**, não "PPARG"
- **receptor da vitamina D**, não "VDR"
- **FUT dois**, não "FUT2"
- **COMT** ficou, que é vocabulário da marca. Escuta antes; se sair
  errado, troca por `cê-ó-eme-tê`.

Em consulta com paciente, falar o nome por extenso também é mais realista
do que despejar sigla.

---

## Motion

O frame lateral vira vantagem aqui: numa consulta ela olha para a
**paciente**, não para a lente. O giro para a câmera, que era o movimento
de risco, simplesmente deixa de existir.

```
She is in the middle of a consultation, explaining results to a patient sitting across the desk from her, just off camera. She looks at the patient while she speaks, turning her head slightly toward them, and between sentences she glances down at the laptop screen or at the printed exam pages on the desk, lips closed, then looks back up at the patient. She glances at the camera only briefly, once or twice, and never holds it.

Calm, warm and confident, the tone of someone delivering difficult news carefully. At most a very slight closed-lip smile, never a wide smile, never laughing. Her teeth are natural ivory, slightly warm, never bright white. Eyebrows move with the sentence, natural blinks, small nods.

Locks: her face, glasses, hair and white coat match the reference exactly, and her hair keeps the same length and shape on both sides through the whole shot. Her hands and fingers stay out of frame and she never touches her face, hair or glasses. Nothing on the screen or on the paper is readable, no text, no numbers. Static framing, no zoom, no camera move, only her head and shoulders move.
```

**More expressive desligado.**

---

## Divisão em partes

Dois minutos num clipe só acumula artefato demais. Quatro partes de ~30s:

| # | Trecho | Termina em |
|---|---|---|
| 1 | abertura e as cinco queixas | "É um só." |
| 2 | o estrogênio | "…todas no mesmo ano." |
| 3 | o sangue | "…que dói na articulação." |
| 4 | a genética e o fecho | "…instruções próprias." |

Se uma parte estragar, você regenera 30s em vez de dois minutos.

---

## Texto de tela

Pouco texto: aqui a fala carrega. Só os marcadores.

| Momento | Texto |
|---|---|
| abertura | Caso clínico ilustrativo · paciente fictícia |
| "é um só" | 5 queixas. **1 causa.** |
| o sangue | vitamina D · ferritina · insulina · PCR |
| PPAR gama | gene do **PPARG** · gordura abdominal |
| COMT | gene da **COMT** · memória e foco |
| vitamina D | gene do **VDR** · dor e osso |
| FUT dois | gene do **FUT2** · microbiota |
| fecho | não é sentença, é **direção** |
