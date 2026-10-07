/**
 * O tema em alta vira ASSUNTO de um post da semana, não sugestão.
 *
 * 🔴 O caso (Viviane, 06/10/2026): "adorei os temas em alta, mas não vi eles
 * nos posts". Os temas existiam (tendencias_diarias do nicho dela, um lote por
 * dia) e entravam no prompt de TODOS os posts como "use como inspiração se
 * casar… não force encaixe", embaixo da instrução forte da Jornada até o Teste.
 * O modelo sempre escolhia a instrução forte: nenhum post da semana de 05/10
 * citava um tema em alta.
 *
 * Agora UM post do feed (o de reconhecimento, que é conteúdo e não oferta)
 * entra pelo tema em alta mais relevante do dia, como assunto obrigatório. O
 * papel dele na semana continua o mesmo (o nível de consciência não muda),
 * e o card mostra qual tema ele usou. Os demais posts seguem a estratégia.
 *
 * 🔴 Tema que bate no "não atende" dela é pulado (régua do revisor de copy):
 * post sobre gestação pra quem não atende gestante é exatamente o que o
 * público declarado existe pra impedir.
 */
import { termosDoNaoAtende, normPos } from "../claude/revisor-copy.ts";

export type TemaEmAlta = { tema: string; resumo?: string | null };

type SlotMinimo = {
  tipo: string;
  angulo: string;
  consciencia: string;
  papel: string;
  instrucao: string;
};

const COMERCIAIS = new Set(["divulgacao_produto", "chamada_direta"]);
const NIVEIS_CONTEUDO = new Set(["inconsciente", "consciente_problema"]);

function bateNaoAtende(texto: string, termos: string[]): boolean {
  if (termos.length === 0) return false;
  const alvo = normPos(texto);
  return termos.some((t) => {
    const corpo = t.length >= 5 ? `${t.slice(0, 5)}\\p{L}{0,12}` : t;
    return new RegExp(`(?<![\\p{L}\\p{N}])${corpo}(?![\\p{L}\\p{N}])`, "iu").test(alvo);
  });
}

/** O tema da semana: o primeiro da lista (já vem por relevância) que ela atende. */
export function escolherTemaEmAlta(
  tendencias: Array<Record<string, unknown>>,
  naoAtende?: string | null,
): TemaEmAlta | null {
  const termos = termosDoNaoAtende(naoAtende);
  for (const t of tendencias) {
    const tema = typeof t.tema === "string" ? t.tema.trim() : "";
    if (!tema) continue;
    const resumo = typeof t.resumo === "string" ? t.resumo.trim() : null;
    if (bateNaoAtende(`${tema} ${resumo ?? ""}`, termos)) continue;
    return { tema, resumo };
  }
  return null;
}

/** O post que recebe o tema: conteúdo do feed, nunca oferta nem stories. */
export function indiceDoSlotTemaEmAlta(slots: SlotMinimo[]): number {
  const conteudo = (s: SlotMinimo) => s.tipo !== "stories" && !COMERCIAIS.has(s.angulo);
  const i = slots.findIndex((s) => conteudo(s) && NIVEIS_CONTEUDO.has(s.consciencia));
  return i >= 0 ? i : slots.findIndex(conteudo);
}

export function aplicarTemaEmAlta<S extends SlotMinimo>(
  slots: S[],
  tema: TemaEmAlta | null,
): { slots: S[]; usado: TemaEmAlta | null } {
  if (!tema) return { slots, usado: null };
  const i = indiceDoSlotTemaEmAlta(slots);
  if (i < 0) return { slots, usado: null };
  const s = slots[i]!;
  const bloco = [
    `TEMA EM ALTA DESTA SEMANA (ASSUNTO OBRIGATÓRIO deste post, não é sugestão): "${tema.tema}"${
      tema.resumo ? `. Contexto: ${tema.resumo}` : ""
    }.`,
    "O post entra por esse assunto (gancho e tema central) e leva para a leitura da profissional pela Fábrica da Saúde, mantendo o PAPEL deste post na semana descrito abaixo.",
    "Não opine sobre conduta médica, remédio ou procedimento citado no tema: fale do que a nutrição observa e faz. Não afirme que a seguidora tem a condição. Não cite fonte, veículo nem número que não esteja no tema.",
  ].join("\n");
  const novo: S = {
    ...s,
    papel: `Tema em alta: ${tema.tema}. ${s.papel}`,
    instrucao: `${bloco}\n\n${s.instrucao}`,
  };
  const copia = slots.slice();
  copia[i] = novo;
  return { slots: copia, usado: tema };
}
