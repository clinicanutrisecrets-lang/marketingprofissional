import { createClaude, CLAUDE_MODEL } from "./client";
import { semTravessoesFundo } from "@/lib/texto/sem-travessoes";
import {
  buildSystemPrompt,
  buildPromptPost,
  buildPromptPostVenda,
  buildPromptLP,
  type ContextoFranqueada,
  type AnguloPost,
  type TipoPost,
  type ProdutoContexto,
} from "./prompts";
import {
  CONSCIENCIA_PADRAO_POR_ANGULO,
  NIVEIS_CONSCIENCIA,
  type NivelConsciencia,
} from "./consciencia";

export type PostGerado = {
  headline: string;
  subtitle?: string;
  copy_legenda: string;
  copy_cta: string;
  hashtags: string[];
  angulo_copy: string;
  _usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

export type LPGerada = {
  hero: { headline: string; subheadline: string; cta: string };
  sobre: { titulo: string; paragrafos: string[] };
  metodo: { titulo: string; pilares: { titulo: string; descricao: string }[] };
  publico: { titulo: string; items: string[] };
  faq: { pergunta: string; resposta: string }[];
  cta_final: { titulo: string; subtitulo: string; botao: string };
};

/**
 * Gera 1 post usando prompt caching.
 * O system prompt (contexto da nutri + compliance) fica cached entre chamadas.
 */
export async function gerarPost(
  contexto: ContextoFranqueada,
  tipo: TipoPost,
  angulo: AnguloPost,
  semana: string,
  contextoExtra?: string,
  consciencia?: NivelConsciencia,
): Promise<PostGerado> {
  const claude = createClaude();
  const systemText = buildSystemPrompt(contexto);
  const userPrompt = buildPromptPost({
    tipo,
    angulo,
    semana,
    contexto_extra: contextoExtra,
    consciencia,
  });

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude não retornou texto");
  }

  const parsed = parseJSON(textBlock.text);
  return {
    ...parsed,
    _usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
    },
  };
}

export type PostVendaGerado = PostGerado & { slides?: string[] };

/**
 * Gera 1 post de VENDA de um produto real do Scanner Tratamentos.
 * Mesmo pipeline do gerarPost (system cached com contexto + compliance),
 * prompt específico de venda (buildPromptPostVenda).
 */
export async function gerarPostVenda(
  contexto: ContextoFranqueada,
  produto: ProdutoContexto & { descricao?: string },
  tipo: TipoPost,
  incluirPreco: boolean,
  consciencia?: NivelConsciencia,
): Promise<PostVendaGerado> {
  const claude = createClaude();
  const systemText = buildSystemPrompt(contexto);
  const userPrompt = buildPromptPostVenda({
    produto,
    tipo,
    incluir_preco: incluirPreco,
    consciencia,
  });

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude não retornou texto");
  }

  const parsed = parseJSON<PostVendaGerado>(textBlock.text);
  return {
    ...parsed,
    _usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? undefined,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? undefined,
    },
  };
}

/**
 * Gera LP completa.
 */
export async function gerarLP(contexto: ContextoFranqueada): Promise<LPGerada> {
  const claude = createClaude();
  const systemText = buildSystemPrompt(contexto);
  const userPrompt = buildPromptLP(contexto);

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: systemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude não retornou texto");
  }

  return parseJSON(textBlock.text);
}

function parseJSON<T>(raw: string): T {
  // Tira ``` caso Claude ignore a instrução de não usar markdown
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  try {
    // Travessão nunca sai daqui, mesmo que o modelo ignore a regra do prompt
    // (pedido da Aline, 26/08/2026).
    return semTravessoesFundo(JSON.parse(cleaned)) as T;
  } catch (e) {
    throw new Error(`JSON inválido do Claude: ${(e as Error).message}\nRaw: ${raw.slice(0, 300)}`);
  }
}

export type SlotSemana = {
  dia: number;
  tipo: TipoPost;
  angulo: AnguloPost;
  /** Nível de consciência do público desse post (Eugene Schwartz). */
  consciencia?: NivelConsciencia;
};

/**
 * Rotação de ângulos do FEED.
 *
 * Proporção escolhida: 9 ângulos, sendo 2 comerciais (divulgacao_produto e
 * chamada_direta) e eles ficam a 5 posições um do outro. Com 3 a 5 posts de
 * feed por semana isso dá NO MÁXIMO 1 post comercial por semana e nunca os
 * dois juntos — 2 comerciais a cada 9 posts, dentro da régua de "no máximo 1
 * post de venda a cada 5" que o prompt já pedia. Autoridade entra no meio,
 * separando o educativo do comercial.
 */
const ANGULOS_ROTACAO: AnguloPost[] = [
  "educativo_ciencia",
  "dor_do_paciente",
  "divulgacao_produto",
  "mito_vs_verdade",
  "autoridade",
  "caso_anonimizado",
  "bastidor_da_nutri",
  "chamada_direta",
  "prova_social",
];

/** Ângulos que fazem oferta. Não podem sair mais de um por semana. */
const ANGULOS_COMERCIAIS: AnguloPost[] = ["divulgacao_produto", "chamada_direta"];

/** Ordem de preferência pra ocupar um slot comercial que passou do limite. */
const SUBSTITUTOS_NAO_COMERCIAIS: AnguloPost[] = [
  "autoridade",
  "educativo_ciencia",
  "caso_anonimizado",
  "bastidor_da_nutri",
  "prova_social",
  "mito_vs_verdade",
  "dor_do_paciente",
];

/**
 * Índice da semana, pra rotação ANDAR de uma semana pra outra.
 *
 * 🔴 Sem isso a rotação recomeçava do índice 0 TODA semana: quem posta 3x por
 * semana só via os 3 primeiros ângulos da lista, pra sempre (caso_anonimizado,
 * prova_social e chamada_direta nunca saíam). Sem semanaRef o offset é 0 e o
 * comportamento é o de antes.
 */
function indiceDaSemana(semanaRef?: string): number {
  if (!semanaRef) return 0;
  const t = Date.parse(semanaRef);
  if (Number.isNaN(t)) return 0;
  return Math.floor(t / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Planeja uma semana de posts (7-10 itens) balanceando ângulos e tipos.
 * Inclui FEED, CARROSSEL, REELS e STORIES.
 * Retorna array de { tipo, angulo, dia, consciencia } pra depois gerar cada um.
 */
export function planejarSemana(params: {
  diasPostSemana?: number[];
  frequenciaReels?: string;   // 'semanal' | '2x_semana' | 'nenhum'
  frequenciaStories?: string; // 'diario' | 'dias_uteis' | '3x_semana' | 'semanal'
  /** Segunda-feira da semana (YYYY-MM-DD). Faz a rotação de ângulos andar. */
  semanaRef?: string;
  /**
   * A nutri tem produto ativo no catálogo (produtos_scanner)?
   * Default false de propósito: sem catálogo o ângulo divulgacao_produto é
   * PULADO (vira autoridade). Post de oferta sem produto real levaria o
   * modelo a inventar nome, preço ou link.
   */
  temProdutos?: boolean;
}): SlotSemana[] {
  const dias = params.diasPostSemana ?? [1, 3, 5];
  const plano: SlotSemana[] = [];

  const semanaIdx = indiceDaSemana(params.semanaRef);
  const temProdutos = params.temProdutos ?? false;

  // Nível de consciência do post de produto RODA pela esteira: o mesmo
  // produto é falado de um jeito diferente a cada semana que ele aparece.
  const nivelDaEsteira =
    NIVEIS_CONSCIENCIA[semanaIdx % NIVEIS_CONSCIENCIA.length];

  // FEED: cada dia escolhido vira 1 post de feed
  // Mistura tipos: 1º dia = reels (se semanal), 2º dia = carrossel, demais = imagem
  const feed: SlotSemana[] = dias.map((dia, i) => {
    const ehReels =
      (params.frequenciaReels === "semanal" && i === 0) ||
      (params.frequenciaReels === "2x_semana" && (i === 0 || i === Math.floor(dias.length / 2)));
    const ehCarrossel = !ehReels && i === 1;
    const tipo: TipoPost = ehReels
      ? "reels"
      : ehCarrossel
        ? "feed_carrossel"
        : "feed_imagem";

    const bruto =
      ANGULOS_ROTACAO[
        (semanaIdx * dias.length + i) % ANGULOS_ROTACAO.length
      ];
    // Sem produto no catálogo, o slot de oferta vira post de autoridade.
    const angulo: AnguloPost =
      bruto === "divulgacao_produto" && !temProdutos ? "autoridade" : bruto;

    return { dia, tipo, angulo };
  });

  // Trava de saturação: NO MÁXIMO 1 post comercial por semana.
  // A rotação sozinha não garante isso — quem posta 5x por semana tem janela
  // grande o bastante pra pegar o fim e o começo da lista, com os dois
  // ângulos comerciais dentro. O primeiro fica, os demais viram conteúdo.
  let jaTemComercial = false;
  for (const slot of feed) {
    if (!ANGULOS_COMERCIAIS.includes(slot.angulo)) continue;
    if (!jaTemComercial) {
      jaTemComercial = true;
      continue;
    }
    const usados = feed.map((f) => f.angulo);
    slot.angulo =
      SUBSTITUTOS_NAO_COMERCIAIS.find((a) => !usados.includes(a)) ??
      SUBSTITUTOS_NAO_COMERCIAIS[0];
  }

  for (const slot of feed) {
    plano.push({
      ...slot,
      consciencia:
        slot.angulo === "divulgacao_produto"
          ? nivelDaEsteira
          : CONSCIENCIA_PADRAO_POR_ANGULO[slot.angulo],
    });
  }

  // STORIES: dias separados (não nos dias de post de feed pra não saturar)
  const diasStories = (() => {
    switch (params.frequenciaStories) {
      case "diario":
        return [0, 1, 2, 3, 4, 5, 6];
      case "dias_uteis":
        return [1, 2, 3, 4, 5];
      case "3x_semana":
        return [1, 3, 5];
      case "semanal":
        return [3];
      default:
        return [1, 3, 5];
    }
  })();

  // 1 stories por dia escolhido, ângulo educativo/bastidor.
  // Stories NÃO entra na rotação comercial de propósito: é o formato de
  // conversa diária, não de oferta.
  const angulosStories: AnguloPost[] = [
    "bastidor_da_nutri",
    "educativo_ciencia",
    "mito_vs_verdade",
  ];
  diasStories.forEach((dia, i) => {
    const angulo = angulosStories[i % angulosStories.length];
    plano.push({
      dia,
      tipo: "stories",
      angulo,
      consciencia: CONSCIENCIA_PADRAO_POR_ANGULO[angulo],
    });
  });

  return plano;
}
