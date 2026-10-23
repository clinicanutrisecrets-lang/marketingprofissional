/**
 * Campanha de Black Friday nos pacotes de domingo (Aline, 23/10/2026).
 *
 * Do pacote de 25/10 até o de 22/11, a semana mistura conteúdo com
 * antecipação do dia 27 de novembro, crescendo até a data:
 *
 *   semana de 26/10 e 02/11 → 1 post
 *   semana de 09/11         → 2 posts
 *   semana de 16/11 e 23/11 → 3 posts + stories de contagem regressiva
 *
 * O bônus é o mesmo para todo mundo do Consultório: quem fizer o teste
 * genético ganha a Leitura Epigenética Funcional. Se ela definiu um bônus
 * próprio no Scanner, ele entra junto, como ela escreveu.
 *
 * Duas formas de vender, que ela escolhe na Loja ao montar a página:
 *  • `so_dia`   → vende só no dia 27: os posts fazem contagem regressiva;
 *  • `mes_todo` → a condição já vale e vai até o dia 27: os posts chamam
 *                 para começar agora, com o prazo de 27/11.
 * Sem resposta, vale `so_dia` (é o que a página faz por padrão).
 *
 * Quem respondeu "nenhuma" para a Black Friday no Scanner fica fora.
 * Função pura: roda no teste.
 */

import { temPalavraDePromocao, type DataComemorativaEscolhida, type PreferenciasScanner } from "./preferencias-scanner.ts";

export const DATA_BLACK_FRIDAY = "2026-11-27";

export type ModoBlackFriday = "so_dia" | "mes_todo";

/** O que o Scanner manda sobre a página de Black Friday dela (pode faltar). */
export type BlackFridayDaConta = {
  modo: ModoBlackFriday;
  /** Link da página de Black Friday, quando ela existe e está no ar. */
  link: string | null;
};

/** Posts de Black Friday por semana (a chave é a segunda-feira da semana). */
const RITMO: Record<string, number> = {
  "2026-10-26": 1,
  "2026-11-02": 1,
  "2026-11-09": 2,
  "2026-11-16": 3,
  "2026-11-23": 3,
};
/** Semanas em que os stories da estratégia viram contagem regressiva. */
const STORIES_CONTAGEM = new Set(["2026-11-16", "2026-11-23"]);

const DIA_MS = 86_400_000;

export function postsDeBlackFriday(semanaRef: string): number {
  return RITMO[semanaRef] ?? 0;
}

/** Data (YYYY-MM-DD) do dia da semana `dia` (0 = domingo) da semana que começa na segunda `semanaRef`. */
export function dataDoSlot(semanaRef: string, dia: number): string {
  const ini = Date.parse(`${semanaRef}T00:00:00Z`);
  const desloc = (dia - 1 + 7) % 7;
  return new Date(ini + desloc * DIA_MS).toISOString().slice(0, 10);
}

/** Dias que faltam do `iso` até a Black Friday (0 = é o dia). */
export function diasAteBlackFriday(iso: string): number {
  return Math.round((Date.parse(`${DATA_BLACK_FRIDAY}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / DIA_MS);
}

/** A resposta dela no Scanner sobre a Black Friday deste ano, se houver. */
export function respostaBlackFriday(prefs: PreferenciasScanner | null): DataComemorativaEscolhida | null {
  return prefs?.datas.find((d) => d.chave.startsWith("black_friday") && d.data === DATA_BLACK_FRIDAY) ?? null;
}

export function validarBlackFridayDaConta(bruto: unknown): BlackFridayDaConta | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const modo: ModoBlackFriday = o.modo === "mes_todo" ? "mes_todo" : "so_dia";
  const link =
    typeof o.link === "string" && /^https:\/\/[^\s"'<>]+$/.test(o.link.trim()) ? o.link.trim().slice(0, 300) : null;
  return { modo, link };
}

type SlotMinimo = {
  dia: number;
  tipo: string;
  angulo: string;
  papel: string;
  instrucao: string;
};

const COMERCIAIS = new Set(["divulgacao_produto", "chamada_direta"]);
const ehTemaEmAlta = (s: SlotMinimo) => s.papel.startsWith("Tema em alta:");

const LEITURA =
  "a Leitura Epigenética Funcional: uma leitura por correlação, feita a partir dos dados da própria pessoa (não é um exame de laboratório a mais), que mostra logo na primeira consulta quais genes cuidar primeiro";

const diasPorExtenso = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);

/** O que este post diz da Black Friday, pela distância até o dia 27 e pela forma de vender. */
export function blocoBlackFriday(params: {
  dias: number;
  modo: ModoBlackFriday;
  link: string | null;
  bonusDela: string | null;
  stories?: boolean;
}): string {
  const { dias, modo, link, bonusDela } = params;
  const bonus =
    `O bônus da Black Friday é ${LEITURA}. Ele vem para quem começar a consulta com o teste genético.` +
    (bonusDela ? ` Além dele, a profissional oferece este bônus, escrito por ela: "${bonusDela}". Escreva como ela escreveu, sem acrescentar nada.` : "");
  let fase: string;
  if (modo === "mes_todo") {
    fase =
      dias === 0
        ? "É O ÚLTIMO DIA: a condição de Black Friday termina hoje, 27 de novembro. Chame para garantir hoje."
        : dias <= 3
          ? `ÚLTIMOS DIAS: faltam ${diasPorExtenso(dias)} para terminar (vai até 27 de novembro). Chame para garantir antes do prazo.`
          : `JÁ ESTÁ VALENDO: quem começar a partir de agora, até 27 de novembro, já ganha o bônus. Chame para começar agora.`;
  } else {
    fase =
      dias === 0
        ? "É HOJE: a Black Friday é hoje, 27 de novembro, e o bônus vale só hoje. Chame para garantir hoje."
        : dias <= 3
          ? `CONTAGEM REGRESSIVA: faltam ${diasPorExtenso(dias)} para a Black Friday (27 de novembro), o único dia do bônus. Peça para ativar o lembrete e não perder.`
          : dias <= 14
            ? "REVELE O BÔNUS: explique o bônus com calma, em palavras de gente, e diga que ele vale só no dia 27 de novembro."
            : "ANTECIPAÇÃO LEVE: o post é de CONTEÚDO, sobre o assunto dele. Só no final, avise que no dia 27 de novembro vai ter um bônus especial para quem começar com o teste genético, e peça para ficar de olho. Não revele tudo agora.";
  }
  const cta = link
    ? `Na legenda, chame para o "link na bio". No campo copy_cta, use EXATAMENTE este link, e nenhum outro: ${link}`
    : 'Não use link de checkout do catálogo neste post: chame para o direct ("me chama no direct" ou "comente QUERO").';
  return [
    `BLACK FRIDAY, 27 DE NOVEMBRO (ASSUNTO OBRIGATÓRIO deste ${params.stories ? "stories" : "post"}, não é sugestão).`,
    fase,
    bonus,
    "Pelo código de ética: é sempre BÔNUS. NUNCA use promoção, desconto, oferta, preço, porcentagem, 'off', valor em reais, 'grátis' nem prazo ou número que não estejam aqui.",
    "Ligue a data ao cuidado com a saúde: o melhor presente desta Black Friday é entender o próprio corpo.",
    cta,
  ].join("\n");
}

/**
 * O post de produto da jornada pede "nome, preço e link EXATAMENTE como no
 * catálogo". No catálogo está a oferta de sempre, com o preço de sempre: num
 * post de Black Friday isso anunciaria o preço errado. A regra da Black Friday
 * vence, e vem por último pra não ficar ambíguo.
 */
export const PRIORIDADE =
  "PRIORIDADE: neste post vale a regra da BLACK FRIDAY lá em cima. Se alguma instrução pedir preço ou link do catálogo, ignore: sem preço, e o único link é o indicado na regra da Black Friday.";

export function aplicarCampanhaBlackFriday<S extends SlotMinimo>(
  slots: S[],
  params: {
    semanaRef: string;
    prefs: PreferenciasScanner | null;
    conta: BlackFridayDaConta | null;
  },
): { slots: S[]; posts: number } {
  const quantos = postsDeBlackFriday(params.semanaRef);
  if (quantos === 0) return { slots, posts: 0 };
  const resposta = respostaBlackFriday(params.prefs);
  if (resposta?.escolha === "nenhuma") return { slots, posts: 0 };
  const modo = params.conta?.modo ?? "so_dia";
  const link = params.conta?.link ?? null;
  // Bônus dela escrito como promoção não entra (mesma régua de dataDaSemana).
  const bonusDela =
    resposta?.escolha === "promocao" && resposta.condicao && !temPalavraDePromocao(resposta.condicao) ? resposta.condicao : null;

  const naData = (s: S) => {
    const d = diasAteBlackFriday(dataDoSlot(params.semanaRef, s.dia));
    return d >= 0 ? d : null;
  };
  // Ordem de preferência: o post comercial, os carrosséis, o resto. Nunca
  // stories (eles têm regra própria abaixo) e o tema em alta só no fim.
  const feed = slots
    .map((s, i) => ({ s, i, d: naData(s) }))
    .filter((x) => x.s.tipo !== "stories" && x.d !== null);
  const peso = (s: S) => (COMERCIAIS.has(s.angulo) ? 0 : s.tipo === "feed_carrossel" ? 1 : 2) + (ehTemaEmAlta(s) ? 10 : 0);
  const escolhidos = feed.sort((a, b) => peso(a.s) - peso(b.s) || a.i - b.i).slice(0, quantos);

  const copia = slots.slice();
  for (const { s, i, d } of escolhidos) {
    copia[i] = {
      ...s,
      papel: `Black Friday: ${d === 0 ? "é hoje" : modo === "mes_todo" ? "já está valendo" : "antecipação do dia 27"}. ${s.papel}`,
      instrucao: `${blocoBlackFriday({ dias: d as number, modo, link, bonusDela })}\n\n${s.instrucao}\n\n${PRIORIDADE}`,
    };
  }
  if (STORIES_CONTAGEM.has(params.semanaRef)) {
    const i = copia.findIndex((s) => s.tipo === "stories" && naData(s) !== null);
    if (i >= 0) {
      const s = copia[i]!;
      copia[i] = {
        ...s,
        papel: `Black Friday: contagem regressiva. ${s.papel}`,
        instrucao: `${blocoBlackFriday({ dias: naData(s) as number, modo, link, bonusDela, stories: true })}\nUse figurinha de contagem regressiva para 27/11 e enquete "Você vai querer o bônus?".\n\n${s.instrucao}`,
      };
    }
  }
  return { slots: copia, posts: escolhidos.length };
}
