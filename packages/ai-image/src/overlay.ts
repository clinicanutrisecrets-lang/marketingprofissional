import sharp from "sharp";
import { existsSync, writeFileSync } from "fs";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";

type OverlayInput = {
  imagemIA: Buffer;
  dimensoesFinal: Dimensoes;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
};

// Download Roboto-Regular to /tmp once per Lambda instance so Pango can find it.
// Without a bundled font, Vercel's Lambda environment has no fontconfig fonts
// and renders every glyph as a □ box.
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static/Roboto-Regular.ttf";
const FONT_PATH = "/tmp/_overlay_font_roboto.ttf";
let _fontPath: string | null = null; // "" means download failed

async function getFont(): Promise<string | undefined> {
  if (_fontPath !== null) return _fontPath || undefined;
  try {
    if (!existsSync(FONT_PATH)) {
      const res = await fetch(FONT_URL, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`font download ${res.status}`);
      writeFileSync(FONT_PATH, Buffer.from(await res.arrayBuffer()));
    }
    _fontPath = FONT_PATH;
    return FONT_PATH;
  } catch {
    _fontPath = "";
    return undefined;
  }
}

export async function aplicarOverlayTexto(input: OverlayInput): Promise<Buffer> {
  const { imagemIA, dimensoesFinal, tipo, brand, conteudo } = input;
  const [largura, altura] = dimensoesFinal.split("x").map(Number) as [number, number];

  const corPrimaria = brand.corPrimariaHex || "#2F5D50";
  const handle = derivarHandle(brand);

  const paddingRel = tipo === "stories" ? 0.06 : 0.055;
  const padding = Math.round(largura * paddingRel);
  const textWidth = largura - padding * 2;

  const yTituloRel = tipo === "stories" ? 0.78 : tipo === "feed_carrossel" ? 0.76 : 0.74;
  const fontSizeTituloRel = tipo === "stories" ? 0.058 : 0.062;
  const fontSizeHandleRel = tipo === "stories" ? 0.02 : 0.022;
  const larguraAcentoRel = tipo === "stories" ? 0.16 : 0.18;
  const alturaGradienteRel = tipo === "stories" ? 0.28 : tipo === "feed_carrossel" ? 0.3 : 0.32;

  const yTitulo = Math.round(altura * yTituloRel);
  const fontSizeTitulo = Math.round(largura * fontSizeTituloRel);
  const fontSizeHandle = Math.round(largura * fontSizeHandleRel);
  const larguraAcento = Math.round(largura * larguraAcentoRel);
  const logoLargura = Math.round(largura * 0.085);

  const baseNormalizada = await sharp(imagemIA)
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .toBuffer();

  // Gradient overlay
  const inicioGradiente = Math.round(altura * (1 - alturaGradienteRel));
  const alturaPx = altura - inicioGradiente;
  const gradienteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <defs>
    <linearGradient id="bf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
    </linearGradient>
    <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${largura}" height="${Math.round(altura * 0.14)}" fill="url(#tf)"/>
  <rect x="0" y="${inicioGradiente}" width="${largura}" height="${alturaPx}" fill="url(#bf)"/>
</svg>`;

  // Estimate title block height for accent and handle positioning
  const lineHeightPx = Math.round(fontSizeTitulo * 1.3);
  const estimatedTitleLines = Math.min(3, Math.ceil((conteudo.headline.length * fontSizeTitulo * 0.5) / textWidth));
  const titleBlockHeight = lineHeightPx * Math.max(1, estimatedTitleLines);

  const yAccent = yTitulo + titleBlockHeight + Math.round(fontSizeTitulo * 0.4);
  const yHandle = yAccent + Math.round(fontSizeHandle * 2.2);

  const accentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect x="${padding}" y="${yAccent}" width="${larguraAcento}" height="2" fill="${corPrimaria}"/>
</svg>`;

  // Download font once — without it, Pango renders every character as □
  const fontFile = await getFont();

  const makeText = (
    text: string,
    color: string,
    size: number,
    width: number,
    wrap?: "word" | "char" | "word-char" | "none",
  ) => ({
    input: {
      text: {
        text: `<span foreground="${color}">${escapePango(text)}</span>`,
        ...(fontFile ? { fontfile: fontFile, font: "Roboto" } : { font: "Sans" }),
        rgba: true,
        width,
        dpi: Math.round(72 * (size / 14)), // scale dpi so Roboto renders at target px size
        ...(wrap ? { wrap } : {}),
      },
    } as Parameters<typeof sharp>[0],
  });

  const composites: sharp.OverlayOptions[] = [
    { input: Buffer.from(gradienteSvg), top: 0, left: 0 },
    { input: Buffer.from(accentSvg), top: 0, left: 0 },
  ];

  // Headline
  const headlineText = (conteudo.headline ?? "").trim();
  if (headlineText) {
    composites.push({
      ...makeText(headlineText, "#FFFFFF", fontSizeTitulo, textWidth, "word"),
      top: yTitulo,
      left: padding,
    });
  }

  // Handle (@username)
  const handleText = handle.toUpperCase().trim();
  if (handleText && handleText !== "@") {
    composites.push({
      ...makeText(handleText, "#FFFFFFCC", fontSizeHandle, textWidth),
      top: yHandle,
      left: padding,
    });
  }

  // Eyebrow / subtitle above headline
  if (conteudo.subtitle || conteudo.eyebrow) {
    const sub = (conteudo.eyebrow ?? conteudo.subtitle ?? "").toUpperCase();
    const fontSizeSub = Math.round(fontSizeTitulo * 0.32);
    const ySub = yTitulo - Math.round(fontSizeSub * 3.5);
    if (ySub > altura * 0.5) {
      composites.push({
        ...makeText(sub, "#FFFFFFCC", fontSizeSub, textWidth),
        top: Math.max(padding, ySub),
        left: padding,
      });
    }
  }

  // Logo (optional, top-left)
  if (brand.logoUrl) {
    try {
      const logoBuf = await baixarImagem(brand.logoUrl);
      const logoResized = await sharp(logoBuf)
        .resize(logoLargura, logoLargura, { fit: "inside" })
        .png()
        .toBuffer();
      composites.push({ input: logoResized, top: padding, left: padding });
    } catch {
      // logo failed — continue without it
    }
  }

  return sharp(baseNormalizada).composite(composites).png().toBuffer();
}

function derivarHandle(brand: BrandGuidelines): string {
  const nome = (brand.nomeMarca || "").trim();
  if (!nome) return "@";
  if (nome.startsWith("@")) return nome;
  const semEspaco = nome.replace(/\s+/g, "").toLowerCase();
  return `@${semEspaco}`;
}

async function baixarImagem(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baixar logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function escapePango(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
