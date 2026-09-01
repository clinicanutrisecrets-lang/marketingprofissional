/**
 * Nível de consciência do público (Eugene Schwartz) como eixo de primeira
 * classe da geração de conteúdo.
 *
 * O MESMO tema muda de copy conforme quem lê já sabe (ou não) que tem o
 * problema. Este módulo traduz os 5 níveis do framework pra decisão de post
 * de Instagram e pra sequência da esteira de produtos.
 *
 * 🔴 FONTE ÚNICA: o framework em si (estado de cada nível, diretriz de copy,
 * regra nuclear) NÃO é reescrito aqui — vem de NIVEIS_AWARENESS_SCHWARTZ em
 * lib/agentes/_frameworks.ts, o mesmo texto que já alimenta os agentes de
 * ads e storytelling. O que este arquivo acrescenta é a ADAPTAÇÃO ao formato
 * post (o framework foi escrito pra headline de carta de venda) e a régua da
 * esteira. Duas cópias do framework divergiriam em silêncio.
 */

import {
  NIVEIS_AWARENESS_SCHWARTZ,
  REGRA_NUCLEAR_SCHWARTZ,
} from "@/lib/agentes/_frameworks";
import type { AnguloPost } from "./prompts";

export type NivelConsciencia =
  | "inconsciente"
  | "consciente_problema"
  | "consciente_solucao"
  | "consciente_produto"
  | "mais_consciente";

/** Ordem da esteira: do mais frio pro mais quente. */
export const NIVEIS_CONSCIENCIA: NivelConsciencia[] = [
  "inconsciente",
  "consciente_problema",
  "consciente_solucao",
  "consciente_produto",
  "mais_consciente",
];

/** Rótulo em pt-BR pra tela (a nutri não fala "problem aware"). */
export const ROTULO_CONSCIENCIA: Record<NivelConsciencia, string> = {
  inconsciente: "Inconsciente — não sabe que tem o problema",
  consciente_problema: "Consciente do problema — sente a dor, não sabe a causa",
  consciente_solucao: "Consciente da solução — conhece caminhos, não conhece você",
  consciente_produto: "Consciente do produto — conhece o seu trabalho, não decidiu",
  mais_consciente: "Mais consciente — já quer, só precisa da oferta",
};

/** Junção com o framework: cada nível daqui é um nível de lá (ordem 1 a 5). */
const ORDEM_NO_FRAMEWORK: Record<NivelConsciencia, 1 | 2 | 3 | 4 | 5> = {
  inconsciente: 1,
  consciente_problema: 2,
  consciente_solucao: 3,
  consciente_produto: 4,
  mais_consciente: 5,
};

/**
 * Adaptação do framework ao formato POST DE INSTAGRAM.
 * O Schwartz original fala de headline de carta de venda longa; aqui o
 * espaço é uma capa, uma legenda e um CTA.
 */
const ADAPTACAO_POST: Record<NivelConsciencia, string> = {
  inconsciente:
    "Fale do sintoma do dia a dia, com as palavras que ela usaria (o cansaço que bate às 15h, a calça que aperta só à noite, o sono que não descansa). NÃO cite nome de exame, de marcador, de gene nem de produto: quem está aqui nem sabe que isso tem explicação. O post ganha quando ela pensa 'isso sou eu' e salva.",
  consciente_problema:
    "Ela já sente e já dá nome à queixa, mas acha que é normal ou que já tentou de tudo. Nomeie a dor melhor do que ela nomearia, mostre POR QUE as tentativas anteriores não pegaram a causa, e abra a porta pra um caminho diferente sem entregar o passo a passo.",
  consciente_solucao:
    "Ela já sabe que existe investigação (exame, mapeamento genético, acompanhamento) e está comparando caminhos. Fale do MECANISMO: o que a sua leitura enxerga que a abordagem comum não enxerga. É aqui que o diferencial do método aparece, ainda sem empurrar oferta.",
  consciente_produto:
    "Ela já conhece o seu trabalho e está pesando. Diferencie: o que está incluído, como é conduzido, quanto tempo leva, o que ela leva pra casa. Responda de frente a objeção mais comum (preço, tempo, 'já fiz exame e não deu em nada'). Prova só se for verdadeira, sem antes/depois e sem promessa de resultado.",
  mais_consciente:
    "Ela já decidiu e só precisa do empurrão prático: o que é, quanto custa (se o preço estiver no catálogo) e como começa hoje. Copy curta e direta, sem recontar o problema do zero. Zero rodeio, zero história longa.",
};

/**
 * A MESMA esteira, dita de jeitos diferentes: o que se fala de um produto
 * real em cada nível. Usado só no ângulo divulgacao_produto — é o que evita
 * o post de oferta chegar em quem ainda nem sabe que tem o problema.
 */
const ESTEIRA_POR_NIVEL: Record<NivelConsciencia, string> = {
  inconsciente:
    "NÃO cite o nome do produto, o preço nem o exame. O post é sobre a queixa do dia a dia; o produto entra no máximo como 'existe jeito de investigar isso' no CTA, sem nome.",
  consciente_problema:
    "Fale do que o produto RESOLVE, não do que ele É. O nome do produto pode aparecer uma única vez, perto do fim. Ainda não é hora de preço.",
  consciente_solucao:
    "Mostre o que esse produto investiga que o caminho comum não investiga (o mecanismo). O nome do produto entra no corpo do post. Preço ainda não é o assunto.",
  consciente_produto:
    "Diferencial, o que está incluído, como funciona na prática e a objeção mais comum respondida. Preço só se estiver listado no catálogo. O CTA leva pro link real de compra.",
  mais_consciente:
    "Oferta direta: nome do produto, o que inclui, preço e condição EXATAMENTE como estão no catálogo, e como começar. Post curto, sem reapresentar o problema.",
};

/** Aceita o valor vindo da tela/banco e devolve o nível válido (ou undefined). */
export function normalizarNivelConsciencia(
  valor: unknown,
): NivelConsciencia | undefined {
  if (typeof valor !== "string") return undefined;
  return (NIVEIS_CONSCIENCIA as string[]).includes(valor)
    ? (valor as NivelConsciencia)
    : undefined;
}

/**
 * Bloco que entra no prompt quando o post tem nível definido.
 * Sem nível, o chamador não injeta nada e o prompt fica idêntico ao de antes.
 *
 * @param esteira quando true, acrescenta a régua de o que falar do PRODUTO
 *                nesse nível (ângulo divulgacao_produto / post de venda).
 */
export function blocoConsciencia(
  nivel: NivelConsciencia,
  opcoes?: { esteira?: boolean },
): string {
  const ordem = ORDEM_NO_FRAMEWORK[nivel];
  const doFramework = NIVEIS_AWARENESS_SCHWARTZ.find((n) => n.ordem === ordem);

  const linhas = [
    "",
    `NÍVEL DE CONSCIÊNCIA DO PÚBLICO DESTE POST: ${ROTULO_CONSCIENCIA[nivel]}`,
  ];

  if (doFramework) {
    const fatia = doFramework.fatia_mercado.replace(/ do mercado$/, "");
    linhas.push(
      `Referência (Eugene Schwartz, nível ${doFramework.ordem} de 5, cerca de ${fatia} do mercado): ${doFramework.estado}.`,
      `O que a copy precisa fazer nesse nível: ${doFramework.diretrizes.join(" ")}`,
    );
  }

  linhas.push(
    `Como isso vira post de Instagram: ${ADAPTACAO_POST[nivel]}`,
    `Regra nuclear: ${REGRA_NUCLEAR_SCHWARTZ.join(" ")}`,
  );

  if (opcoes?.esteira) {
    linhas.push(`O que dizer do PRODUTO nesse nível: ${ESTEIRA_POR_NIVEL[nivel]}`);
  }

  return linhas.join("\n");
}

/**
 * Nível padrão de cada ângulo, usado quando o plano semanal não escolhe um.
 * Não é lei: é o nível em que aquele tipo de post costuma converter melhor.
 *
 * divulgacao_produto fica de fora de propósito — nele o nível RODA pela
 * esteira (o mesmo produto falado de cinco jeitos ao longo das semanas), e
 * quem decide isso é planejarSemana.
 */
export const CONSCIENCIA_PADRAO_POR_ANGULO: Partial<
  Record<AnguloPost, NivelConsciencia>
> = {
  educativo_ciencia: "inconsciente",
  dor_do_paciente: "consciente_problema",
  mito_vs_verdade: "consciente_problema",
  caso_anonimizado: "consciente_solucao",
  bastidor_da_nutri: "consciente_solucao",
  autoridade: "consciente_solucao",
  prova_social: "consciente_produto",
  chamada_direta: "consciente_produto",
};
