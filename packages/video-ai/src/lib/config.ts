import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as carregarEnv } from "dotenv";
import { PRECO_PASSO_PADRAO_USD, TRIGGER_PADRAO } from "./regras.ts";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
/** Raiz do pacote (packages/video-ai). */
export const RAIZ = path.resolve(AQUI, "..", "..");
export const PASTA_DATASETS = path.join(RAIZ, "datasets");
export const ARQUIVO_LORAS = path.join(RAIZ, "loras.json");

// .env da pasta do pacote primeiro; depois o .env.local da raiz do monorepo,
// que já tem Supabase e Anthropic de quem roda o Studio. Nada sobrescreve nada.
carregarEnv({ path: path.join(RAIZ, ".env") });
carregarEnv({ path: path.resolve(RAIZ, "..", "..", ".env.local") });
carregarEnv({ path: path.resolve(RAIZ, "..", "..", ".env") });

function env(nome: string): string | undefined {
  const v = process.env[nome]?.trim();
  return v ? v : undefined;
}

export const cfg = {
  falKey: env("FAL_KEY"),
  anthropicKey: env("ANTHROPIC_API_KEY"),
  legendaModel: env("VIDEO_AI_LEGENDA_MODEL") ?? "claude-opus-5",
  supabaseUrl: env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SUPABASE_URL"),
  supabaseServiceKey: env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_SERVICE_ROLE"),
  bucket: env("VIDEO_AI_BUCKET") ?? "video-ai",
  trigger: env("VIDEO_AI_TRIGGER") ?? TRIGGER_PADRAO,
  precoPassoUsd: Number(env("FAL_PRECO_PASSO_USD") ?? PRECO_PASSO_PADRAO_USD) || PRECO_PASSO_PADRAO_USD,
};

export function temSupabase(): boolean {
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceKey);
}

export function exigirFal(): string {
  if (!cfg.falKey) {
    throw new Error("FAL_KEY não configurada. Copie .env.example para .env em packages/video-ai e preencha.");
  }
  return cfg.falKey;
}
