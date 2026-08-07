import sharp from "sharp";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";
import { comporTexto, type PedacoTexto } from "./textVector";

type OverlayInput = {
  imagemIA: Buffer;
  dimensoesFinal: Dimensoes;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
};

function posicionar(pedacos: PedacoTexto[], left: number, top: number): sharp.OverlayOptions[] {
  return pedacos.map((p) => ({ input: p.svg, left: left + p.left, top: top + p.top }));
}

export async function aplicarOverlayTexto(input: OverlayInput): Promise<Buffer> {
  const { imagemIA, dimensoesFinal, tipo, brand, conteudo } = input;
  const [largura, altura] = dimensoesFinal.split("x").map(Number) as [number, number];

  const corPrimaria = brand.corPrimariaHex || "#2F5D50";
  const handle = derivarHandle(brand);

  const paddingRel = tipo === "stories" ? 0.06 : 0.055;
  const padding = Math.round(largura * paddingRel);
  const textWidth = largura - padding * 2;

  const fontSizeTitulo = Math.round(largura * (tipo === "stories" ? 0.06 : 0.064));
  const fontSizeHandle = Math.round(largura * (tipo === "stories" ? 0.022 : 0.024));
  const fontSizeEyebrow = Math.round(largura * (tipo === "stories" ? 0.02 : 0.022));
  const larguraAcento = Math.round(largura * (tipo === "stories" ? 0.16 : 0.18));
  const logoLargura = Math.round(largura * 0.085);

  const baseNormalizada = await sharp(imagemIA)
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [];

  const headlineText = (conteudo.headline ?? "").trim();
  const eyebrowText = (conteudo.eyebrow ?? conteudo.subtitle ?? "").trim();
  const handleText = handle.toUpperCase().trim();

  const tituloVet = headlineText
    ? comporTexto({
        texto: headlineText,
        familia: "serif",
        fontSize: fontSizeTitulo,
        maxWidth: textWidth,
        cor: "#FFFFFF",
        lineHeight: 1.18,
      })
    : null;

  const eyebrowVet = eyebrowText
    ? comporTexto({
        texto: eyebrowText.toUpperCase(),
        familia: "sans",
        fontSize: fontSizeEyebrow,
        maxWidth: textWidth,
        cor: "#FFFFFF",
        opacidade: 0.85,
        letterSpacing: Math.round(fontSizeEyebrow * 0.12),
      })
    : null;

  const handleVet =
    handleText && handleText !== "@"
      ? comporTexto({
          texto: handleText,
          familia: "sans",
          fontSize: fontSizeHandle,
          maxWidth: textWidth,
          cor: "#FFFFFF",
          opacidade: 0.8,
          letterSpacing: Math.round(fontSizeHandle * 0.08),
        })
      : null;

  // Posicionamento ancorado na base: empilha de baixo pra cima
  const gapEyebrow = Math.round(fontSizeTitulo * 0.4);
  const gapAcento = Math.round(fontSizeTitulo * 0.4);
  const gapHandle = Math.round(fontSizeHandle * 0.8);
  const acentoAltura = Math.max(2, Math.round(largura * 0.004));
  const bottomPadding = Math.round(altura * (tipo === "stories" ? 0.1 : 0.07));

  let y = altura - bottomPadding;

  let handlePos: number | null = null;
  if (handleVet) {
    y -= handleVet.altura;
    handlePos = y;
    y -= gapHandle;
  }

  y -= acentoAltura;
  const acentoPos = y;
  y -= gapAcento;

  let tituloPos: number | null = null;
  if (tituloVet) {
    y -= tituloVet.altura;
    tituloPos = y;
    y -= gapEyebrow;
  }

  let eyebrowPos: number | null = null;
  if (eyebrowVet) {
    y -= eyebrowVet.altura;
    y = Math.max(padding, y);
    eyebrowPos = y;
  }

  // Gradiente adaptativo ao topo real do bloco de texto
  const topoBloco = y;
  const inicioGradiente = Math.max(
    Math.round(altura * 0.45),
    topoBloco - Math.round(altura * 0.08),
  );
  const alturaPx = altura - inicioGradiente;
  const gradienteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}">
  <defs>
    <linearGradient id="bf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="45%" stop-color="#000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
    </linearGradient>
    <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${largura}" height="${Math.round(altura * 0.14)}" fill="url(#tf)"/>
  <rect x="0" y="${inicioGradiente}" width="${largura}" height="${alturaPx}" fill="url(#bf)"/>
</svg>`;
  composites.push({ input: Buffer.from(gradienteSvg), top: 0, left: 0 });

  if (eyebrowVet && eyebrowPos !== null) composites.push(...posicionar(eyebrowVet.pedacos, padding, eyebrowPos));
  if (tituloVet && tituloPos !== null) composites.push(...posicionar(tituloVet.pedacos, padding, tituloPos));
  const acentoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraAcento}" height="${acentoAltura}"><rect width="${larguraAcento}" height="${acentoAltura}" fill="${corPrimaria}"/></svg>`;
  composites.push({ input: Buffer.from(acentoSvg), left: padding, top: acentoPos });
  if (handleVet && handlePos !== null) composites.push(...posicionar(handleVet.pedacos, padding, handlePos));

  // Logo (opcional, canto superior esquerdo)
  if (brand.logoUrl) {
    try {
      const logoBuf = await baixarImagem(brand.logoUrl);
      const logoResized = await sharp(logoBuf)
        .resize(logoLargura, logoLargura, { fit: "inside" })
        .png()
        .toBuffer();
      composites.push({ input: logoResized, top: padding, left: padding });
    } catch {
      // logo falhou — segue sem ele
    }
  }

  return sharp(baseNormalizada).composite(composites).png().toBuffer();
}

function derivarHandle(brand: BrandGuidelines): string {
  const nome = (brand.nomeMarca || "").trim();
  if (!nome) return "@";
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (semAcento.startsWith("@")) return semAcento;
  return `@${semAcento.replace(/\s+/g, "").toLowerCase()}`;
}

async function baixarImagem(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baixar logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
