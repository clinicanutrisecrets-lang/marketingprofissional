/**
 * Loop de aprendizado: mede o quanto a nutri edita a copy gerada pela IA.
 * Edição alta num ângulo = a IA está acertando menos ali → sinal pra calibrar.
 * Lógica pura → testável.
 */

/**
 * Taxa de edição entre o texto original da IA e o final (0 = idêntico, 1 = trocou tudo).
 * Usa distância de Levenshtein normalizada pelo tamanho do maior texto.
 */
export function taxaEdicao(original: string | null | undefined, final: string | null | undefined): number {
  const a = (original ?? "").trim();
  const b = (final ?? "").trim();
  if (a === "" && b === "") return 0;
  if (a === "") return 1;
  if (a === b) return 0;
  const dist = levenshtein(a, b);
  return Math.round((dist / Math.max(a.length, b.length)) * 1000) / 1000;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const k = b.length;
  // duas linhas (memória O(min))
  let prev = Array.from({ length: k + 1 }, (_, j) => j);
  let cur = new Array<number>(k + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= k; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + custo);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[k]!;
}

export type PostEdicao = {
  angulo_copy: string | null;
  copy_legenda_ia_original: string | null;
  copy_legenda: string | null;
};

export type EdicaoPorAngulo = {
  angulo: string;
  posts: number;
  taxaEdicaoMedia: number;
};

/**
 * Agrega a taxa de edição média por ângulo. Ângulos com edição alta indicam
 * onde a IA precisa melhorar (ou onde o tom da nutri diverge do gerado).
 */
export function agregarEdicoesPorAngulo(posts: PostEdicao[]): EdicaoPorAngulo[] {
  const acc = new Map<string, { soma: number; n: number }>();
  for (const p of posts) {
    if (!p.copy_legenda_ia_original) continue; // sem baseline da IA → ignora
    const ang = p.angulo_copy ?? "desconhecido";
    const t = taxaEdicao(p.copy_legenda_ia_original, p.copy_legenda);
    const cur = acc.get(ang) ?? { soma: 0, n: 0 };
    cur.soma += t;
    cur.n += 1;
    acc.set(ang, cur);
  }
  return [...acc.entries()]
    .map(([angulo, { soma, n }]) => ({
      angulo,
      posts: n,
      taxaEdicaoMedia: Math.round((soma / n) * 1000) / 1000,
    }))
    .sort((a, b) => b.taxaEdicaoMedia - a.taxaEdicaoMedia);
}
