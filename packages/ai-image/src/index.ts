import { buildPrompt } from "./promptBuilder";
import { gerarImagemOpenAI } from "./providers/openai";
import { gerarImagemGemini } from "./providers/gemini";
import { aplicarOverlayTexto } from "./overlay";
import { renderCard } from "./cardDesigner";
import { DIMENSOES_POR_TIPO } from "./types";
import type { RenderRequest, RenderResult } from "./types";

export * from "./types";
export { buildPrompt } from "./promptBuilder";
export { renderCard } from "./cardDesigner";
export { ILUSTRACOES_DISPONIVEIS, type IlustracaoId } from "./lineArt";
export type { CardInput, CardLayout } from "./cardDesigner";

export async function renderImagemIA(req: RenderRequest): Promise<RenderResult> {
  const inicio = Date.now();
  const dimensoes = req.dimensoes ?? DIMENSOES_POR_TIPO[req.tipo];
  const estilo = req.estilo ?? "design";

  // ——— PADRÃO: card tipográfico desenhado (determinístico, custo zero) ———
  if (estilo === "design" || estilo === "design_foto") {
    let fotoBuffer: Buffer | undefined;
    let custoUsd = 0;

    // "design_foto": tenta gerar uma tirinha de foto decorativa; qualquer
    // falha é silenciosa — o card tipográfico puro é sempre um bom resultado.
    if (estilo === "design_foto" && req.apiKey) {
      try {
        const prompt = buildPrompt({
          tipo: req.tipo,
          dimensoes,
          brand: req.brand,
          conteudo: req.conteudo,
          slide: req.slide,
          modoTextoOverlay: true,
        });
        if (req.provider === "openai") {
          const r = await gerarImagemOpenAI({
            apiKey: req.apiKey,
            prompt,
            dimensoes,
            timeoutMs: req.timeoutMs,
          });
          fotoBuffer = r.buffer;
          custoUsd = r.custoUsd;
        } else {
          const r = await gerarImagemGemini({
            apiKey: req.apiKey,
            prompt,
            dimensoes,
            timeoutMs: req.timeoutMs,
          });
          fotoBuffer = r.buffer;
          custoUsd = r.custoUsd;
        }
      } catch {
        fotoBuffer = undefined; // segue tipográfico puro
      }
    }

    const buffer = await renderCard({
      layout: fotoBuffer ? "foto" : "hero",
      dimensoes,
      brand: req.brand,
      conteudo: req.conteudo,
      fotoBuffer,
    });

    return {
      buffer,
      provider: req.provider,
      promptUsado: `design:card/${fotoBuffer ? "foto" : "hero"}`,
      modoTexto: "sharp_overlay",
      tempoMs: Date.now() - inicio,
      custoEstimadoUsd: custoUsd,
    };
  }

  // ——— LEGADO: foto de IA em tela cheia + overlay de texto ———
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
  estilo?: RenderRequest["estilo"];
  timeoutMs?: number;
}): Promise<RenderResult[]> {
  const estilo = params.estilo ?? "design";

  // ——— PADRÃO: carrossel desenhado ———
  // Capa (hero na cor da marca) → slides de conteúdo (creme, legível) →
  // último slide hero de CTA. Consistência visual garantida por construção.
  if (estilo === "design" || estilo === "design_foto") {
    const resultados: RenderResult[] = [];
    const total = params.slides.length;
    for (let i = 0; i < total; i++) {
      const inicio = Date.now();
      const conteudo = params.slides[i]!;
      const ehCapa = i === 0;
      const ehUltimo = i === total - 1 && total > 1;
      const layout = ehCapa || ehUltimo ? "hero" : "conteudo";
      const schemeIndex = ehCapa || ehUltimo ? 0 : 1;

      const buffer = await renderCard({
        layout,
        dimensoes: "1080x1350",
        brand: params.brand,
        conteudo,
        schemeIndex,
      });
      resultados.push({
        buffer,
        provider: params.provider,
        promptUsado: `design:card/${layout}/slide${i + 1}`,
        modoTexto: "sharp_overlay",
        tempoMs: Date.now() - inicio,
        custoEstimadoUsd: 0,
      });
    }
    return resultados;
  }

  // ——— LEGADO: fotos de IA encadeadas ———
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
      estilo: "foto_ia",
      timeoutMs: params.timeoutMs,
    });
    resultados.push(r);
    referenciaAnterior = r.buffer;
  }

  return resultados;
}
