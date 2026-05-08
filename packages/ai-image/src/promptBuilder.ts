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
  "1080x1080": "1:1 square framing",
  "1080x1350": "4:5 vertical portrait framing",
  "1080x1920": "9:16 vertical full-screen framing",
};

const CATEGORIAS_VISUAIS = [
  "macro still-life of a single raw ingredient (single fruit half, herb sprig, grain, seed, leaf, root, single flower) on a textured natural surface (linen, raw wood, stone, ceramic)",
  "human hands at deliberate work — tearing a herb leaf, pouring oil from a bottle, slicing a fig, kneading dough, dusting flour, stirring a pot — only hands and forearms visible, no face",
  "tools and utensils arranged on a textured surface — wooden spoon, ceramic bowl, mortar, copper pan, linen cloth — flat-lay or three-quarter view",
  "prepared dish detail — close crop of a single bowl or plate, focused on texture and ingredient (NOT the full plate, NOT 'meal plan' aesthetic)",
  "organic texture and material study — grains spilling, leaves overlapping, oil pooling, water droplets on greens, steam rising — abstract but tactile",
  "kitchen environment moment — north-window light hitting a counter, herbs in a glass, fruit in a bowl by a window — empty of people, contemplative",
];

export function buildPrompt(input: PromptInput): string {
  const { tipo, dimensoes, brand, conteudo, slide } = input;
  const aspecto = DESCRITOR_ASPECTO[dimensoes];

  const headline = conteudo.headline;
  const tema = conteudo.subtitle ?? conteudo.eyebrow ?? "";
  const corPrimaria = brand.corPrimariaHex;

  const direcao = [
    `Fine art editorial still-life photography, ${aspecto}.`,
    `Choose ONE subject category, picked to reflect the editorial theme below — do NOT illustrate the theme literally, evoke it through a tangible photographic object:`,
    CATEGORIAS_VISUAIS.map((c, i) => `  (${i + 1}) ${c}`).join("\n"),
    ``,
    `Editorial theme guiding the choice: "${headline}"${tema ? ` — context: "${tema}"` : ""}.`,
  ].join("\n");

  const estilo = [
    `LIGHTING: soft natural daylight, single-source (north window or late afternoon), gentle directional shadow, no studio flash, no rim light, no halo.`,
    `COLOR PALETTE: warm desaturated neutrals as the dominant range (cream, oat, raw linen, stone, wheat, terracotta, muted moss). The brand accent ${corPrimaria} may appear ONLY as a small surface, fabric, or ceramic detail — never as a glow, gradient, or filter over the whole image.`,
    `COMPOSITION: deliberate negative space, off-center subject, asymmetric balance, magazine-cover quality. Generous breathing room. Shallow but realistic depth of field. Subject occupies less than 50% of the frame.`,
    `TREATMENT: organic, tactile, slightly imperfect. Real materials with grain, weave, scratch, patina. Subtle film-stock quality (faint grain, natural color rolloff). Looks like it could appear in Cereal magazine, Kinfolk, Apartamento, Bon Appétit.`,
  ].join("\n");

  const safeZone = construirSafeZone(tipo);

  const slideConsistencia = slide
    ? `\nCAROUSEL CONSISTENCY: this is slide ${slide.indiceSlide} of ${slide.totalSlides}. Match the previous slide's lighting, palette, surface texture, camera angle, and material treatment exactly. Same visual world, different concrete subject.`
    : "";

  const negativos = [
    `ABSOLUTE PROHIBITIONS (image must contain NONE of these):`,
    `- NO text, words, letters, numbers, captions, labels, watermarks, signage, handwriting, typography of any kind anywhere in the image`,
    `- NO scientific diagrams, anatomical illustrations, brain renders, microscopy, molecular structures, DNA helices, infographic charts, schematic drawings`,
    `- NO digital glow, neon, lens flare, light beams, sparkles, particles, motion blur, bokeh balls, double exposure, light leaks`,
    `- NO 3D renders, CGI, computer graphics, smooth synthetic surfaces, AI-art aesthetic (no "trending on artstation" look)`,
    `- NO scales, weighing tools, body-part comparisons, before/after splits, weight-loss imagery, fitness poses`,
    `- NO recognizable people, faces, celebrities, models with identifiable features (hands and forearms only if humans appear)`,
    `- NO branded packaging, supplement bottles, pill containers, commercial product labels, restaurant logos`,
    `- NO white coats, stethoscopes, prescription pads, exam rooms, medical clipboards`,
    `- NO stock-photo clichés (smiling at salad, family eating, fitness woman, jogger, yoga pose, transformation pose)`,
    `- NO crowded composition, multiple disconnected subjects, busy patterned backgrounds, vignettes, heavy filters`,
    `- NO holiday or seasonal decoration unless theme explicitly demands it`,
    ``,
    `BRAZIL CFN 856/2026 COMPLIANCE: no diet implication, no calorie suggestion, no "treatment outcome" framing.`,
  ].join("\n");

  return [direcao, "", estilo, "", safeZone, slideConsistencia, "", negativos]
    .filter(Boolean)
    .join("\n");
}

function construirSafeZone(tipo: TipoPeca): string {
  if (tipo === "stories") {
    return [
      `LAYOUT RESERVATION: keep the bottom 30% of the frame as a quiet zone — soft surface, blurred surface, or empty negative space — text will be overlaid by post-processing. Place the subject roughly in the upper two-thirds.`,
    ].join("\n");
  }
  if (tipo === "feed_carrossel") {
    return [
      `LAYOUT RESERVATION: keep the bottom 28% of the frame as a quiet zone (soft surface, neutral negative space) — text will be overlaid in post-processing. Subject sits in the upper two-thirds.`,
    ].join("\n");
  }
  return [
    `LAYOUT RESERVATION: keep the bottom 25% of the frame as a quiet zone — soft natural surface, gentle shadow, or empty negative space — text will be overlaid in post-processing. Subject sits in the upper two-thirds.`,
  ].join("\n");
}
