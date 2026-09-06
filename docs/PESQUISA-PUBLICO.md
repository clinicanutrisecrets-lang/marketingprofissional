# Pesquisa de público e de conteúdo — @nutri_secrets

Tudo aqui foi **medido**, não estimado. Cada número tem a origem escrita. Este
documento existe para nenhuma sessão futura repetir a varredura nem chutar por
cima. Levantado entre 05 e 06/09/2026.

---

## 1. A conta dela, medida

Leitura de **140 posts** (2023-08-11 a 2026-08-17) pela API do Instagram, com
alcance, salvamentos, compartilhamentos e visualizações.

### O post que mais funcionou de todos

**O carrossel da maçã** — e por uma margem que não é ruído:

| | |
|---|---|
| Alcance | **93.632** |
| Envios | **7.400** |
| Salvamentos | 4.484 |
| Curtidas | 9.380 |

Segundo colocado: caldo de ossos, 65.340 de alcance.

**Posts sobre genes: 2.674 a 6.220 de alcance** — 15 a 35 vezes menos.
**Posts de maternidade: 0,09% de taxa de salvamento** (praticamente nada).

> Leitura: o núcleo da conta é **alimento terapêutico**. Gene sozinho não
> engaja; ele precisa entrar pendurado no alimento.

### Medianas por formato

| Formato | Alcance mediano | Salvamento | Envio |
|---|---|---|---|
| Reel | 5.728 | 1,22% | 0,89% |
| Imagem | 5.639 | — | — |
| **Carrossel** | 4.864 | **2,15%** | **1,27%** |

O carrossel perde em alcance e **ganha em salvamento e envio** — que são os
sinais que o algoritmo usa pra entregar a quem não segue. É o formato certo
para crescer, mesmo aparecendo "pior" no número de cima.

### Conversa

O post com mais conversa da conta fez **283 comentários — 35 por 100 curtidas**.
O da maçã, com todo o alcance, fez **1,2 por 100**.

A diferença: o de 283 fazia **uma pergunta que só o leitor sabia responder**.
É a base da mecânica de pergunta aberta (ver `REGRAS-CONTEUDO.md`, envio e
comentário).

### O que NÃO foi possível medir

- **Melhor horário.** A leitura gravava só a data (`timestamp.slice(0,10)`), e
  todos os 140 posts liam como 21h. Corrigido em 06/09 (campo `publicado_em`),
  mas **só vale para leituras novas** — o horário real sai do próximo raio-X.
- **Melhor dia da semana.** Com n de 6 a 13 por dia, qualquer conclusão é ruído.
  Não usar os números antigos.
- **Quem salvou ou curtiu.** A API dá o número, nunca a identidade. Só comentário,
  DM, resposta e menção de story entregam quem é a pessoa.
- **Números de outra conta** (Fran Castro, por exemplo). Exigiria Business
  Discovery, que não está implementado. Só a grade visível é legível.

---

## 2. O algoritmo, e o que ele de fato pesa

Três sinais de ranking, na ordem que importa para crescer:

1. **Tempo assistido**
2. **Curtidas por alcance**
3. **Envios por alcance** — este é o que pesa para **alcance de quem NÃO segue**

Por isso o gatilho de envio é escrito dentro do post, nomeando uma pessoa que o
leitor conhece.

**Política de conteúdo não original (desde 30/04/2026):** agregadores e
quase-duplicatas perdem recomendação. Repostar sem transformar custa alcance.

---

## 3. Pesquisa de demanda no YouTube

Varredura de mais de 40 buscas em temas vizinhos, com contagem real de views.

### O formato que mais aparece no topo

**"Como saber se você tem / está com X"** — reconhecimento e autodiagnóstico. A
pessoa não quer aprender sobre o tema: quer saber se aquilo é ela.

### Segundo formato

**"Quantas causas isso tem, e qual é a sua"** — que é literalmente a tese do
perfil ("o sintoma engana").

### Benchmark: Priscila Riciardi (31 vídeos lidos)

Canal **monotemático** — hormônio feminino e perimenopausa, quase nada fora disso.

| Vídeo | Views | Duração |
|---|---|---|
| Ciclo das sementes | 72.643 | 21:30 |
| Como saber se você está na perimenopausa | 72.229 | 9:13 |
| Sinais de cortisol alto e baixo na mulher | 33.687 | **0:57 (short)** |
| Progesterona — como melhorar naturalmente | 23.978 | 14:02 |
| Perimenopausa: como lidar com a transição | 17.935 | 12:41 |
| Predominância estrogênica | 13.569 | 11:20 |
| Alimentos para regulação hormonal | 13.056 | 8:47 |

Três lições:
1. **O topo é um protocolo COM NOME.** "Ciclo das sementes" é um método batizado,
   que a pessoa repete e conta pra amiga. É o que capacetinho/vassourinha e a
   Fábrica fazem — vocabulário próprio faz alguém te citar sem te marcar.
2. **O segundo maior é reconhecimento**, não informação.
3. **Ela cresceu depois de NICHAR.** É o ponto desconfortável: o perfil da Aline
   tem oncologia, maternidade, alimento, genética, emagrecimento e formação
   convivendo. O eixo natural que cabe em cima de todos é *o sintoma engana — a
   causa é individual e dá pra medir*.

### Outros benchmarks mencionados por ela

- **Luciano Bruno** e **Dr. Josh Axe** (de quem saiu a ideia do post da maçã;
  ela não quer a parte religiosa dele).
- **Fran Castro** — carrossel em tudo, pega paciente e profissional, e sempre dá
  a fórmula no final. **Números não mensuráveis** (ver limitação acima).
- **Vídeo viral do coco (dancinha)** — funcionou.
- 🔴 **O vídeo da salsicha NÃO deve ser repetido**: veio de um corte de podcast
  sem contexto, gerou polêmica que ela não quer, e atrai um público que não é o
  comprador do teste genético. Decisão dela, 05/09/2026.

---

## 4. A própria pesquisa clínica dela — o dado mais forte que existe

Revisão de **52 casos** dela: em quantos o sintoma estava, de fato, no setor da
Fábrica que o nome dele sugere.

| Queixa | Acertou o setor | % |
|---|---|---|
| Gases | 6 de 8 | 75% |
| Queda de cabelo | 2 de 3 | 67% |
| Intestino preso | 3 de 6 | 50% |
| Ansiedade | 4 de 8 | 50% |
| Cansaço | 1 de 3 | 33% |
| TPM | 1 de 3 | 33% |
| **Peso** | **1 de 13** | **8%** |
| **Memória** | **0 de 4** | **0%** |
| **Fertilidade** | **0 de 4** | **0%** |

**Total: 18 de 52.** Em 34 dos 52 casos a causa não estava onde o sintoma
apontava.

> Este é o único conteúdo que serve aos dois públicos com o MESMO dado: a
> paciente entende por que anda em círculos, e a profissional entende por que
> precisa de um software que cruza. É dado próprio — ninguém mais tem.

---

## 5. Formato, tipografia e leitura em tela pequena

Pesquisa sobre o que prende o polegar neste nicho (05/09/2026):

- **Contraste é o fator número um**, acima de fonte e de layout. A régua é a
  WCAG 2.1: 4,5:1 para corpo, 3:1 para texto grande.
- 🔴 **O Tiffany (#0ABFBC) é fundo e bloco, NUNCA cor de letra** — não passa em
  contraste sobre creme. Está travado em `REGRAS-CONTEUDO.md` 1.3.
- **Vídeo: tempo médio assistido é 8,5 s.** A promessa tem que caber nos 2
  primeiros segundos.
- **Um corte a cada 2 a 4 segundos** sustenta a atenção; quadro parado mais
  longo que isso perde.
- **Legenda de duas linhas, sem sombra.** Sombra borra em tela pequena — é o
  erro mais comum.

---

## 6. Onde o resto está

- Regras de escrita e de arte: `REGRAS-CONTEUDO.md`
- História pessoal e o que ela NÃO é: `HISTORIA-ALINE.md`
- Produtos, degraus e triagem: `JORNADA-CLIENTE.md`
- Janelas de mensagem e regras do robô: `ROBO-INSTAGRAM.md`
- Calendário editorial: `CALENDARIO-EDITORIAL.md`
