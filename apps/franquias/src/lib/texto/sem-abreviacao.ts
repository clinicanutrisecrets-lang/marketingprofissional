/**
 * Português por extenso no conteúdo gerado.
 *
 * Pedido da Aline (14/10/2026, olhando a semana da Mariana): "já tinha falado
 * que não é pra nada ficar abreviado, tipo tá ao invés de está". A arte saiu
 * com "Seu exame tá normal" e "Achei que tava só comendo demais".
 *
 * A regra também está no prompt, mas prompt é pedido, não garantia: esta
 * troca é a trava que vale quando o modelo escorrega. Só troca forma
 * coloquial que tem UMA leitura por extenso. "né" e "pq" ficam de fora de
 * propósito: "né" não tem equivalente que caiba em toda frase, e "pq" pode
 * ser "porque" ou "por que" — esses dois vão pro revisor, que só sinaliza.
 */

const TROCAS: Array<[string, string]> = [
  ["tá", "está"],
  ["tás", "estás"],
  ["tava", "estava"],
  ["tavam", "estavam"],
  ["tô", "estou"],
  ["pra", "para"],
  ["pras", "para as"],
  ["pro", "para o"],
  ["pros", "para os"],
  ["cê", "você"],
  ["vc", "você"],
  ["vcs", "vocês"],
  ["tbm", "também"],
  ["tb", "também"],
];

const MAPA = new Map(TROCAS.map(([a, b]) => [a, b]));

// Fronteira de palavra em português: \b não serve ("á" não é \w).
const RE = new RegExp(
  `(?<![\\p{L}\\p{N}@#])(${[...MAPA.keys()].sort((x, y) => y.length - x.length).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

function comCaixa(original: string, troca: string): string {
  if (original === original.toUpperCase() && original !== original.toLowerCase() && original.length > 1) {
    return troca.toUpperCase();
  }
  if (original[0] && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return troca[0]!.toUpperCase() + troca.slice(1);
  }
  return troca;
}

export function semAbreviacao(texto: string): string {
  if (!texto) return texto;
  return texto.replace(RE, (m) => comCaixa(m, MAPA.get(m.toLowerCase()) ?? m));
}

/** Aplica semAbreviacao em TODAS as strings de um valor (arrays e objetos). */
export function semAbreviacaoFundo<T>(valor: T): T {
  if (typeof valor === "string") return semAbreviacao(valor) as unknown as T;
  if (Array.isArray(valor)) return valor.map((v) => semAbreviacaoFundo(v)) as unknown as T;
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      // URL e hashtag não se mexem.
      saida[k] = /url|link|hashtag/i.test(k) ? v : semAbreviacaoFundo(v);
    }
    return saida as unknown as T;
  }
  return valor;
}
