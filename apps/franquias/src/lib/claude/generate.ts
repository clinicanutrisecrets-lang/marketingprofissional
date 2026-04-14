import { createClaude, CLAUDE_MODEL } from "./client";
import {
  buildSystemPrompt,
  buildPromptPost,
  buildPromptLP,
  type ContextoFranqueada,
  type AnguloPost,
  type TipoPost,
} from "./prompts";

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
): Promise<PostGerado> {
  const claude = createClaude();
  const systemText = buildSystemPrompt(contexto);
  const userPrompt = buildPromptPost({ tipo, angulo, semana, contexto_extra: contextoExtra });

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
    return JSON.parse(cleaned) as T;
  } catch (e) {
    throw new Error(`JSON inválido do Claude: ${(e as Error).message}\nRaw: ${raw.slice(0, 300)}`);
  }
}

/**
 * Planeja uma semana de posts (7-10 posts) balanceando ângulos.
 * Retorna array de { tipo, angulo, dia, horario } pra depois gerar cada um.
 */
export function planejarSemana(params: {
  diasPostSemana?: number[];
  frequenciaReels?: string;
  frequenciaStories?: string;
}): Array<{ dia: number; tipo: TipoPost; angulo: AnguloPost }> {
  const dias = params.diasPostSemana ?? [1, 3, 5]; // seg, qua, sex

  const plano: Array<{ dia: number; tipo: TipoPost; angulo: AnguloPost }> = [];

  // Feed posts nos dias escolhidos, distribuindo ângulos
  const angulosRotacao: AnguloPost[] = [
    "educativo_ciencia",
    "dor_do_paciente",
    "mito_vs_verdade",
    "caso_anonimizado",
    "bastidor_da_nutri",
    "prova_social",
    "chamada_direta",
  ];

  dias.forEach((dia, i) => {
    const ehReels = params.frequenciaReels === "semanal" && i === 0;
    const ehCarrossel = !ehReels && i === 1;
    const tipo: TipoPost = ehReels ? "reels" : ehCarrossel ? "feed_carrossel" : "feed_imagem";
    const angulo = angulosRotacao[i % angulosRotacao.length];
    plano.push({ dia, tipo, angulo });
  });

  return plano;
}
