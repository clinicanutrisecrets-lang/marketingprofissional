/**
 * O SEGUNDO post fixo do perfil: o carrossel da Fábrica da Saúde
 * (Aline, 15/10/2026).
 *
 * Na semana 1 a conta recebe o post fixo da consulta (lib/geracao/post-fixo.ts).
 * Na semana seguinte recebe este: a metodologia que vai basear os posts e a
 * conversa com a paciente, dentro do Scanner e nas redes. É o molde do Claude
 * Design que a Aline aprovou (public/fabrica/carrossel.html), com a marca de
 * cada profissional:
 *  - cores, logo, foto e @ dela;
 *  - os sintomas do slide 2 saem do que ela atende (questionário);
 *  - o slide 3 ganha "As máquinas que eu mais olho no meu atendimento", com
 *    três genes do nicho dela. Só a função do gene, nunca qual letra é de
 *    risco: o post não pode afirmar nada sobre o laudo de ninguém.
 *
 * Quem desenha os slides é o worker (.github/workflows/render-carrossel-fabrica.yml,
 * packages/video-marca/carrossel-fabrica.cjs). Funções puras: nada de rede nem banco.
 */

export const PAPEL_FABRICA = "Post fixo do perfil: a metodologia Fábrica da Saúde";

export const LEMBRETE_FABRICA =
  "Mais uma sugestão de post para FIXAR no perfil. Na semana passada o post fixo explicou o que é a sua consulta de precisão e excelência. Este apresenta a metodologia que vai basear todos os seus posts e a conversa com a sua paciente, dentro do Scanner e nas redes: assim ela já entende a sua identidade. Depois de postar, toque nos três pontinhos do post e em \"Fixar no perfil\".";

export const LEGENDA_FABRICA = [
  "Seu corpo é uma fábrica, e cada sintoma é um aviso de que algum setor travou.",
  "",
  "Na minha linha de atendimento eu sigo a metodologia Fábrica da Saúde: avalio matéria-prima, maquinário, logística e funcionários para entender onde mora a causa, e não só o sintoma.",
  "",
  "O alimento entra como uma caixa de ferramentas: tem quem protege (capacetinho) e tem quem limpa (vassourinha). Montar o seu plano é escolher as ferramentas certas para o setor certo.",
  "",
  "E tudo isso vira um prato que respeita o seu prazer em comer, a sua cultura e os seus hábitos.",
  "",
  "Salve para consultar depois e envie para alguém que precisa entender isso.",
  "Agende sua avaliação pelo link da bio.",
].join("\n");

export const HASHTAGS_FABRICA = [
  "#fabricadasaude",
  "#detetivedasaude",
  "#nutricaodeprecisao",
  "#nutricaointegrativa",
  "#nutrigenetica",
];

/** Os 5 sintomas que o molde traz, na ordem em que aparecem no slide 2. */
export const SINTOMAS_DO_MOLDE = [
  "cansaço que não passa",
  "intestino preso ou inchado",
  "fome fora de hora",
  "sono que não descansa",
  "peso que não se mexe",
] as const;

export type Gene = { gene: string; funcao: string };

type Area = { chave: RegExp; sintoma: string; gene: Gene };

/**
 * Cada área de atendimento: como reconhecê-la no texto do questionário, o
 * sintoma que ela põe no slide 2 e o gene que ela põe no slide 3. Todos os
 * genes existem na curadoria do Scanner (conferido em 15/10/2026).
 */
const AREAS: Area[] = [
  {
    chave: /\bpeso\b|composi[cç][aã]o corporal|emagrec/,
    sintoma: "peso que não sai do lugar",
    gene: { gene: "FTO", funcao: "o gerente do peso: fome, saciedade e o que vira gordura" },
  },
  {
    chave: /horm[oô]n\w* feminin|\btpm\b|ciclo|menopausa/,
    sintoma: "TPM e ciclo desregulado",
    gene: { gene: "CYP1B1", funcao: "processa o estrogênio para ele ser usado e eliminado" },
  },
  {
    chave: /intestin|microbiota|digest/,
    sintoma: "intestino preso ou inchado",
    gene: { gene: "FUT2", funcao: "prepara o intestino para alimentar a sua microbiota" },
  },
  {
    chave: /energia|fadiga|cansa[cç]o/,
    sintoma: "cansaço que não passa",
    gene: { gene: "CLOCK", funcao: "o relógio que organiza o sono e a energia do dia" },
  },
  {
    chave: /\bsono\b|ins[oô]nia/,
    sintoma: "sono que não descansa",
    gene: { gene: "CLOCK", funcao: "o relógio que organiza o sono e a energia do dia" },
  },
  {
    chave: /inflama|\bdor\b|\bdores\b/,
    sintoma: "dor e inflamação que vão e voltam",
    gene: { gene: "IL6", funcao: "o sinal de alarme da inflamação" },
  },
  {
    chave: /tire[oó]i/,
    sintoma: "metabolismo lento e frio fora de hora",
    gene: { gene: "DIO1", funcao: "converte o hormônio da tireoide na forma que o corpo usa" },
  },
  {
    chave: /cardiometab|colesterol|glicose|press[aã]o/,
    sintoma: "colesterol e glicose fora do lugar",
    gene: { gene: "APOE", funcao: "transporta o colesterol e as gorduras pelo corpo" },
  },
  {
    chave: /reprodutiv|fertilidade|engravidar|tentante/,
    sintoma: "dificuldade para engravidar",
    gene: { gene: "MTHFR", funcao: "ativa o folato, peça-chave para a gestação" },
  },
  {
    chave: /gesta[cç][aã]o|gestante|p[oó]s-parto|puerp/,
    sintoma: "cansaço e enjoo na gestação",
    gene: { gene: "MTHFR", funcao: "ativa o folato, peça-chave para a gestação" },
  },
  {
    chave: /performance|massa muscular|treino|esport/,
    sintoma: "treino que não rende",
    gene: { gene: "ACTN3", funcao: "a fibra muscular de força e explosão" },
  },
  {
    chave: /longevidade|preven[cç][aã]o|envelhec/,
    sintoma: "disposição caindo com os anos",
    gene: { gene: "SOD2", funcao: "a enzima antioxidante que protege as suas células" },
  },
  {
    chave: /pele|cabelo|unha/,
    sintoma: "queda de cabelo e unha fraca",
    gene: { gene: "SOD2", funcao: "a enzima antioxidante que protege as suas células" },
  },
  {
    chave: /neuroend|ansiedade|humor|foco|sa[uú]de mental|emo[cç]/,
    sintoma: "ansiedade e cabeça que não desliga",
    gene: { gene: "COMT", funcao: "regula o ritmo mental e emocional" },
  },
];

/** Quem não respondeu o questionário recebe o molde como a Aline desenhou. */
const GENES_PADRAO: Gene[] = [
  { gene: "FTO", funcao: "o gerente do peso: fome, saciedade e o que vira gordura" },
  { gene: "IL6", funcao: "o sinal de alarme da inflamação" },
  { gene: "FUT2", funcao: "prepara o intestino para alimentar a sua microbiota" },
];

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** As áreas que ela atende, na ordem em que aparecem no texto dela. */
function areasDoTexto(textos: string[]): Area[] {
  const achadas: { area: Area; pos: number; ordem: number }[] = [];
  textos.forEach((t, ordem) => {
    const texto = (t ?? "").toLowerCase();
    const limpo = semAcento(texto);
    for (const area of AREAS) {
      const m = texto.match(area.chave) ?? limpo.match(area.chave);
      if (m && m.index !== undefined) achadas.push({ area, pos: m.index, ordem });
    }
  });
  achadas.sort((a, b) => a.ordem - b.ordem || a.pos - b.pos);
  const vistas = new Set<Area>();
  return achadas.map((a) => a.area).filter((a) => (vistas.has(a) ? false : (vistas.add(a), true)));
}

/** Os 5 sintomas do slide 2: os do nicho dela, completados pelos do molde. */
export function sintomasDoNicho(textos: string[]): string[] {
  const out: string[] = [];
  for (const a of areasDoTexto(textos)) {
    if (out.length >= 5) break;
    if (!out.includes(a.sintoma)) out.push(a.sintoma);
  }
  for (const s of SINTOMAS_DO_MOLDE) {
    if (out.length >= 5) break;
    // "peso que não se mexe" e "peso que não sai do lugar" são o mesmo sintoma.
    if (out.some((o) => o.split(" ")[0] === s.split(" ")[0])) continue;
    out.push(s);
  }
  return out.slice(0, 5);
}

/** Os 3 genes do slide 3: os do nicho dela, sem repetir, completados pelo padrão. */
export function genesDoNicho(textos: string[]): Gene[] {
  const out: Gene[] = [];
  for (const a of areasDoTexto(textos)) {
    if (out.length >= 3) break;
    if (!out.some((g) => g.gene === a.gene.gene)) out.push(a.gene);
  }
  for (const g of GENES_PADRAO) {
    if (out.length >= 3) break;
    if (!out.some((o) => o.gene === g.gene)) out.push(g);
  }
  return out;
}

/**
 * O título do último slide. Não temos o gênero da profissional no cadastro, e
 * "Detetive" não muda: "a sua Detetive" só sai quando o primeiro nome é
 * claramente feminino. Nos outros casos sai "Detetive da Saúde", sem artigo,
 * que serve pra qualquer pessoa. Nunca se adivinha o masculino.
 */
export function tituloDetetive(nome: string | null | undefined): string {
  const primeiro = semAcento((nome ?? "").replace(/^(dra?\.?|nutri)\s+/i, "").trim().split(/\s+/)[0] ?? "");
  const feminino = /a$/.test(primeiro) || /(ane|ine|ene|one|elle|ise|ice|ette)$/.test(primeiro);
  return feminino ? "a sua Detetive da Saúde" : "Detetive da Saúde";
}

export type PersonalizacaoFabrica = {
  handle: string;
  primaria: string;
  secundaria: string;
  sintomas: string[];
  genes: Gene[];
  detetive: string;
  logo: string | null;
  foto: string | null;
};

function hexValido(h: unknown): string | null {
  const s = typeof h === "string" ? h.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toUpperCase() : null;
}

export function personalizacaoFabrica(f: {
  nome: string | null;
  handle: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  textosDoPublico: string[];
  logo: string | null;
  foto: string | null;
}): PersonalizacaoFabrica {
  const handle = (f.handle ?? "").trim().replace(/^@+/, "");
  const primaria = hexValido(f.corPrimaria) ?? "#0ABFBC";
  return {
    handle: handle ? `@${handle}` : "",
    primaria,
    secundaria: hexValido(f.corSecundaria) ?? primaria,
    sintomas: sintomasDoNicho(f.textosDoPublico),
    genes: genesDoNicho(f.textosDoPublico),
    detetive: tituloDetetive(f.nome),
    logo: f.logo && /^https:\/\//.test(f.logo) ? f.logo : null,
    foto: f.foto && /^https:\/\//.test(f.foto) ? f.foto : null,
  };
}
