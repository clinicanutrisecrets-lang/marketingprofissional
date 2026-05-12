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
import { createPublicAdminClient, createAlineClient } from "@/lib/supabase/server";
import { pickCanvaDesign, marcarDesignUsado } from "@/lib/canva/pick-template";
import { canvaDuplicateAndExport } from "@/lib/canva/duplicate-edit-export";
import { escolherFotoHeroParaPost } from "@/lib/pexels/client";

const BUCKET = "aline-assets";

/**
 * Studio Aline default = Gemini (custo ~$0.04/img, mesmo provider das franquias).
 * Pode trocar pra "openai" via env AI_IMAGE_PROVIDER_ALINE=openai (gpt-image-1
 * tem qualidade premium pra texto na imagem mas custa ~4x mais).
 */
function providerDefault(): Provider {
  return (process.env.AI_IMAGE_PROVIDER_ALINE as Provider) ?? "gemini";
}

function resolverApiKey(provider: Provider): string {
  const key =
    provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GEMINI_API_KEY;
  const envKeysOpenai = Object.keys(process.env).filter((k) =>
    k.toUpperCase().includes("OPENAI"),
  );
  console.log(
    `[resolverApiKey] provider=${provider} keyDefined=${key !== undefined} keyLen=${key?.length ?? 0} keyPrefix=${key?.slice(0, 7) ?? "none"} envKeysWithOpenai=${JSON.stringify(envKeysOpenai)} VERCEL_ENV=${process.env.VERCEL_ENV} NODE_ENV=${process.env.NODE_ENV}`,
  );
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
  meta: Omit<RenderResult, "buffer"> & { engineUsado?: "canva" | "ai-image" };
}> {
  // 1. Tenta Canva pipeline se perfil tiver render_engine='canva' e conexão ativa
  const canvaResult = await tentarCanva(input);
  if (canvaResult) return canvaResult;

  // 2. Fallback: AI-image (Gemini/OpenAI) — fluxo legado
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
      engineUsado: "ai-image",
    },
  };
}

/**
 * Tenta gerar imagem via Canva pipeline (duplicate-and-edit).
 * Retorna null se:
 *  - perfil não tem render_engine='canva'
 *  - sem conexão Canva
 *  - tipo não suportado (reels — fica no pipeline existente)
 *  - sem design no pool pra esse tipo
 *  - qualquer erro no caminho (fallback transparente)
 */
async function tentarCanva(input: GerarPostInput): Promise<{
  url: string;
  path: string;
  meta: Omit<RenderResult, "buffer"> & { engineUsado: "canva" };
} | null> {
  // TipoPeca não inclui reels — só feed_imagem/feed_carrossel/stories são suportados
  try {
    const aline = createAlineClient();

    const { data: perfilRow } = await aline
      .from("perfis")
      .select("render_engine, instagram_handle")
      .eq("id", input.perfilId)
      .maybeSingle();

    const perfil = perfilRow as
      | { render_engine?: string; instagram_handle?: string }
      | null;
    if (perfil?.render_engine !== "canva") return null;

    const { data: statusData } = await aline.rpc("get_canva_connection_status");
    const status = (Array.isArray(statusData) ? statusData[0] : statusData) as
      | { conectado?: boolean }
      | undefined;
    if (!status?.conectado) return null;

    const design = await pickCanvaDesign({
      perfilId: input.perfilId,
      tipo: input.tipo as
        | "feed_imagem"
        | "feed_carrossel"
        | "stories"
        | "generico",
      tags: extrairTagsDoConteudo(input.conteudo),
    });
    if (!design) return null;

    const t0 = Date.now();

    // Foto hero via Pexels (visualHint inferido do conteúdo ou explícito)
    const visualHint = inferirVisualHint(input.conteudo, input.brand);
    let fotoHero:
      | { buffer: Buffer; filename: string }
      | undefined;
    try {
      const foto = await escolherFotoHeroParaPost({
        perfilId: input.perfilId,
        visualHint,
        orientation: input.tipo === "stories" ? "portrait" : "square",
      });
      if (foto) {
        fotoHero = {
          buffer: foto.buffer,
          filename: `pexels_${foto.pexelsId}.jpg`,
        };
      }
    } catch (e) {
      console.warn("[canva] foto Pexels falhou, segue sem hero:", e);
    }

    const result = await canvaDuplicateAndExport({
      designId: design.design_id,
      textos: {
        headline: input.conteudo.headline ?? "",
        subtitle: input.conteudo.subtitle ?? "",
        cta: input.conteudo.cta ?? "",
        handle: perfil?.instagram_handle ? `@${perfil.instagram_handle}` : "",
      },
      fotoHero,
    });

    // Baixa o PNG exportado e sobe pro bucket nosso (independência de URL Canva)
    const pngRes = await fetch(result.pngUrl);
    if (!pngRes.ok) throw new Error(`download canva png ${pngRes.status}`);
    const buffer = Buffer.from(await pngRes.arrayBuffer());

    const path = `${input.perfilSlug}/canva/${Date.now()}_${input.tipo}.png`;
    const admin = createPublicAdminClient();
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "image/png", upsert: false });
    if (upErr) throw new Error(`upload canva falhou: ${upErr.message}`);

    const { data: signed } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, 365 * 24 * 60 * 60);

    await marcarDesignUsado(design.id);

    return {
      url: signed?.signedUrl ?? path,
      path,
      meta: {
        provider: "gemini" as Provider, // só pra satisfazer type — engineUsado é o real
        promptUsado: `canva:${design.design_id}`,
        modoTexto: "external" as RenderResult["modoTexto"],
        tempoMs: Date.now() - t0,
        custoEstimadoUsd: 0, // Canva tier free ou flat
        engineUsado: "canva",
      },
    };
  } catch (e) {
    console.warn("[canva] pipeline falhou, caindo no fallback:", (e as Error).message);
    return null;
  }
}

function extrairTagsDoConteudo(c: ConteudoPeca): string[] {
  const t: string[] = [];
  const all = `${c.headline ?? ""} ${c.subtitle ?? ""} ${c.eyebrow ?? ""}`.toLowerCase();
  if (all.match(/genetic|gene|dna/i)) t.push("genetica");
  if (all.match(/vitamin|mineral|nutrient/i)) t.push("micronutriente");
  if (all.match(/alimen|comida|food/i)) t.push("alimento");
  if (all.match(/perg|question|por\s+que/i)) t.push("question_card");
  if (all.match(/flat[\s-]?lay/i)) t.push("flat_lay");
  return t;
}

function inferirVisualHint(c: ConteudoPeca, b: BrandGuidelines): string {
  // Se o conteúdo tiver hint explícito, usa
  const explicito = (c as { visual_hint?: string }).visual_hint;
  if (explicito) return explicito;

  // Heurística simples baseada em headline + nicho
  const h = (c.headline ?? "").toLowerCase();
  if (h.match(/vitamin\s*d/i)) return "vitamin D capsule sunlight";
  if (h.match(/omega|peix|salmon/i)) return "salmon avocado flat-lay";
  if (h.match(/glic|açúcar|sugar|diabet/i)) return "glucose meter healthy food";
  if (h.match(/ferro|iron|anemi/i)) return "red meat spinach iron";
  if (h.match(/intestin|microbiot|gut/i)) return "fermented food yogurt kefir";
  if (h.match(/sono|sleep|melaton/i)) return "bedroom calm morning light";
  if (h.match(/estresse|stress|cortis/i)) return "calm hands tea minimal";
  if (h.match(/gen[eé]tic|dna|gene/i)) return "DNA helix lab science";

  return `${b.nicho ?? "healthy food"} flat-lay natural light`;
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
