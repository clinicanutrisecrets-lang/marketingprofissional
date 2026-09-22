import type { FamiliaFonte } from "./textVector";

/**
 * Estilo de fonte escolhido pela profissional (Aline, 22/09/2026: "não tem
 * opções de trocar a fonte da letra — daria para pôr umas três opções para a
 * pessoa visualizar... ela consegue ver uma pré-visualização antes de gerar").
 *
 * 🔴 SÃO TRÊS, E SÓ TROCAM O TÍTULO. O texto de apoio (subtítulo, corpo,
 * itens da lista, @handle) continua em Montserrat nos três — é a fonte de
 * LEITURA, e trocá-la por uma serifada ou por um peso 900 num parágrafo de
 * 1080px piora a legibilidade justamente onde a paciente precisa ler. Quem
 * carrega o estilo da peça é o título.
 *
 * 🔴 SEM ESCOLHA, NADA MUDA. `resolverFamiliaTitulo(undefined, padrão)`
 * devolve o padrão daquele layout, então toda arte que já existe sai byte a
 * byte igual — a escolha é ADITIVA, nunca um redesenho da base inteira.
 */
export type EstiloFonte = "classica" | "impacto" | "leve";

export const ESTILOS_FONTE: readonly EstiloFonte[] = ["classica", "impacto", "leve"];

/** A família do TÍTULO de cada estilo. O apoio é sempre "sans". */
const FAMILIA_DO_ESTILO: Record<EstiloFonte, FamiliaFonte> = {
  classica: "serif", // Playfair Display
  impacto: "sans-black", // Montserrat 900 (instância estática de verdade)
  leve: "sans", // Montserrat
};

/** Aceita só os três; qualquer outra coisa é `undefined` (= layout decide). */
export function normalizarEstiloFonte(valor: unknown): EstiloFonte | undefined {
  if (typeof valor !== "string") return undefined;
  const v = valor.trim().toLowerCase();
  return (ESTILOS_FONTE as readonly string[]).includes(v) ? (v as EstiloFonte) : undefined;
}

/**
 * A família que o título deve usar. `padraoDoLayout` é o que aquele layout
 * já fazia — é ele que vale quando a profissional não escolheu nada.
 */
export function resolverFamiliaTitulo(
  estilo: EstiloFonte | undefined,
  padraoDoLayout: FamiliaFonte,
): FamiliaFonte {
  if (!estilo) return padraoDoLayout;
  return FAMILIA_DO_ESTILO[estilo];
}
