import { buildPrompt } from "./promptBuilder";
import { gerarImagemOpenAI } from "./providers/openai";
import { gerarImagemGemini } from "./providers/gemini";
import { aplicarOverlayTexto } from "./overlay";
import { DIMENSOES_POR_TIPO } from "./types";
import type { RenderRequest, RenderResult } from "./types";

export * from "./types";
export { buildPrompt } from "./promptBuilder";

export async function renderImagemIA(req: RenderRequest): Promise<RenderResult> {
  const inicio = Date.now();
  const dimensoes = req.dimensoes ?? DIMENSOES_POR_TIPO[req.tipo];
  const modoTexto = req.modoTexto ?? "sharp_overlay";
  const modoTextoOverlay = modoTexto === "sharp_overlay";

  const prompt = buildPrompt({
    tipo: req.tipo,
    dimensoes,
    brand: req.brand,
    conteudo: req.conteudo,
    slide: req.slide,
    modoTextoOverlay,
  });

  let imagemBuf: Buffer;
  let custoUsd: number;

  if (req.provider === "openai") {
    const r = await gerarImagemOpenAI({
      apiKey: req.apiKey,
      prompt,
      dimensoes,
      timeoutMs: req.timeoutMs,
    });
    imagemBuf = r.buffer;
    custoUsd = r.custoUsd;
  } else {
    const r = await gerarImagemGemini({
      apiKey: req.apiKey,
      prompt,
      dimensoes,
      referenciaImagem: req.slide?.referenciaImagem,
      timeoutMs: req.timeoutMs,
    });
    imagemBuf = r.buffer;
    custoUsd = r.custoUsd;
  }

  const final = modoTextoOverlay
    ? await aplicarOverlayTexto({
        imagemIA: imagemBuf,
        dimensoesFinal: dimensoes,
        tipo: req.tipo,
        brand: req.brand,
        conteudo: req.conteudo,
      })
    : imagemBuf;

  return {
    buffer: final,
    provider: req.provider,
    promptUsado: prompt,
    modoTexto,
    tempoMs: Date.now() - inicio,
    custoEstimadoUsd: custoUsd,
  };
}

export async function renderCarrossel(params: {
  provider: RenderRequest["provider"];
  apiKey: string;
  brand: RenderRequest["brand"];
  slides: RenderRequest["conteudo"][];
  modoTexto?: RenderRequest["modoTexto"];
  timeoutMs?: number;
}): Promise<RenderResult[]> {
  const resultados: RenderResult[] = [];
  let referenciaAnterior: Buffer | undefined;

  for (let i = 0; i < params.slides.length; i++) {
    const r = await renderImagemIA({
      tipo: "feed_carrossel",
      provider: params.provider,
      apiKey: params.apiKey,
      brand: params.brand,
      conteudo: params.slides[i]!,
      slide: {
        indiceSlide: i + 1,
        totalSlides: params.slides.length,
        referenciaImagem: params.provider === "gemini" ? referenciaAnterior : undefined,
      },
      modoTexto: params.modoTexto,
      timeoutMs: params.timeoutMs,
    });
    resultados.push(r);
    referenciaAnterior = r.buffer;
  }

  return resultados;
}
