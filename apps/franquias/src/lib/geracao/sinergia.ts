/**
 * Carrossel de sinergia da semana (Aline, 05/10/2026): 1 carrossel + o trio
 * de stories, toda semana, dentro do pacote de domingo, com a cor e a logo de
 * cada conta.
 *
 * Quem decide o quê:
 *  - a FOTO e a RECEITA vêm do Scanner (/api/integrations/marketing/sinergia),
 *    que é dono das duas. O modelo nunca escreve ingrediente nem modo de
 *    preparo: os ingredientes do slide são linhas copiadas da receita (o
 *    modelo só escolhe QUAIS, pelo índice), e os passos são resumo do modo de
 *    preparo que veio junto;
 *  - o modelo escreve a explicação da sinergia, os três nutrientes e as
 *    linhas de microbiota, nutrigenética e exame;
 *  - este arquivo CONFERE o que o modelo devolveu antes de desenhar.
 *
 * Funções puras: nada de rede nem banco, pra dar pra testar.
 */

/** O que o Scanner devolve. */
export type ReceitaSinergia = {
  chave: string;
  foto_url: string;
  titulo: string;
  temas: string[];
  tipo: "receita" | "cha";
  ingredientes: string[];
  modo_preparo: string;
  tempo_min: number | null;
  rendimento: string | null;
  compostos: string[];
};

export type NutrienteSinergia = {
  nome: string;
  onde: string;
  texto: string;
  /** [rótulo, texto]. Linha que não passa na conferência sai. */
  linhas: [string, string][];
};

export type ConteudoSinergia = {
  titulo_receita: string;
  tema: string;
  subtitulo: string;
  trio: string;
  explicacao: string;
  nutrientes: NutrienteSinergia[];
  ingredientes: string[];
  passos: string[];
  trocas: string[];
  fecho: string;
  tempo: string | null;
  legenda: string;
  cta: string;
  hashtags: string[];
};

/**
 * Genes que o modelo pode citar. Todos têm leitura na curadoria do Scanner e
 * relação conhecida com nutriente. Gene fora desta lista derruba a LINHA de
 * nutrigenética daquele nutriente (o resto do slide fica).
 */
export const GENES_SINERGIA = [
  "MTHFR", "MTR", "MTRR", "BHMT", "PEMT", "FADS1", "FADS2", "ELOVL2", "BCMO1",
  "VDR", "GC", "CYP2R1", "SOD2", "GPX1", "CAT", "NQO1", "GSTP1", "GSTM1",
  "GSTT1", "NFE2L2", "COMT", "MAOA", "TPH1", "TPH2", "SLC6A4", "BDNF",
  "FTO", "MC4R", "TCF7L2", "PPARG", "APOA5", "APOA2", "APOE", "LCT", "MCM6",
  "HFE", "TMPRSS6", "FUT2", "TNF", "IL6", "IL1B", "CRP", "CYP1A2", "CYP1B1",
  "SLC23A1", "SLC30A8", "TRPM6", "CLOCK", "PER2", "CRY1", "MTNR1B", "DAO",
  "AOC1", "HNMT", "ESR1", "CYP17A1", "SHBG", "TFR2", "UCP2", "NOS3", "ACE",
] as const;

/** Siglas em caixa alta que não são gene e podem aparecer na linha. */
const SIGLAS_LIVRES = new Set([
  "EPA", "DHA", "ALA", "DNA", "RNA", "NRF2", "SAME", "ATP", "GABA", "LDL", "HDL",
  "PCR", "TSH", "HPA", "SNP", "ABC", "B12", "B6", "B9", "IL", "TPM", "SOP",
]);

const MAX = {
  titulo_receita: 90,
  tema: 70,
  subtitulo: 130,
  trio: 60,
  explicacao: 230,
  nome: 32,
  onde: 32,
  texto: 220,
  linha: 160,
  passo: 140,
  troca: 60,
  fecho: 80,
} as const;

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function txt(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  // Travessão vira vírgula (regra do projeto); o que passar do teto é cortado
  // pela conferência, que recusa em vez de picotar frase no meio.
  return s.replace(/\s*[—–]\s*/g, ", ").length <= max ? s.replace(/\s*[—–]\s*/g, ", ") : "";
}

/** Siglas de gene numa frase: 2+ letras maiúsculas, com ou sem número. */
export function siglasDaLinha(s: string): string[] {
  return (s.match(/\b[A-Z][A-Z0-9]{1,7}\b/g) ?? []).filter((x) => !SIGLAS_LIVRES.has(x));
}

/** Linha de nutrigenética só vale com gene da lista, e só com genes da lista. */
export function linhaGeneticaValida(s: string): boolean {
  const siglas = siglasDaLinha(s);
  const lista = new Set<string>(GENES_SINERGIA);
  return siglas.length > 0 && siglas.every((g) => lista.has(g));
}

/**
 * Linha de exame (e de nutrigenética) não traz faixa nem número de
 * referência: cada laboratório e cada curadoria tem a sua, e um número no
 * post vira "o ideal" ou "a dose" na cabeça de quem lê.
 */
export function linhaExameValida(s: string): boolean {
  // \b antes do número: sem ela, a sigla "SLC23A1" virava a faixa "23 a 1".
  return !/\b\d+(?:[.,]\d+)?\s*(?:a|-|até)\s*\d+/i.test(s) && !/\b\d+(?:[.,]\d+)?\s*(?:mg|ng|µg|mcg|ui|pg|%|mmol|dl)\b/i.test(s);
}

/**
 * O título exibido pode só CORRIGIR acento e maiúscula do título da receita
 * (as do Lótus vieram do PDF sem acento). Qualquer outra mudança volta ao
 * original: o slide não pode prometer outro prato.
 */
export function tituloDaReceita(original: string, sugerido: unknown): string {
  const s = typeof sugerido === "string" ? sugerido.replace(/\s+/g, " ").trim() : "";
  const base = (x: string) => semAcento(x).replace(/[^a-z0-9]+/g, " ").trim();
  return s && base(s) === base(original) ? s : original;
}

/**
 * Os ingredientes do slide: linhas da receita, escolhidas pelo índice que o
 * modelo devolveu. Índice inválido é ignorado; sem índice válido, as
 * primeiras linhas que não são cabeçalho.
 */
export function ingredientesDoSlide(receita: ReceitaSinergia, indices: unknown, max = 6): string[] {
  const ehCabecalho = (l: string) => /^(ingredientes?|molho|marinada|arroz|recheio|massa)\b.*:?\s*$/i.test(l) && l.length < 40;
  const validos = Array.isArray(indices)
    ? indices
        .map((i) => (typeof i === "number" ? i : Number(i)))
        .filter((i) => Number.isInteger(i) && i >= 0 && i < receita.ingredientes.length)
    : [];
  const unicos = [...new Set(validos)].map((i) => receita.ingredientes[i]).filter((l) => !ehCabecalho(l));
  const escolhidos = unicos.length ? unicos : receita.ingredientes.filter((l) => !ehCabecalho(l));
  return escolhidos.slice(0, max);
}

export function tempoDaReceita(r: ReceitaSinergia): string | null {
  const partes = [r.tempo_min ? `${r.tempo_min} min` : null, r.rendimento].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

export type Conferencia =
  | { ok: true; conteudo: ConteudoSinergia; avisos: string[] }
  | { ok: false; motivo: string };

/** Confere o JSON do modelo contra a receita real. */
export function conferirConteudo(bruto: unknown, receita: ReceitaSinergia): Conferencia {
  if (!bruto || typeof bruto !== "object") return { ok: false, motivo: "resposta sem JSON" };
  const o = bruto as Record<string, unknown>;
  const avisos: string[] = [];

  const nutrientes: NutrienteSinergia[] = [];
  for (const n of Array.isArray(o.nutrientes) ? o.nutrientes : []) {
    if (!n || typeof n !== "object") continue;
    const x = n as Record<string, unknown>;
    const nome = txt(x.nome, MAX.nome);
    const onde = txt(x.onde, MAX.onde);
    const texto = txt(x.texto, MAX.texto);
    if (!nome || !texto) continue;
    const linhas: [string, string][] = [];
    const micro = txt(x.microbiota, MAX.linha);
    if (micro) linhas.push(["Microbiota", micro]);
    const gen = txt(x.nutrigenetica, MAX.linha);
    if (gen && linhaGeneticaValida(gen) && linhaExameValida(gen)) linhas.push(["Nutrigenética", gen]);
    else if (gen) avisos.push(`nutrigenética recusada em ${nome}: ${siglasDaLinha(gen).join(", ") || "sem gene"}`);
    const exame = txt(x.exame, MAX.linha);
    if (exame && linhaExameValida(exame)) linhas.push(["Exame", exame]);
    else if (exame) avisos.push(`exame com faixa numérica em ${nome}`);
    // Slide de nutriente com menos de duas frentes fica vazio e não sustenta
    // a ideia de sinergia: o nutriente sai, e a resposta inteira é refeita.
    if (linhas.length < 2) {
      avisos.push(`${nome} ficou com ${linhas.length} linha(s)`);
      continue;
    }
    nutrientes.push({ nome, onde, texto, linhas });
  }
  if (nutrientes.length < 3) return { ok: false, motivo: `só ${nutrientes.length} nutriente(s) completos` };

  const passos = (Array.isArray(o.passos) ? o.passos : [])
    .map((p) => txt(p, MAX.passo))
    .filter(Boolean)
    .slice(0, 4);
  if (passos.length < 2) return { ok: false, motivo: "preparo sem passos" };

  const tema = txt(o.tema, MAX.tema);
  const explicacao = txt(o.explicacao, MAX.explicacao);
  const legenda = typeof o.legenda === "string" ? o.legenda.replace(/\s*[—–]\s*/g, ", ").trim() : "";
  if (!tema || !explicacao || !legenda) return { ok: false, motivo: "faltou título, explicação ou legenda" };

  const hashtags = (Array.isArray(o.hashtags) ? o.hashtags : [])
    .filter((h): h is string => typeof h === "string")
    .map((h) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, ""))
    .slice(0, 12);

  return {
    ok: true,
    avisos,
    conteudo: {
      titulo_receita: tituloDaReceita(receita.titulo, o.titulo_receita),
      tema,
      subtitulo: txt(o.subtitulo, MAX.subtitulo),
      trio: txt(o.trio, MAX.trio) || nutrientes.slice(0, 3).map((n) => n.nome).join(" • "),
      explicacao,
      nutrientes: nutrientes.slice(0, 3),
      ingredientes: ingredientesDoSlide(receita, o.ingredientes_idx),
      passos,
      trocas: (Array.isArray(o.trocas) ? o.trocas : []).map((t) => txt(t, MAX.troca)).filter(Boolean).slice(0, 3),
      fecho: txt(o.fecho, MAX.fecho) || "Juntos, fazem mais do que sozinhos.",
      tempo: tempoDaReceita(receita),
      legenda,
      cta: txt(o.cta, 160),
      hashtags,
    },
  };
}

/** Dia do carrossel e dos stories: o 3º dia de post da semana (o 2º é o reel animado). */
export function diaDaSinergia(dias: number[]): number {
  const d = [...new Set(dias)].filter((x) => x >= 0 && x <= 6).sort((a, b) => a - b);
  if (!d.length) return 4;
  return d[Math.min(2, d.length - 1)];
}
