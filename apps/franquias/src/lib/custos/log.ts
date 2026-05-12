import { createAdminClient } from "@/lib/supabase/server";

/**
 * Preço por modelo Anthropic (USD por milhão de tokens).
 * Valores documentados em https://www.anthropic.com/pricing
 * Atualizar quando mudar tabela. Cache hit = 10% do input.
 * Cache write = 125% do input (ephemeral 5min) ou 200% (1h).
 */
const PRECOS_CLAUDE: Record<
  string,
  { input: number; output: number; cacheWrite5min: number; cacheRead: number }
> = {
  "claude-opus-4-7": { input: 15, output: 75, cacheWrite5min: 18.75, cacheRead: 1.5 },
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite5min: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite5min: 3.75, cacheRead: 0.3 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheWrite5min: 1.25, cacheRead: 0.1 },
};

export type UsoClaude = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export function calcularCustoClaude(modelo: string, uso: UsoClaude): number {
  const tabela = PRECOS_CLAUDE[modelo] ?? PRECOS_CLAUDE["claude-sonnet-4-5"];
  const input = (uso.input_tokens ?? 0) * tabela.input;
  const output = (uso.output_tokens ?? 0) * tabela.output;
  const cacheWrite =
    (uso.cache_creation_input_tokens ?? 0) * tabela.cacheWrite5min;
  const cacheRead = (uso.cache_read_input_tokens ?? 0) * tabela.cacheRead;
  return (input + output + cacheWrite + cacheRead) / 1_000_000;
}

export type LogCustoInput = {
  franqueadaId?: string | null;
  servico:
    | "claude"
    | "bannerbear"
    | "creatomate"
    | "heygen"
    | "gemini"
    | "openai"
    | "pexels"
    | "outro";
  operacao: string;
  modelo?: string;
  uso?: UsoClaude;
  custoUsd?: number;
  postId?: string | null;
  briefingId?: string | null;
  aprovacaoId?: string | null;
  sucesso?: boolean;
  erro?: string;
  latenciaMs?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Grava 1 entrada em custos_geracao. Falha silenciosa — telemetria
 * nunca pode quebrar o fluxo de geração.
 */
export async function logarCusto(entrada: LogCustoInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const custoUsd =
      entrada.custoUsd ??
      (entrada.servico === "claude" && entrada.modelo && entrada.uso
        ? calcularCustoClaude(entrada.modelo, entrada.uso)
        : 0);

    await admin.from("custos_geracao").insert({
      franqueada_id: entrada.franqueadaId ?? null,
      servico: entrada.servico,
      operacao: entrada.operacao,
      modelo: entrada.modelo ?? null,
      input_tokens: entrada.uso?.input_tokens ?? null,
      output_tokens: entrada.uso?.output_tokens ?? null,
      cache_creation_input_tokens: entrada.uso?.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: entrada.uso?.cache_read_input_tokens ?? null,
      custo_usd: custoUsd,
      post_agendado_id: entrada.postId ?? null,
      briefing_id: entrada.briefingId ?? null,
      aprovacao_semanal_id: entrada.aprovacaoId ?? null,
      sucesso: entrada.sucesso ?? true,
      erro: entrada.erro ?? null,
      latencia_ms: entrada.latenciaMs ?? null,
      metadata: entrada.metadata ?? {},
    });
  } catch (e) {
    console.warn("[custos] falha ao logar:", (e as Error).message);
  }
}

/**
 * Preço Bannerbear por render (template base — pay-as-you-go).
 * Plano starter $49/mo dá 1000 renders, custo marginal ~$0.005.
 */
export const CUSTO_BANNERBEAR_RENDER_USD = 0.005;
export const CUSTO_CREATOMATE_RENDER_USD = 0.01;
