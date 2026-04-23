import "server-only";
import {
  renderImagemIA,
  renderCarrossel,
  type RenderRequest,
  type RenderResult,
  type Provider,
  type TipoPeca,
  type BrandGuidelines,
  type ConteudoPeca,
} from "@scanner/ai-image";
import { createPublicAdminClient } from "@/lib/supabase/server";

const BUCKET = "aline-assets";

/**
 * Studio Aline usa OpenAI (GPT-Image-1) por padrão — qualidade premium
 * para os 2 perfis pessoais (scannerdasaude + nutrisecrets). Volume baixo
 * justifica o custo maior.
 */
function providerDefault(): Provider {
  return (process.env.AI_IMAGE_PROVIDER_ALINE as Provider) ?? "openai";
}

function resolverApiKey(provider: Provider): string {
  const key =
    provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
  if (!key) throw new Error(`API key ausente para provider ${provider}`);
  return key;
}

export type GerarPostInput = {
  perfilId: string;
  perfilSlug: string;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  provider?: Provider;
};

export async function gerarEUploadImagem(input: GerarPostInput): Promise<{
  url: string;
  path: string;
  meta: Omit<RenderResult, "buffer">;
}> {
  const provider = input.provider ?? providerDefault();
  const apiKey = resolverApiKey(provider);

  const result = await renderImagemIA({
    tipo: input.tipo,
    provider,
    apiKey,
    brand: input.brand,
    conteudo: input.conteudo,
  });

  const path = `${input.perfilSlug}/ai-image/${Date.now()}_${input.tipo}.png`;
  const admin = createPublicAdminClient();

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, result.buffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadErr) throw new Error(`upload falhou: ${uploadErr.message}`);

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, 365 * 24 * 60 * 60);

  const url = signed?.signedUrl ?? path;

  return {
    url,
    path,
    meta: {
      provider: result.provider,
      promptUsado: result.promptUsado,
      modoTexto: result.modoTexto,
      tempoMs: result.tempoMs,
      custoEstimadoUsd: result.custoEstimadoUsd,
    },
  };
}

export async function gerarCarrosselEUpload(input: {
  perfilSlug: string;
  brand: BrandGuidelines;
  slides: ConteudoPeca[];
  provider?: Provider;
}): Promise<{
  urls: string[];
  meta: { custoTotalUsd: number; tempoTotalMs: number; provider: Provider };
}> {
  const provider = input.provider ?? providerDefault();
  const apiKey = resolverApiKey(provider);

  const resultados = await renderCarrossel({
    provider,
    apiKey,
    brand: input.brand,
    slides: input.slides,
  });

  const admin = createPublicAdminClient();
  const urls: string[] = [];
  let custoTotal = 0;
  let tempoTotal = 0;

  for (let i = 0; i < resultados.length; i++) {
    const r = resultados[i]!;
    const path = `${input.perfilSlug}/ai-image/${Date.now()}_carrossel_${i + 1}.png`;
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, r.buffer, { contentType: "image/png", upsert: false });
    if (error) throw new Error(`upload slide ${i + 1}: ${error.message}`);
    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    urls.push(signed?.signedUrl ?? path);
    custoTotal += r.custoEstimadoUsd;
    tempoTotal += r.tempoMs;
  }

  return {
    urls,
    meta: { custoTotalUsd: custoTotal, tempoTotalMs: tempoTotal, provider },
  };
}

export async function gerarImagemPreview(
  input: Omit<RenderRequest, "apiKey">,
): Promise<{ buffer: Buffer; meta: Omit<RenderResult, "buffer"> }> {
  const apiKey = resolverApiKey(input.provider);
  const r = await renderImagemIA({ ...input, apiKey });
  return {
    buffer: r.buffer,
    meta: {
      provider: r.provider,
      promptUsado: r.promptUsado,
      modoTexto: r.modoTexto,
      tempoMs: r.tempoMs,
      custoEstimadoUsd: r.custoEstimadoUsd,
    },
  };
}
