/**
 * Benchmarks de mercado — avalia se o CPL/CAC de uma nutri está
 * dentro do esperado para o nicho + região dela.
 *
 * Os valores ficam seed no banco (ver migration 007_benchmarks_cpl.sql).
 * Este módulo só fornece a lógica de comparação.
 */

export type Avaliacao = "excelente" | "bom" | "mediano" | "ruim";

export type Benchmark = {
  valor_excelente: number;
  valor_bom: number;
  valor_mediano: number;
  valor_ruim: number;
};

/**
 * Dado um valor atual e um benchmark, retorna a avaliação.
 * Quanto MENOR o custo, melhor — então invertemos os limites.
 */
export function avaliarCusto(valor: number, b: Benchmark): Avaliacao {
  if (valor <= b.valor_excelente) return "excelente";
  if (valor <= b.valor_bom) return "bom";
  if (valor <= b.valor_mediano) return "mediano";
  return "ruim";
}

export function avaliacaoEmUI(a: Avaliacao) {
  const map = {
    excelente: { emoji: "🌟", label: "Excelente", cor: "#059669" },
    bom: { emoji: "🟢", label: "Bom", cor: "#10B981" },
    mediano: { emoji: "🟡", label: "Mediano", cor: "#F59E0B" },
    ruim: { emoji: "🔴", label: "Ruim — pausar e trocar criativo", cor: "#EF4444" },
  };
  return map[a];
}

/**
 * Calcula percentual de diferença em relação ao benchmark mediano.
 * Negativo = melhor que a média. Positivo = pior.
 */
export function percentDiffMediano(valor: number, b: Benchmark): number {
  return Math.round(((valor - b.valor_mediano) / b.valor_mediano) * 100);
}
