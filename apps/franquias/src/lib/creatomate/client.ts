/**
 * Creatomate API client — composição de imagem E vídeo (substitui Bannerbear).
 *
 * Templates: criados visualmente em creatomate.com/dashboard
 * Cada elemento tem um "name" — a gente passa modifications com esses names.
 *
 * Suporta:
 * - Imagens estáticas (1080x1080, 1080x1920, etc)
 * - Vídeos compostos com layers (PIP, captions, B-roll, etc)
 * - Auto-captions (sincronizadas com áudio falado)
 */

const BASE = "https://api.creatomate.com/v1";

function getApiKey(): string {
  const key = process.env.CREATOMATE_API_KEY;
  if (!key) throw new Error("CREATOMATE_API_KEY não configurada");
  return key;
}

export type RenderModification = Record<string, string | number | boolean | null>;

export type RenderResponse = {
  id: string;
  status: "planned" | "waiting" | "transcribing" | "rendering" | "succeeded" | "failed";
  url?: string;
  snapshot_url?: string;
  width?: number;
  height?: number;
  frame_rate?: number;
  duration?: number;
  output_format?: string;
  error_message?: string;
};

/**
 * Inicia render. Retorna ID — usar pollUntilReady pra aguardar.
 * Se synchronous=true, espera até completar (até 60s).
 */
export async function renderTemplate(params: {
  templateId: string;
  modifications: RenderModification;
  synchronous?: boolean;
  outputFormat?: "jpg" | "png" | "mp4" | "gif";
  webhookUrl?: string;
}): Promise<RenderResponse[]> {
  const res = await fetch(`${BASE}/renders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: params.templateId,
      modifications: params.modifications,
      output_format: params.outputFormat,
      webhook_url: params.webhookUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Creatomate render ${res.status}: ${text}`);
  }

  return res.json();
}

export async function getRenderStatus(renderId: string): Promise<RenderResponse> {
  const res = await fetch(`${BASE}/renders/${renderId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) throw new Error(`Creatomate status ${res.status}`);
  return res.json();
}

/**
 * Aguarda render completar. Padrão: tenta 30 vezes a cada 5s = 2.5min timeout.
 */
export async function pollUntilReady(
  renderId: string,
  options: { maxTentativas?: number; intervaloMs?: number } = {},
): Promise<{ url: string; thumbnail?: string; duration?: number }> {
  const max = options.maxTentativas ?? 30;
  const intervalo = options.intervaloMs ?? 5_000;

  for (let i = 0; i < max; i++) {
    const r = await getRenderStatus(renderId);
    if (r.status === "succeeded" && r.url) {
      return {
        url: r.url,
        thumbnail: r.snapshot_url,
        duration: r.duration,
      };
    }
    if (r.status === "failed") {
      throw new Error(`Creatomate falhou: ${r.error_message ?? "sem detalhes"}`);
    }
    await new Promise((res) => setTimeout(res, intervalo));
  }
  throw new Error("Creatomate timeout");
}

/**
 * Helper: dada nutri + post, monta modifications padronizadas.
 */
export function montarModifications(params: {
  headline: string;
  subtitle?: string;
  cta?: string;
  copy_legenda?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  logo_url?: string;
  foto_nutri_url?: string;
  video_fundo_url?: string;
  avatar_video_url?: string;
}): RenderModification {
  const mods: RenderModification = {};
  if (params.headline) mods["headline"] = params.headline;
  if (params.subtitle) mods["subtitle"] = params.subtitle;
  if (params.cta) mods["cta"] = params.cta;
  if (params.copy_legenda) mods["caption_text"] = params.copy_legenda;
  if (params.cor_primaria) mods["cor_primaria"] = params.cor_primaria;
  if (params.cor_secundaria) mods["cor_secundaria"] = params.cor_secundaria;
  if (params.logo_url) mods["logo"] = params.logo_url;
  if (params.foto_nutri_url) mods["foto_nutri"] = params.foto_nutri_url;
  if (params.video_fundo_url) mods["video_fundo"] = params.video_fundo_url;
  if (params.avatar_video_url) mods["avatar_video"] = params.avatar_video_url;
  return mods;
}

/**
 * Resolve template ID por tipo de post (Creatomate).
 */
export function resolveTemplateCreatomate(tipo: string): string | null {
  const map: Record<string, string | undefined> = {
    feed_imagem: process.env.CREATOMATE_TEMPLATE_FEED_IMAGEM,
    feed_carrossel: process.env.CREATOMATE_TEMPLATE_CARROSSEL,
    reels: process.env.CREATOMATE_TEMPLATE_REELS_PIP,
    stories: process.env.CREATOMATE_TEMPLATE_STORIES,
  };
  return map[tipo] ?? null;
}
