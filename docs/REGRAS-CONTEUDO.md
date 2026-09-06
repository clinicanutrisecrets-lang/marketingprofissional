# Regras de conteúdo — Nutri Secrets

Regras que a Aline corrigiu à mão mais de uma vez. Estão escritas aqui para que
carrossel e vídeo nasçam certos e ela pare de revisar as mesmas coisas.

Vale para a skill `nutri-secrets-carrossel`, para o gerador de posts do app das
franqueadas e para quem estiver mexendo no corte de vídeo.

---

## 1. Carrossel

### 1.1 A capa é uma IDENTIDADE, não um assunto

Título de assunto gera salvamento. **Título de identidade gera envio** — e envio
é o sinal que leva o post a quem ainda não segue.

A leitora não pensa "isso é interessante", pensa **"isso sou eu"**, ou
**"isso é a minha irmã"**, e manda.

A fórmula tem quatro partes, nesta ordem:

**Capa: identidade + tempo.**
> Cansada há mais de 2 anos.

Quem ela é, e há quanto tempo. O tempo é o que transforma queixa em identidade.

**Subtítulo: a sequência vivida, na ordem em que dói.**
> Seu corpo está pedindo ajuda, você tenta mas se frustra. E o cansaço só aumenta.

Descreve a experiência, não o mecanismo. **Sem número e sem termo técnico aqui.**

**Terceira linha: a promessa, citando a frase que ela diz para si mesma.**
> Vou te contar por que você não deve dizer: "faz parte, tenho que me acostumar".

Repetir a frase da resignação é a parte mais forte. A pessoa se vê sendo citada.

**O número entra depois, na virada. Nunca na capa.**

### 1.2 O visual é o da marca, não editorial preto e branco

A **estrutura** acima é emprestada de posts que funcionam. O **visual não é.**

- Fundo em **cor da marca**, nunca branco com texto preto
- **Traços de line art** como decoração, usando a biblioteca que já existe
  (`packages/ai-image/src/lineArt.ts`, `ILUSTRACOES_DISPONIVEIS` e
  `sugerirIlustracao`)
- Paleta e mini-logo conforme a skill `nutri-secrets-carrossel`

Carrossel em preto e branco puro está **fora do padrão**.

### 1.6 Sobrepor público, em vez de triar

O mesmo carrossel serve paciente e profissional **na mesma peça**, sem precisar
separar por palavra-chave.

- A **capa e o subtítulo** falam com a paciente: identidade, sequência vivida,
  a frase que ela diz para si mesma.
- O **prêmio do final** serve ao profissional: é o que ele salva para usar.

A paciente se reconhece e leva a pergunta ao profissional dela. O profissional
salva. Um post, dois públicos, nenhuma triagem.

### 1.7 A sinergia é o prêmio, e ela sempre explica o PORQUÊ

A última lâmina de valor é a **sinergia**, e ela é o que faz o post ser salvo.

**Nunca listar combinação sem o mecanismo.** A regra é sempre:

> [Composto A] + [Composto B] → porque [o que A faz com B]

Falar em **composto bioativo e nutriente**, não em alimento genérico. É o que
separa "coma maçã" de nutrição: quem trabalha é a pectina e a quercetina, e o
alimento é como elas chegam na mesa (ver o dicionário da Fábrica).

Dose específica só com aviso de individualização. Fórmula com miligramas para
público leigo é terreno de farmacêutico, não de nutricionista.

O prêmio que ninguém mais tem: **a leitura da Fábrica** — onde aquela queixa
costuma nascer, e o que olhar antes de conduzir. Para o profissional isso é tão
salvável quanto uma fórmula.

### 1.8 Etiqueta de série na capa

Toda capa declara a que série pertence, numa linha pequena em cima:

> CANSAÇO · VOLUME 1
> PERIMENOPAUSA · O QUE O EXAME NÃO MOSTRA

É o que faz quem gostou de um post procurar os outros, em vez de voltar para o
feed. Resolve a permanência sem depender de "veja mais no perfil".

### 1.9 Post fixado de boas-vindas

Um dos três fixados é sempre de recepção, para quem chega pela primeira vez:
quem é a Aline, o que ela investiga, e por onde começar. É o que atende quem
vem de anúncio e não sabe onde pisou.

### 1.3 Contraste: o Tiffany é fundo, nunca cor de letra

Medido pela régua da WCAG sobre os HEX oficiais:

| Combinação | Razão | Serve para |
|---|---|---|
| Dark teal sobre branco | 8,10:1 | qualquer texto |
| Dark teal sobre bege | 6,61:1 | qualquer texto |
| Magenta sobre branco | 4,62:1 | qualquer texto |
| Magenta sobre bege | 3,77:1 | só título grande |
| Dark teal sobre Tiffany | 3,36:1 | só título grande |
| Branco sobre Tiffany | 2,41:1 | **reprova** |
| Tiffany como letra sobre branco ou bege | 2,41:1 e 1,97:1 | **reprova** |

O Tiffany tem claridade parecida com a do branco e a do bege, e duas cores de
claridade próxima não se separam em tela pequena.

### 1.4 Formato e ritmo

- **1080 × 1350 (4:5).** Quadrado desperdiça um quarto da altura de tela.
- A grade do perfil corta para 3:4: nada essencial encostado na borda lateral.
- Margem interna de 100 px.
- **Sete a nove lâminas.** A **terceira** é a de maior risco de abandono: é
  onde vai a virada, não a parte explicativa.
- **Uma ideia por lâmina.** Duas listas seguidas é onde o carrossel vira lista.
- Cada lâmina termina devendo alguma coisa à seguinte.

### 1.5 Tipografia

Três tamanhos, e só. Valores para a peça de 1080 × 1350:

- **Capa:** 90 a 130 px, duas ou três linhas no máximo
- **Título de miolo:** 60 a 72 px — é onde mora o número
- **Corpo:** nunca abaixo de 44 px, linha de 20 a 30 caracteres

Peso, tamanho e contraste decidem legibilidade, nessa ordem. A escolha da fonte
vem depois dos três.

---

## 2. Vídeo

### 2.1 Rosto falando é a base; b-roll é o corte de retomada

Para conteúdo que ensina, **o rosto falando sustenta mais tempo de tela do que
imagem bonita**. Contato visual e fala real seguram; b-roll como camada principal
não segura.

A biblioteca de b-roll não é a base do vídeo. Ela é o que **reseta a atenção**.

### 2.2 Um corte a cada 2 a 4 segundos

Depois de 12 a 15 segundos de quadro parado, parte da audiência rola a tela.
Qualquer coisa serve como corte: close, b-roll de dois segundos, gráfico na
tela, mudança de ângulo.

Um caso citado mostra o tamanho do efeito: cortes a cada 2,8 segundos, gancho
ajustado e CTA claro levaram a duração média assistida de **41% para 58%**, com
**salvamentos subindo 211%**.

### 2.3 A promessa nos dois primeiros segundos

O tempo médio assistido de Reels é de **8,5 segundos** (Metricool, 24,4 milhões
de posts). Sem "oi gente", sem contextualizar antes de entregar. O dado entra
antes do argumento.

### 2.4 Legenda

- **Duas linhas curtas** ganham de bloco denso que cobre meia tela
- Fonte grande, contraste alto
- **Sem sombra.** Sombra borra a letra em tela pequena, e é o erro mais comum

### 2.5 Duração

7 a 15 segundos para trend, 30 a 90 para conteúdo que ensina. Mas a duração não
decide nada sozinha: **conta o total de segundos assistidos**. Um vídeo de 45
segundos que dois terços terminam rende mais que um de 15 que todos terminam.

---

## 3. O que vale para os dois

- **Escrever para o ENVIO, não para a curtida.** Curtida distribui para quem já
  segue; envio no direct é o que atravessa para quem não segue. Uma frase por
  peça que faça a leitora pensar em uma pessoa concreta.
- **Nunca dizer "IA" ou "inteligência artificial".** Usar "algoritmo Scanner".
- **Processo funcional, nunca nome de doença como diagnóstico** (regra do CFN).
- **Sem promessa de prazo** ("em 7 dias", "em 2 horas") e sem polêmica.
- **Nada de xilitol, maltitol ou adoçante artificial** em receita ou copy.
- Termo técnico **sempre com tradução prática ao lado**, no padrão do dicionário
  da Fábrica (capacetinho, vassourinha, os quatro setores).

---

## Procedência

Os números de formato vêm dos levantamentos de 2026 da Metricool (24,4 milhões
de posts) e da Socialinsider (70 milhões). As referências de corte, legenda e
duração de vídeo vêm de blogs de ferramentas de edição, sem amostra publicada:
a direção é consistente entre elas, os valores exatos não são garantidos.

O teste de contraste foi calculado sobre os HEX oficiais da marca pela fórmula
da WCAG 2.1, critério AA.

As leituras de audiência da conta @nutri_secrets vêm do Raio-X do público
(`/perfis/nutrisecrets/publico`), lido pela API do Instagram.

---

## 4. Quem ela é, e quem ela NÃO é

Contexto completo em `docs/HISTORIA-ALINE.md`. O que muda a escrita de todo post:

### 4.1 Ela não é a nutricionista do "comer certinho"

Ela ama cozinhar, comer e viajar. Ama chocolate (tem uma linha de chocolate),
brigadeiro e sorvete. Para ela **alimentação é cultura, prazer e entretenimento**,
não só nutriente.

Um post que soe a suco detox, restrição moral, "alimento limpo" ou culpa
contradiz quem ela é — e ela corrige o post. A frase dela:

> "Não é pra gente tirar a beleza do alimento olhando só pro nutriente. Mas
> também não é pra esquecer o poder que a alimentação tem na nossa saúde."

As duas metades da frase valem juntas. Conteúdo que fica só na primeira vira
hedonismo sem ciência; só na segunda vira a nutricionista chata que ela não é.

### 4.2 PROIBIDO: "alimentação é remédio"

Ela não usa e não gosta. O remédio tem a função dele e o alimento tem a dele — e
reduzir a comida a farmacologia desrespeita as culturas milenares que cuidam da
saúde pelos alimentos e pelas ervas.

Também fora: "comida é o melhor remédio", "farmácia natural", "receita médica da
natureza" e variações.

### 4.3 A magia está no PASSADO. O presente é ciência.

Ela brincava de fazer poções quando criança, e é ela quem diz que "a cozinha
virou a minha magia, a panela virou o meu caldeirão". Mas o vocabulário mágico
tem um lugar só, e é o **tempo verbal**:

- **Passado — o que a criança via:** "quando eu era criança, eu via isso como
  magia."
- **Presente — o que a cientista sabe:** a frase dela, que é a ponte entre as
  duas e a melhor síntese da marca:

> **"Parece magia, mas é ciência."**

- **Registro permitido no presente:** **alquimia**, no sentido de ofício e de
  beleza da combinação. "Hoje eu trabalho com a alquimia dos compostos" é dela.

**Por que a regra é estrita.** Duas razões, as duas dela:

1. **Parte do público é religiosa.** Marca que se apresenta como mágica compete
   com a fé de quem lê, e perde. A religiosidade que aparece na história é a
   **da avó**, contada como memória — nunca uma posição da marca.
2. **Ela fala de ciência.** Mestrado em genética, pesquisa com bolsa, dez mil
   pacientes. Post que soe a misticismo joga fora a autoridade que sustenta um
   produto de R$ 3.500.

**PROIBIDO:** magia, mágico, feitiço, milagre, energia, cura espiritual,
"poder místico do alimento" — no presente, afirmando o que a comida faz.
**Permitido:** poção e caldeirão **quando narram a infância dela**; alquimia
como ofício; e a frase "parece magia, mas é ciência", que existe justamente
para desarmar a leitura mística antes que ela aconteça.

### 4.4 O olhar é multidisciplinar, nunca por pedaços

Mestrado em genética (individualidade), especialização em psicologia da nutrição
(o emocional impacta a alimentação e vice-versa), e a primeira pesquisa dela só
saiu porque professores de enfermagem, biologia e genética ajudaram.

Consequência prática: post que trata um sintoma como se tivesse **uma** causa
está contra o método. É sempre "quais são as causas possíveis, e qual é a sua".
