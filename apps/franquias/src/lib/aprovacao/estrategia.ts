/**
 * A estratégia da semana como ela é LIDA (aprovacoes_semanais.estrategia).
 * O dado é JSON gravado pelo gerador; aqui ele é conferido antes de virar
 * tela, porque semana antiga não tem a coluna e linha torta não pode quebrar
 * a página de aprovação. Função pura: roda no teste e no navegador.
 *
 * Acento na leitura (15/10/2026): semana gravada antes do conserto do rótulo
 * do nicho tem "quem procura nutricao funcional"; a tela mostra com acento
 * sem reescrever o banco.
 */
import { acentuarVisivel } from "../texto/acentos-visivel.ts";

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
  const titulo = typeof e.titulo === "string" ? acentuarVisivel(e.titulo.trim()) : "";
  if (!titulo) return null;
  const textos = (v: unknown) =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 8).map((x) => acentuarVisivel(x))
      : [];
  return {
    semana,
    total,
    titulo,
    frase: typeof e.frase === "string" ? acentuarVisivel(e.frase.trim()) : "",
    passos: textos(e.passos),
    queixas: textos(e.queixas),
  };
}

/** "Estratégia da semana: O que o teste investiga". */
export function linhaEstrategia(e: Pick<EstrategiaLida, "titulo">): string {
  return `Estratégia da semana: ${e.titulo}`;
}
