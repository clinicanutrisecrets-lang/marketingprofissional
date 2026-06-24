/**
 * Índice de autoridade de um post — separa VAIDADE (curtidas) de sinais que
 * realmente constroem autoridade e trazem paciente (salvamentos, compartilhamentos,
 * comentários, cliques no link). Lógica pura → testável.
 */

export type MetricasPost = {
  alcance: number | null;
  curtidas: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  salvamentos: number | null;
  cliques_link: number | null;
};

export type ClasseAutoridade = "autoridade" | "equilibrado" | "vaidade" | "sem_dados";

// Pesos: salvar/compartilhar valem muito (intenção real); curtir quase nada (vaidade).
const PESOS = {
  salvamentos: 3,
  compartilhamentos: 3,
  comentarios: 2,
  cliques_link: 2,
  curtidas: 0.2,
} as const;

export type ScoreAutoridade = {
  /** soma ponderada das ações */
  pontos: number;
  /** pontos por alcance (comparável entre posts de tamanhos diferentes) */
  taxa: number;
  classe: ClasseAutoridade;
};

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function scoreAutoridade(m: MetricasPost): ScoreAutoridade {
  const salv = n(m.salvamentos);
  const comp = n(m.compartilhamentos);
  const coment = n(m.comentarios);
  const cliques = n(m.cliques_link);
  const curt = n(m.curtidas);
  const alcance = n(m.alcance);

  const acoesTotais = salv + comp + coment + cliques + curt;
  if (alcance === 0 || acoesTotais === 0) {
    return { pontos: 0, taxa: 0, classe: "sem_dados" };
  }

  const pontos =
    salv * PESOS.salvamentos +
    comp * PESOS.compartilhamentos +
    coment * PESOS.comentarios +
    cliques * PESOS.cliques_link +
    curt * PESOS.curtidas;

  const taxa = pontos / alcance;

  // razão de "autoridade" vs vaidade: salvar+compartilhar sobre curtidas
  const razao = (salv + comp) / Math.max(1, curt);
  let classe: ClasseAutoridade;
  if (razao >= 0.15) classe = "autoridade";
  else if (razao >= 0.05) classe = "equilibrado";
  else classe = "vaidade";

  return { pontos: Math.round(pontos * 100) / 100, taxa: Math.round(taxa * 10000) / 10000, classe };
}

export type PostComAngulo = MetricasPost & { angulo_copy: string | null };

export type RankingAngulo = {
  angulo: string;
  posts: number;
  taxaMedia: number;
};

/**
 * Agrega a taxa de autoridade média por ângulo — revela quais ângulos constroem
 * autoridade pra essa nutri (pra priorizar no planejamento).
 */
export function rankingAngulosPorAutoridade(posts: PostComAngulo[]): RankingAngulo[] {
  const acc = new Map<string, { soma: number; n: number }>();
  for (const p of posts) {
    const ang = p.angulo_copy ?? "desconhecido";
    const { taxa, classe } = scoreAutoridade(p);
    if (classe === "sem_dados") continue;
    const cur = acc.get(ang) ?? { soma: 0, n: 0 };
    cur.soma += taxa;
    cur.n += 1;
    acc.set(ang, cur);
  }
  return [...acc.entries()]
    .map(([angulo, { soma, n: qtd }]) => ({
      angulo,
      posts: qtd,
      taxaMedia: Math.round((soma / qtd) * 10000) / 10000,
    }))
    .sort((a, b) => b.taxaMedia - a.taxaMedia);
}
