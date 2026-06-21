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

export function buildPrompt(input: PromptInput): string {
  const { tipo, dimensoes, brand, conteudo, slide } = input;
  const aspecto = DESCRITOR_ASPECTO[dimensoes];

  const headline = conteudo.headline;
  const tema = conteudo.subtitle ?? conteudo.eyebrow ?? "";
  const corPrimaria = brand.corPrimariaHex;
  const corpoPost = conteudo.corpo ? conteudo.corpo.slice(0, 300) : "";

  // Derive concrete subject instruction from the post topic
  const subjectInstruction = derivarSujeitoVisual(headline, tema, corpoPost);

  const direcao = [
    `Fine art editorial still-life photography, ${aspecto}.`,
    ``,
    `═══════════════════════════════════════`,
    `MANDATORY VISUAL SUBJECT — READ THIS FIRST:`,
    `${subjectInstruction}`,
    ``,
    `This is not a suggestion. The image MUST depict the subject above.`,
    `DO NOT substitute with a generic herb, leaf, or unrelated ingredient.`,
    `DO NOT use rosemary, basil, mint, or any herb unless the post is explicitly about that herb.`,
    `═══════════════════════════════════════`,
    ``,
    `POST CONTEXT (use only to choose the subject above — do not illustrate abstractly):`,
    `  Headline: "${headline}"`,
    ...(tema ? [`  Topic: "${tema}"`] : []),
    ...(corpoPost ? [`  Body excerpt: "${corpoPost.slice(0, 180)}"`] : []),
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
    `- NO generic herbs (rosemary, basil, mint, parsley) unless the post is explicitly about that herb`,
    `- NO text, words, letters, numbers, captions, labels, watermarks, signage, handwriting, typography of any kind anywhere in the image`,
    `- NO scientific diagrams, anatomical illustrations, brain renders, microscopy, molecular structures, DNA helices, infographic charts, schematic drawings`,
    `- NO digital glow, neon, lens flare, light beams, sparkles, particles, motion blur, bokeh balls, double exposure, light leaks`,
    `- NO 3D renders, CGI, computer graphics, smooth synthetic surfaces, AI-art aesthetic`,
    `- NO scales, weighing tools, body-part comparisons, before/after splits, weight-loss imagery, fitness poses`,
    `- NO recognizable people, faces, celebrities, models with identifiable features (hands and forearms only if humans appear)`,
    `- NO branded packaging, supplement bottles, pill containers, commercial product labels, restaurant logos`,
    `- NO white coats, stethoscopes, prescription pads, exam rooms, medical clipboards`,
    `- NO stock-photo clichés (smiling at salad, family eating, fitness woman, jogger, yoga pose)`,
    `- NO crowded composition, multiple disconnected subjects, busy patterned backgrounds, vignettes, heavy filters`,
    ``,
    `BRAZIL CFN 856/2026 COMPLIANCE: no diet implication, no calorie suggestion, no "treatment outcome" framing.`,
  ].join("\n");

  return [direcao, "", estilo, "", safeZone, slideConsistencia, "", negativos]
    .filter(Boolean)
    .join("\n");
}

/**
 * Derives a concrete, specific visual subject from the post's headline and topic.
 * Returns a direct instruction string: "Show X on Y surface with Z treatment."
 */
function derivarSujeitoVisual(headline: string, tema: string, corpo: string): string {
  const texto = `${headline} ${tema} ${corpo}`.toLowerCase();

  // Macronutrientes / micronutrientes / nutrição de precisão / prescrição
  if (/macro|micronutri|prescri[çc]|nutri[çc][aã]o de precis|nutrigenôm|nutrigen[eê]t|nutrigenetic/.test(texto)) {
    return "Show a precisely arranged flat-lay of three small ceramic bowls, each holding a distinct whole-food source: one with almonds, one with dark leafy greens, one with salmon or tuna fillet — representing macronutrient diversity. Arrange on a linen cloth with a wooden spoon.";
  }

  // Proteína / proteínas
  if (/prote[íi]na/.test(texto)) {
    return "Show a single chicken breast or salmon fillet resting on a textured stone surface, garnished with one sprig of thyme. Minimal, deliberate, editorial still-life.";
  }

  // Carboidratos / glicemia / insulina
  if (/carboidrato|glic[êe]mia|insulina|glicose/.test(texto)) {
    return "Show a selection of whole grains: a small pile of oats, a few slices of whole-grain bread, and a handful of quinoa arranged on a matte ceramic plate on a linen surface.";
  }

  // Gorduras / ômega / lipídios
  if (/gordura|[oô]mega|lip[íi]d/.test(texto)) {
    return "Show a halved avocado next to a small glass jar of olive oil and a handful of walnuts, arranged on a slate surface with soft natural light.";
  }

  // Vitaminas / minerais / suplementação
  if (/vitamina|mineral|suplementa|ferro|c[aá]lcio|magn[ée]sio|zinco|selênio/.test(texto)) {
    return "Show a curated arrangement of colorful whole fruits and vegetables on a stone surface: an orange half, dark leafy greens, a small pile of mixed seeds — no supplement bottles or pills.";
  }

  // Intestino / microbioma / probiótico / prebiótico / fermentado
  if (/intestin|microbiom|probiót|prebiót|fermentad|disbiose/.test(texto)) {
    return "Show a glass jar of kefir or yogurt with a wooden spoon, beside a small pile of mixed seeds and a piece of sourdough bread, on a linen cloth — editorial still-life.";
  }

  // Inflamação / antiinflamatório
  if (/inflama|antiinflama/.test(texto)) {
    return "Show a turmeric root (fresh, unpeeled) beside a small ceramic bowl of turmeric powder and a few black peppercorns, on a worn wood surface with warm directional light.";
  }

  // Sono / melatonina / cortisol / estresse
  if (/sono|melatonin|cortisol|estresse|ansiedade|relaxa/.test(texto)) {
    return "Show a sprig of dried lavender resting on dark linen fabric beside a small amber glass bottle, photographed from above with soft evening light — calm, quiet, minimal.";
  }

  // Energia / disposição / fadiga / cansaço
  if (/energia|disposi[çc]|fadiga|cansa[çc]|vitalidade/.test(texto)) {
    return "Show a halved citrus fruit (grapefruit or orange) with the interior facing up, catching warm morning light on a stone surface — vibrant color against neutral background.";
  }

  // Emagrecimento / peso / metabolismo
  if (/emagrec|peso corporal|metabolismo|queima de gordura/.test(texto)) {
    return "Show a small kitchen scale with a handful of colorful vegetables on it (no numbers visible), arranged on a pale linen surface with natural daylight — editorial, not fitness-cliché.";
  }

  // Gestação / maternidade / amamentação / bebê / infantil / criança
  if (/gesta[çc]|maternidade|amamenta|beb[êe]|infantil|crian[çc]|p[eé]s-parto/.test(texto)) {
    return "Show a small white ceramic bowl filled with pureed food or soft-cooked vegetables beside a tiny wooden spoon, on a soft white cotton cloth — gentle, minimal, warm.";
  }

  // Menopausa / hormônios / tireóide / hormonal
  if (/menopausa|hormôn|tireóide|tireoide|hormonal|menopaus/.test(texto)) {
    return "Show a arrangement of plant-based foods associated with hormonal support: flaxseeds in a small dish, broccoli floret, walnut halves — on a matte stone surface with warm side-light.";
  }

  // Esporte / performance / musculação / atleta
  if (/esport|performance|muscula[çc]|atleta|treino|hipertrofia/.test(texto)) {
    return "Show a halved pomegranate beside a small pile of mixed nuts and a glass of water, on a textured concrete surface — energy and recovery, editorial still-life.";
  }

  // Hidratação / água / eletrólitos
  if (/hidrata[çc]|[aá]gua|eletr[oó]lito/.test(texto)) {
    return "Show a glass pitcher of water with sliced cucumber and mint leaves floating inside, on a pale stone surface with backlit natural light creating soft highlights.";
  }

  // Detox / limpeza / fígado
  if (/detox|f[íi]gado|l[íi]mpeza|desintoxica/.test(texto)) {
    return "Show a small bundle of fresh beet greens beside a halved beet root revealing its deep magenta interior, on a dark slate surface with directional natural light.";
  }

  // Receita / refeição / prato / alimentação saudável
  if (/receita|refei[çc]|prato|alimenta[çc]/.test(texto)) {
    return "Show a beautifully composed bowl of wholesome food (grain bowl with vegetables) shot from directly above on a textured linen surface — Kinfolk magazine aesthetic.";
  }

  // Default: generic nutrition editorial
  return "Show a carefully composed still-life of whole, unprocessed foods directly related to the post's nutrition topic: one or two main ingredients on a textured neutral surface (linen, stone, or ceramic), with deliberate negative space and soft natural light. Choose the ingredients that are MOST relevant to the post headline — not rosemary or generic herbs.";
}

function construirSafeZone(tipo: TipoPeca): string {
  if (tipo === "stories") {
    return `LAYOUT RESERVATION: keep the bottom 30% of the frame as a quiet zone — soft surface, blurred surface, or empty negative space — text will be overlaid by post-processing. Place the subject roughly in the upper two-thirds.`;
  }
  if (tipo === "feed_carrossel") {
    return `LAYOUT RESERVATION: keep the bottom 28% of the frame as a quiet zone (soft surface, neutral negative space) — text will be overlaid in post-processing. Subject sits in the upper two-thirds.`;
  }
  return `LAYOUT RESERVATION: keep the bottom 25% of the frame as a quiet zone — soft natural surface, gentle shadow, or empty negative space — text will be overlaid in post-processing. Subject sits in the upper two-thirds.`;
}
