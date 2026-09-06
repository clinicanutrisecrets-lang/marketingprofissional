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
