/**
 * Rótulo por extenso, com acento, dos ids internos que entram em texto.
 *
 * Caso que originou (15/10/2026): o guia da semana e o lembrete dos posts
 * saíam com "a queixa mais comum de quem procura nutricao funcional" e
 * "saude feminina". O id ('nutricao_funcional') virava texto trocando "_"
 * por espaço, sem acento.
 *
 * 🔴 O id continua sendo o id (banco, comparação, busca). Esta lib só existe
 * pro momento em que ele vai ser LIDO por alguém (tela, prompt, post).
 * Nicho novo que não está no mapa não quebra: vira o id sem sublinhado,
 * passado pela lista de acentos sem ambiguidade.
 */

import { acentuar } from "../acentos-ptbr.ts";

/** Como o nicho aparece numa frase ("quem procura ___"). */
export const ROTULO_NICHO: Record<string, string> = {
  nutricao_funcional: "nutrição funcional",
  nutricao_esportiva: "nutrição esportiva",
  emagrecimento: "emagrecimento",
  nutricao_oncologica: "nutrição oncológica",
  materno_infantil: "saúde materno-infantil",
  longevidade: "longevidade",
  saude_feminina: "saúde feminina",
  fertilidade_gestacao: "fertilidade e gestação",
  autoimune_intestino: "saúde autoimune e intestinal",
  outro: "saúde",
};

/** Tom de comunicação (bate com TONS_OPCOES do onboarding). */
export const ROTULO_TOM: Record<string, string> = {
  cientifico_acessivel: "científico acessível",
  empatico_acolhedor: "empático acolhedor",
  direto_motivacional: "direto motivacional",
  sofisticado_premium: "sofisticado premium",
  leve_descontraido: "leve descontraído",
};

/** Qualquer id em snake_case vira texto com acento (fallback). */
export function rotuloDeId(id: string | null | undefined): string {
  return acentuar(String(id ?? "").replace(/_/g, " ").trim());
}

export function rotuloNicho(nicho: string | null | undefined): string {
  const k = String(nicho ?? "").trim();
  return ROTULO_NICHO[k] ?? rotuloDeId(k);
}

export function rotuloTom(tom: string | null | undefined): string {
  const k = String(tom ?? "").trim();
  return ROTULO_TOM[k] ?? rotuloDeId(k);
}
