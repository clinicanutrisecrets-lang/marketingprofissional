/**
 * Radar de temas em alta do Studio (Aline, 14/10/2026: "não é pra eu escrever
 * o que está em alta, é o seu trabalho procurar").
 *
 * Diferente do radar das franqueadas (apps/franquias/lib/tendencias), que
 * DESCARTA de propósito celebridade e manchete nacional pra profissionais de
 * nichos diferentes não receberem os mesmos temas: aqui o assunto que todo
 * mundo está comentando (famoso que relata um problema de saúde, série ou
 * documentário, viral das redes) É o que se procura, e a leitura dela é o
 * que diferencia o post.
 *
 * Puro de propósito: o teste roda com node.
 */

export type Manchete = { titulo: string; fonte: string; url: string; dataPub: string };

/** Buscas no Google News (últimos 7 dias): onde a cultura encosta na saúde. */
export const BUSCAS_EM_ALTA = [
  "famosa revela diagnóstico",
  "famoso revela problema de saúde",
  "atriz revela rotina alimentação",
  "celebridade intestino",
  "celebridade hormônios menopausa",
  "documentário Netflix saúde",
  "série saúde alimentação",
  "viraliza nas redes dieta",
  "tendência TikTok alimentação",
  "estudo viraliza saúde",
] as const;

export function urlBusca(q: string, dias = 7): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:${dias}d&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
}

function tag(xml: string, nome: string): string {
  const m = xml.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`));
  return (m?.[1] ?? "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

/** O Google News põe " - Veículo" no fim do título: sai daqui. */
export function lerRss(xml: string, max = 8): Manchete[] {
  return xml.split("<item>").slice(1, max + 1).map((raw) => {
    const fonte = tag(raw, "source");
    let titulo = tag(raw, "title");
    if (fonte && titulo.endsWith(` - ${fonte}`)) titulo = titulo.slice(0, -(fonte.length + 3));
    return { titulo: titulo.trim(), fonte, url: tag(raw, "link"), dataPub: tag(raw, "pubDate") };
  }).filter((m) => m.titulo.length > 15);
}

/** Mesma notícia em vários veículos: fica a primeira (sem acento, sem caixa). */
export function semRepetidas(lista: Manchete[]): Manchete[] {
  const vistas = new Set<string>();
  const out: Manchete[] = [];
  for (const m of lista) {
    const chave = m.titulo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").slice(0, 7).join(" ");
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    out.push(m);
  }
  return out;
}

export const MAX_TEMA = { fato: 220, angulo: 220, assunto: 120 } as const;

export const FERRAMENTA_RADAR = {
  name: "temas_em_alta",
  description: "Escolhe as manchetes que viram post pela leitura da profissional.",
  input_schema: {
    type: "object" as const,
    properties: {
      temas: {
        type: "array",
        description: "De 0 a 5 temas, do mais forte pro mais fraco. Melhor 2 bons que 5 fracos.",
        items: {
          type: "object",
          properties: {
            indice: { type: "number", description: "O número da manchete na lista." },
            fato: { type: "string", description: `O que aconteceu, em uma frase, SÓ com o que está na manchete. Até ${MAX_TEMA.fato} caracteres.` },
            angulo: { type: "string", description: `A leitura da profissional: o que a Fábrica da Saúde explica sobre isso pra quem lê. Até ${MAX_TEMA.angulo} caracteres.` },
            assunto: { type: "string", description: `O assunto de saúde em palavras de curadoria (sistema, nutriente, marcador, gene ou processo). Até ${MAX_TEMA.assunto} caracteres.` },
            relevancia: { type: "number", description: "De 1 a 10: o quanto isso está sendo comentado E rende uma boa leitura." },
          },
          required: ["indice", "fato", "angulo", "assunto", "relevancia"],
        },
      },
    },
    required: ["temas"],
  },
};

export const REGRAS_RADAR = [
  "Você escolhe, entre manchetes do momento, as que viram um bom post de Instagram pela leitura de uma nutricionista de precisão (Fábrica da Saúde: genética, exames, microbiota, hormônios, inflamação, sono, sistema nervoso).",
  "O assunto em alta é o GANCHO: famoso que relata um problema de saúde, série ou documentário, algo que viralizou, um estudo que todo mundo está compartilhando.",
  "ESCOLHA quando: muita gente vai ter ouvido falar E dá pra explicar o mecanismo por trás de um jeito útil pra quem lê.",
  "DESCARTE: crime, política, morte, câncer ou doença grave de alguém (não se faz conteúdo em cima da dor de uma pessoa), emagrecimento de famoso, remédio pra emagrecer, dieta milagrosa, fofoca sem saúde, esporte sem saúde, e o que não tem leitura nutricional honesta.",
  "O FATO usa só o que está na manchete: nunca acrescente detalhe, número, fala ou conclusão.",
  "Nunca trate o famoso como paciente: o post não diagnostica nem opina sobre a saúde dele, explica o tema pra quem lê.",
  "Zero travessão. Português do Brasil com acentos. Nunca escreva IA nem inteligência artificial.",
].join("\n");

export type TemaEscolhido = {
  manchete: Manchete;
  fato: string;
  angulo: string;
  assunto: string;
  relevancia: number;
};

function limpo(v: unknown, max: number): string {
  const t = typeof v === "string" ? v.replace(/\s+/g, " ").replace(/[—–]/g, ",").trim() : "";
  return t.slice(0, max);
}

/** Guarda só o que aponta pra manchete real e tem os três textos. */
export function validarTemas(bruto: unknown, manchetes: Manchete[]): TemaEscolhido[] {
  const lista = Array.isArray((bruto as { temas?: unknown })?.temas) ? (bruto as { temas: unknown[] }).temas : [];
  const out: TemaEscolhido[] = [];
  const usados = new Set<number>();
  for (const item of lista) {
    const b = (item ?? {}) as Record<string, unknown>;
    const i = Number(b.indice) - 1;
    if (!Number.isInteger(i) || i < 0 || i >= manchetes.length || usados.has(i)) continue;
    const fato = limpo(b.fato, MAX_TEMA.fato);
    const angulo = limpo(b.angulo, MAX_TEMA.angulo);
    const assunto = limpo(b.assunto, MAX_TEMA.assunto);
    if (fato.length < 12 || angulo.length < 12 || assunto.length < 3) continue;
    if (/(?<![\p{L}])IA(?![\p{L}])/u.test(`${fato} ${angulo}`)) continue;
    const r = Math.round(Number(b.relevancia));
    usados.add(i);
    out.push({ manchete: manchetes[i]!, fato, angulo, assunto, relevancia: Number.isFinite(r) ? Math.min(10, Math.max(1, r)) : 5 });
  }
  return out.sort((a, b) => b.relevancia - a.relevancia).slice(0, 5);
}

/** O texto que vira o "tema" do post: o fato + a leitura. */
export function temaParaPost(t: { fato: string; angulo: string }): string {
  return `${t.fato} Leitura: ${t.angulo}`.slice(0, 400);
}
