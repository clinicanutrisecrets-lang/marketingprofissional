import sharp from "sharp";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";

type OverlayInput = {
  imagemIA: Buffer;
  dimensoesFinal: Dimensoes;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
};

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

  // Gradient overlay (geometric SVG — no text, always renders correctly)
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

  // Approximate title block height to position accent line and handle below it
  // Sharp text wraps at textWidth — estimate ~2 lines for most headlines
  const lineHeightPx = Math.round(fontSizeTitulo * 1.3);
  const estimatedTitleLines = Math.min(3, Math.ceil((conteudo.headline.length * fontSizeTitulo * 0.5) / textWidth));
  const titleBlockHeight = lineHeightPx * Math.max(1, estimatedTitleLines);

  const yAccent = yTitulo + titleBlockHeight + Math.round(fontSizeTitulo * 0.4);
  const yHandle = yAccent + Math.round(fontSizeHandle * 2.2);

  // Accent line SVG (just a colored rect — no text)
  const accentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <rect x="${padding}" y="${yAccent}" width="${larguraAcento}" height="2" fill="${corPrimaria}"/>
</svg>`;

  // Build composite layers
  const composites: sharp.OverlayOptions[] = [
    { input: Buffer.from(gradienteSvg), top: 0, left: 0 },
    { input: Buffer.from(accentSvg), top: 0, left: 0 },
  ];

  // Title — use Sharp's native text rendering (Pango/fontconfig, no □□□ issue)
  composites.push({
    input: {
      text: {
        text: `<span foreground="#FFFFFF" font_desc="serif ${fontSizeTitulo}">${escapePango(conteudo.headline)}</span>`,
        rgba: true,
        width: textWidth,
        wrap: "word",
        dpi: 72,
      },
    } as Parameters<typeof sharp>[0],
    top: yTitulo,
    left: padding,
  });

  // Handle (@username)
  composites.push({
    input: {
      text: {
        text: `<span foreground="#FFFFFFCC" font_desc="sans-serif ${fontSizeHandle}">${escapePango(handle.toUpperCase())}</span>`,
        rgba: true,
        width: textWidth,
        dpi: 72,
      },
    } as Parameters<typeof sharp>[0],
    top: yHandle,
    left: padding,
  });

  // Subtitle eyebrow (optional) — positioned above headline
  if (conteudo.subtitle || conteudo.eyebrow) {
    const sub = conteudo.eyebrow ?? conteudo.subtitle ?? "";
    const fontSizeSub = Math.round(fontSizeTitulo * 0.32);
    const ySub = yTitulo - Math.round(fontSizeSub * 3.5);
    if (ySub > altura * 0.5) {
      composites.push({
        input: {
          text: {
            text: `<span foreground="#FFFFFFCC" font_desc="sans-serif ${fontSizeSub}">${escapePango(sub.toUpperCase())}</span>`,
            rgba: true,
            width: textWidth,
            dpi: 72,
          },
        } as Parameters<typeof sharp>[0],
        top: Math.max(padding, ySub),
        left: padding,
      });
    }
  }

  // Logo (optional, top-left corner)
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
