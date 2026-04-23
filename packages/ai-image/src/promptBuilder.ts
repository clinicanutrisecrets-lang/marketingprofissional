import type { BrandGuidelines, ConteudoPeca, Dimensoes, SlideRef, TipoPeca } from "./types";

type PromptInput = {
  tipo: TipoPeca;
  dimensoes: Dimensoes;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  slide?: SlideRef;
  modoTextoOverlay: boolean;
};

const DESCRITOR_ASPECTO: Record<Dimensoes, string> = {
  "1080x1080": "square composition (1:1)",
  "1080x1350": "vertical portrait composition (4:5)",
  "1080x1920": "vertical full-screen composition (9:16)",
};

const DESCRITOR_TIPO: Record<TipoPeca, string> = {
  feed_imagem: "single editorial feed image for Instagram",
  feed_carrossel: "editorial carousel slide for Instagram",
  stories: "vertical Instagram Story graphic",
};

export function buildPrompt(input: PromptInput): string {
  const { tipo, dimensoes, brand, conteudo, slide, modoTextoOverlay } = input;
  const aspecto = DESCRITOR_ASPECTO[dimensoes];
  const tipoDesc = DESCRITOR_TIPO[tipo];

  const tom = brand.tomVisual ?? "editorial premium health clinic, sophisticated, calm";
  const nicho = brand.nicho ?? "functional nutrition and precision medicine";

  const estiloBase = [
    `Professional ${tipoDesc}, ${aspecto}.`,
    `Visual aesthetic: ${tom}. Niche: ${nicho}.`,
    `Natural lighting, shallow depth of field, considered composition.`,
    `Color palette anchored by ${brand.corPrimariaHex}${brand.corSecundariaHex ? ` and ${brand.corSecundariaHex}` : ""}, with neutral warm tones (cream, sand, muted earth).`,
    `Photography or conceptual illustration — NOT stock photo look, NOT clipart.`,
  ].join(" ");

  const contextoTema = `Visual theme: "${conteudo.headline}". ${conteudo.subtitle ? `Context: "${conteudo.subtitle}".` : ""} Audience: women 30-55, invested in preventive health, looking for precision and science.`;

  const safeZoneInstrucao = modoTextoOverlay
    ? buildSafeZoneInstrucao(tipo)
    : buildTextoNaImagemInstrucao(conteudo);

  const slideConsistencia = slide
    ? `This is slide ${slide.indiceSlide} of ${slide.totalSlides} in a carousel — maintain strict visual consistency with preceding slides: same palette, same lighting, same treatment. Each slide is a variation on the same editorial system.`
    : "";

  const restricoes = [
    "STRICT RULES:",
    modoTextoOverlay ? "- DO NOT render any text, words, letters, logos, or watermarks in the image." : "",
    "- DO NOT use before/after comparisons.",
    "- DO NOT show weight scales, measuring tapes, or body part comparisons.",
    "- DO NOT include medical symbols suggesting diagnosis (stethoscope, white coat, prescription pad).",
    "- DO NOT show food plate photos that imply restrictive diet.",
    "- AVOID generic stock-photo aesthetics.",
    "- Must feel editorial, refined, premium.",
  ].filter(Boolean).join("\n");

  return [
    estiloBase,
    contextoTema,
    safeZoneInstrucao,
    slideConsistencia,
    restricoes,
  ].filter(Boolean).join("\n\n");
}

function buildSafeZoneInstrucao(tipo: TipoPeca): string {
  if (tipo === "stories") {
    return `COMPOSITION CONSTRAINT: Keep the middle vertical band (between 35% and 75% of height) clear of critical visual elements — it will receive a text overlay. Focus main visual elements in the top third and bottom third, using negative space or soft gradient in the middle.`;
  }
  if (tipo === "feed_carrossel") {
    return `COMPOSITION CONSTRAINT: Reserve the bottom 45% with subtle gradient, soft bokeh or neutral background — it will receive a text overlay. Put the main subject in the top 55%.`;
  }
  return `COMPOSITION CONSTRAINT: Reserve the bottom 40% with subtle gradient, soft bokeh or neutral background — it will receive a text overlay. Put the main subject in the top 60%.`;
}

function buildTextoNaImagemInstrucao(conteudo: ConteudoPeca): string {
  return `TEXT TO INCLUDE (render typography elegantly, use a refined serif for headings, minimal sans for body):
- Headline: "${conteudo.headline}"
${conteudo.subtitle ? `- Subtitle: "${conteudo.subtitle}"` : ""}
${conteudo.corpo ? `- Body: "${conteudo.corpo}"` : ""}
${conteudo.cta ? `- CTA: "${conteudo.cta}"` : ""}
${conteudo.eyebrow ? `- Eyebrow tag: "${conteudo.eyebrow}"` : ""}`;
}
