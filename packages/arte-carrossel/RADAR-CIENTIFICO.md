# Radar Científico — a regra de busca do conteúdo oportunista

Criada em 16/09/2026, a pedido da Aline, a partir de um exemplo que ela deu:
o estudo norueguês que ligou amamentação a menos sintomas de TDAH — **e que
ajustou pelo escore poligênico do pai, da mãe e da criança**.

> *"Poxa, eu estou com o bebê amamentando, a gente fala de genética, olha que
> super legal que ia ser fazer um post disso."*

Este arquivo existe porque aquele post **não foi feito** — o calendário de
setembro é todo conteúdo planejado, e nenhuma regra mandava ninguém olhar o
que acabou de sair.

---

## 🔴 A regra não é "achar estudo novo"

Achar estudo é trivial. Medido em 16/09, duas buscas simples na PubMed
devolveram **1.085** e **2.025** artigos. Triando os 6 mais recentes de uma
delas, sobrou **1**.

A regra é a SEGUNDA leitura:

> **Ache o estudo que todo mundo vai postar — e ache nele a linha que só a
> Aline pode ler.**

No exemplo dela: todo perfil de maternidade vai postar *"amamentar reduz
TDAH"*. Ela é a única que pode postar *"eles mediram o DNA do pai, da mãe e
da criança, e mesmo assim sobrou efeito — é disso que eu falo quando digo que
gene não é destino"*.

Essa linha é o produto. O estudo é só a carona.

---

## Os 5 portões (todos têm que passar)

**1. Recente e circulável.**
Publicado nos últimos ~90 dias. E o desfecho tem que ser algo que a pessoa
**sente**: sono, atenção do filho, peso, humor, cansaço, TPM, memória.
Marcador substituto (expressão de gene X em tecido Y) não passa — ninguém
compartilha o que não sente.

**2. O próprio estudo toca na genética.**
É o portão que define a marca. Procurar por método, não por tema:
`polygenic score` · `gene-environment interaction` · `Mendelian
randomization` · `sibling control` / `discordant sibling` · `genetic
confounding` · `nutrigenetic` · `polymorphism + interaction`.

Se o estudo não tocou em genética, o post vira opinião dela por cima de
notícia alheia. Com o portão, vira leitura que ninguém mais tem.

**3. Ela pode falar dali de dentro.**
Momento de vida (hoje: amamentação, Alex 7 meses, introdução alimentar,
sono de bebê), consultório, ou algo que ela já ensina. Sem isso o post é
correto e morno.

**4. Tem contraponto real.**
Outro estudo que discorda, ou a limitação que os próprios autores
declararam. **Sem contraponto, não posta** — vira manchete exagerada, que é
exatamente o que ela critica nos outros. O contraponto é o que dá autoridade:
quem mostra os dois lados é quem leu.

**5. Sobra conduta nutricional, e é dela.**
Se o post não termina em prato, exame, sinergia ou conduta, não é post dela
— é jornalismo. "E na prática, o que eu faço com isso" é obrigatório.

---

## Não posta (mesmo passando nos 5)

- **Rato/cachorro sozinho.** Estudo animal só entra como apoio de mecanismo,
  nunca como manchete. ("Suplementação paterna de DHA em ratos Wistar" não
  vira post.)
- **Revisão narrativa sem dado novo.** Não é notícia.
- **Preprint tratado como definitivo.** Pode citar — tem que dizer que ainda
  não passou por revisão por pares.
- **Nome de doença como conduta.** CFN. TDAH, SOP, Hashimoto viram
  *desenvolvimento da atenção*, *modulação hormonal feminina*, *suporte
  tireoidiano*. Comentar o achado de um estudo publicado é legítimo;
  estabelecer diagnóstico não.
- **Dose ou protocolo a partir de um estudo só.** Nunca.

---

## As buscas (rodar toda segunda, na PubMed)

Datas: sempre `date_from` = hoje − 90 dias, `sort` = `pub_date`.

**A — momento de vida (bebê / amamentação / introdução alimentar)**
```
(breastfeeding OR "human milk" OR "complementary feeding" OR "infant feeding")
AND (polygenic OR "gene-environment" OR sibling OR "Mendelian randomization"
     OR heritability)
```

**B — núcleo dela (nutriente × gene × desfecho sentido)**
```
(polygenic score OR gene-environment interaction OR Mendelian randomization
 OR sibling control)
AND (diet OR nutrient OR supplementation OR "dietary pattern")
AND (obesity OR "insulin resistance" OR inflammation OR depression OR fatigue)
```

**C — mulher / hormônio / sono / cortisol**
```
(gene-diet interaction OR nutrigenetic OR polymorphism)
AND (sleep OR cortisol OR stress OR circadian)
AND (women OR maternal)
```

**D — microbiota × genética**
```
(microbiome OR microbiota) AND ("gene-environment" OR "host genetics"
 OR polygenic) AND (diet OR "dietary fiber" OR fermentation)
```

Triagem mecânica antes de ler: descartar `Review`, `Preprint` (só sinalizar),
e título com espécie animal. O que sobra vai pros 5 portões, um por um.

**Taxa medida em 16/09: ~1 candidato a cada 6 artigos recentes já
pré-filtrados.** É normal uma semana não render nada — e é melhor não render
do que forçar.

---

## Onde isso entra no calendário

**1 slot oportunista por semana**, deixado vago de propósito. O resto do
calendário continua planejado.

Se a semana não render candidato, o slot vira conteúdo de acervo. Se render
dois, o segundo espera — a janela de um estudo que está circulando é de uns
5 a 7 dias, não de 24h.

⚠️ **Oportunista ≠ acervo.** Estudo que ninguém está comentando não é pior —
é outro tipo de post (pilar, evergreen, sem pressa). O que define o slot
oportunista é a onda já existir.

---

## Exemplo-mãe (o que a Aline descreveu)

**Solberg BS et al., *Biological Psychiatry* 100(7):725-735, jun/2026.**
PMID 42320784 · https://doi.org/10.1016/j.biopsych.2026.06.009
Coorte MoBa (Noruega), 37.643 crianças, 18.349 trios pai-mãe-filho. Cada mês
de amamentação plena associado a menos sintomas de TDAH aos 3, 5 e 8 anos,
**ajustado por escore poligênico de TDAH na criança, na mãe e no pai**, com
análise entre irmãos discordantes.

**Contraponto (portão 4):**
**Mooney MA et al., medRxiv, jun/2025 (preprint).**
PMID 40585166 · https://doi.org/10.1101/2025.06.16.25329516
Coortes ABCD e Oregon ADHD-1000: a mesma associação **perdeu significância**
na análise entre irmãos, e os efeitos caíram ~44–48% ao ajustar por risco
poligênico e saúde mental materna.

**A linha que só ela tem:** os dois estudos juntos não se anulam — eles
desenham a tese da Detetive da Saúde. Um mostra que sobra efeito do ambiente
depois da genética; o outro mostra o quanto do "ambiente" era família o tempo
todo. A resposta não é ou/ou. É *depende da peça que você ainda não olhou*.

Fonte dos dois: PubMed.
