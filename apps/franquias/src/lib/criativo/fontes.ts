/**
 * Os três estilos de fonte que a profissional escolhe no editor de arte
 * (Aline, 22/09/2026: "não tem opções de trocar a fonte da letra... umas três
 * opções para a pessoa visualizar... ela consegue ver uma pré-visualização
 * antes de gerar. Mas ela vai selecionar uma daquelas três").
 *
 * 🔴 SÃO TRÊS E ELAS JÁ ESTÃO EMBUTIDAS. Playfair, Montserrat e Montserrat
 * 900 vivem em base64 dentro do motor de arte desde sempre — não há fonte pra
 * baixar, nem no servidor nem no navegador dela. A amostra de cada chip é um
 * SVG com os glifos JÁ VETORIZADOS pela mesma fonte que desenha o card
 * (`scripts/gerar-amostras-fonte.mjs`); escrever o exemplo em CSS mentiria,
 * porque o navegador dela cairia numa serifada qualquer.
 *
 * 🔴 SÓ O TÍTULO MUDA. Subtítulo, corpo, itens da lista e @handle continuam
 * em Montserrat nos três — é a fonte de LEITURA, e trocá-la piora a
 * legibilidade justamente onde a paciente precisa ler.
 */
export type IdFonte = "classica" | "impacto" | "leve";

export type OpcaoFonte = {
  id: IdFonte;
  nome: string;
  desc: string;
  /** Amostra vetorizada com a fonte de verdade (public/fontes). */
  amostra: string;
};

export const FONTES: readonly OpcaoFonte[] = [
  {
    id: "classica",
    nome: "Clássica",
    desc: "serifada, elegante",
    amostra: "/fontes/classica.svg",
  },
  {
    id: "impacto",
    nome: "Impacto",
    desc: "grossa, lê de longe",
    amostra: "/fontes/impacto.svg",
  },
  {
    id: "leve",
    nome: "Leve",
    desc: "fina, discreta",
    amostra: "/fontes/leve.svg",
  },
];

/** A escolha padrão do editor. Nenhuma arte antiga muda por causa dela. */
export const FONTE_PADRAO: IdFonte = "classica";

/** Aceita só os três; qualquer outra coisa vira `undefined` (= layout decide). */
export function normalizarFonte(valor: unknown): IdFonte | undefined {
  if (typeof valor !== "string") return undefined;
  const v = valor.trim().toLowerCase();
  return FONTES.some((f) => f.id === v) ? (v as IdFonte) : undefined;
}
