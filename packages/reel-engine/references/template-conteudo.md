# Template de conteúdo clínico

O que cada reel precisa cobrir, independente do tema. Esta é a espinha dorsal
pedida pela Aline, não improvisar outra estrutura.

## 1. Sintoma (2 a 3)

O que a paciente **sente e reconhece em si**, escrito na linguagem dela, não na
linguagem do prontuário.

- ✅ "Calor que sobe do peito para o rosto, sem aviso, várias vezes ao dia"
- ❌ "Sintoma vasomotor de origem hipotalâmica"

Cada sintoma tem um **ponto anatômico** para a seta apontar. Âncoras disponíveis
na figura: `face`, `eyes`, `neck`, `chest`, `spine`.

Quando o sintoma é visível no rosto (olheira, expressão), usar `"close": True`
para aproximar, senão não lê no celular.

## 2. Genes (mínimo 2, ideal 3)

Sempre com:

- **Nome técnico do gene** (COMT, MTHFR, VDR, FTO, CLOCK, BDNF, SOD2, CYP1B1…)
- **rsID em notação de DNA**, `rs4680`, `rs1801133`. Nunca notação de proteína
  (Val158Met). Se o laboratório reportar a fita complementar, avisar.
- **Explicação lúdica com metáfora concreta.** O gene vira um personagem com
  função no mundo real: faxineira, fechadura, carteiro, termostato, porteiro.

Exemplos que funcionaram:

| Gene | Metáfora |
|------|----------|
| COMT | a faxineira que recolhe adrenalina, na variante lenta limpa devagar |
| MTHFR | quem ativa o folato, no TT trabalha em marcha lenta |
| VDR | a fechadura por onde a vitamina D entra na célula óssea |

## 3. Exame de sangue, exatamente 3 parâmetros

Cada um com direção (↑ ou ↓), explicação lúdica e alavanca alimentar.

Escolher parâmetros que **conversem com os genes escolhidos**. A simetria 1:1
gene→marcador é o que faz o conteúdo parecer investigação e não lista:

```
MTHFR  → Homocisteína ↑
VDR    → 25(OH)D ↓
COMT   → Magnésio eritrocitário ↓
```

Preferir o marcador que reflete o compartimento certo, magnésio **eritrocitário**
e não sérico, por exemplo, e dizer por que na explicação lúdica.

## 4. Microbiota, exatamente 2 bactérias

Pode ser uma boa em queda, uma ruim em excesso, ou as duas. Sempre com nome
técnico e explicação lúdica.

⚠️ **Checar a direção na literatura do contexto específico.** O mesmo táxon muda
de sinal conforme a condição. Exemplo real: na **pós**-menopausa a atividade
β-glicuronidase do estroboloma está **reduzida** (menos reciclagem entero-hepática
de estrogênio), o oposto do enquadramento de "β-glicuronidase alta = ruim" que
vale em cenários de dominância estrogênica.

## 5. Sinergia alimentar, para cada gene, marcador e bactéria

Este é o diferencial. Nunca listar alimento solto. Sempre:

- **2 ou 3 alimentos combinados**
- **quantidade concreta**, "30 g", "1 xíc.", "2 unidades", "1 c.sopa", "200 ml"
- **o porquê da combinação**, o que um entrega que o outro não entrega

Modelo:

> Semente de abóbora 30 g + Espinafre cozido 1 xíc. + Cacau 70% 20 g
> "Juntos entregam cerca de 350 mg de magnésio, o mineral que funciona como
> chave de partida da enzima. Sem ele, a faxineira fica sem ferramenta."

Nome técnico do nutriente é bem-vindo (riboflavina, menaquinona, punicalagina,
sulforafano, 5-MTHF). A **explicação** é que precisa ser lúdica.

Nunca prescrever dose de suplemento. Quantidade de **alimento** sim; dose de
cápsula não.

## 6. Virada

A frase que reenquadra tudo o que veio antes. Duas linhas curtas + uma de apoio.
É o que transforma lista de sintomas em revelação.

Referência (menopausa):

> O gene sempre esteve aí.
> O estrogênio compensava.
> Quando ele cai, a variante deixa de ficar escondida. E o sintoma aparece.

Construir a virada **antes** de escrever o resto, ela define o fio narrativo.

## Verificação obrigatória

Toda associação gene,sintoma, marcador e bactéria passa pelo PubMed antes de
entrar no SPEC. Buscar com condição + gene + rsID, filtro 2022+ quando possível.
Se a associação só existir em interação com fator ambiental, escrever com verbo
modal ("pode fazer", "influencia") em vez de causalidade direta.

Papers muito recentes podem não estar indexados ainda, nesse caso citar por
periódico + data via fonte secundária.
