/**
 * A estratégia da semana como ela é LIDA (aprovacoes_semanais.estrategia).
 * O dado é JSON gravado pelo gerador; aqui ele é conferido antes de virar
 * tela, porque semana antiga não tem a coluna e linha torta não pode quebrar
 * a página de aprovação. Função pura: roda no teste e no navegador.
 */
export type EstrategiaLida = {
  semana: number;
  total: number;
  titulo: string;
  frase: string;
  passos: string[];
  queixas: string[];
};

export function lerEstrategia(bruto: unknown): EstrategiaLida | null {
  if (!bruto || typeof bruto !== "object") return null;
  const e = bruto as Record<string, unknown>;
  const semana = typeof e.semana === "number" ? e.semana : NaN;
  const total = typeof e.total === "number" ? e.total : NaN;
  if (!Number.isInteger(semana) || !Number.isInteger(total) || semana < 1 || semana > total) return null;
  const titulo = typeof e.titulo === "string" ? e.titulo.trim() : "";
  if (!titulo) return null;
  const textos = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 8) : [];
  return {
    semana,
    total,
    titulo,
    frase: typeof e.frase === "string" ? e.frase.trim() : "",
    passos: textos(e.passos),
    queixas: textos(e.queixas),
  };
}

/** "Semana 2 de 4: A máquina é outra". */
export function linhaEstrategia(e: Pick<EstrategiaLida, "semana" | "total" | "titulo">): string {
  return `Semana ${e.semana} de ${e.total}: ${e.titulo}`;
}
