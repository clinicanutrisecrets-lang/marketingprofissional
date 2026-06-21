import sharp from "sharp";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";
import { renderTextoVetorial } from "./textVector";

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

  const fontSizeTituloRel = tipo === "stories" ? 0.06 : 0.064;
  const fontSizeHandleRel = tipo === "stories" ? 0.022 : 0.024;
  const fontSizeEyebrowRel = tipo === "stories" ? 0.02 : 0.022;
  const larguraAcentoRel = tipo === "stories" ? 0.16 : 0.18;

  const fontSizeTitulo = Math.round(largura * fontSizeTituloRel);
  const fontSizeHandle = Math.round(largura * fontSizeHandleRel);
  const fontSizeEyebrow = Math.round(largura * fontSizeEyebrowRel);
  const larguraAcento = Math.round(largura * larguraAcentoRel);
  const logoLargura = Math.round(largura * 0.085);

  const baseNormalizada = await sharp(imagemIA)
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [];

  // Render dos textos como vetores (geometria pura — nunca vira □□□)
  const headlineText = (conteudo.headline ?? "").trim();
  const eyebrowText = (conteudo.eyebrow ?? conteudo.subtitle ?? "").trim();
  const handleText = handle.toUpperCase().trim();

  // Bloco do título (serif, branco)
  const tituloVet = headlineText
    ? renderTextoVetorial({
        texto: headlineText,
        familia: "serif",
        fontSize: fontSizeTitulo,
        maxWidth: textWidth,
        cor: "#FFFFFF",
        lineHeight: 1.18,
      })
    : null;

  // Eyebrow / subtítulo (sans caixa alta, com espaçamento)
  const eyebrowVet = eyebrowText
    ? renderTextoVetorial({
        texto: eyebrowText.toUpperCase(),
        familia: "sans",
        fontSize: fontSizeEyebrow,
        maxWidth: textWidth,
        cor: "#FFFFFF",
        opacidade: 0.85,
        letterSpacing: Math.round(fontSizeEyebrow * 0.12),
      })
    : null;

  // Handle (@usuario) (sans caixa alta)
  const handleVet =
    handleText && handleText !== "@"
      ? renderTextoVetorial({
          texto: handleText,
          familia: "sans",
          fontSize: fontSizeHandle,
          maxWidth: textWidth,
          cor: "#FFFFFF",
          opacidade: 0.8,
          letterSpacing: Math.round(fontSizeHandle * 0.08),
        })
      : null;

  // Posicionamento ANCORADO NA BASE: calcula a altura total do bloco
  // (eyebrow + título + acento + handle) e empilha de baixo pra cima, garantindo
  // que nada seja cortado por mais longo que seja o título.
  const gapEyebrow = Math.round(fontSizeTitulo * 0.4);
  const gapAcento = Math.round(fontSizeTitulo * 0.4);
  const gapHandle = Math.round(fontSizeHandle * 0.8);
  const acentoAltura = Math.max(2, Math.round(largura * 0.004));
  const bottomPadding = Math.round(altura * (tipo === "stories" ? 0.1 : 0.07));

  // Handle fica na base; sobe: acento, título, eyebrow
  let y = altura - bottomPadding;

  const acentoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraAcento}" height="${acentoAltura}"><rect width="${larguraAcento}" height="${acentoAltura}" fill="${corPrimaria}"/></svg>`;

  const handleComposite = handleVet
    ? { input: Buffer.from(handleVet.svg), left: padding, top: 0 }
    : null;
  if (handleVet && handleComposite) {
    y -= handleVet.altura;
    handleComposite.top = y;
    y -= gapHandle;
  }

  y -= acentoAltura;
  const acentoComposite = { input: Buffer.from(acentoSvg), left: padding, top: y };
  y -= gapAcento;

  let tituloComposite: sharp.OverlayOptions | null = null;
  if (tituloVet) {
    y -= tituloVet.altura;
    tituloComposite = { input: Buffer.from(tituloVet.svg), left: padding, top: y };
    y -= gapEyebrow;
  }

  let eyebrowComposite: sharp.OverlayOptions | null = null;
  if (eyebrowVet) {
    y -= eyebrowVet.altura;
    y = Math.max(padding, y);
    eyebrowComposite = { input: Buffer.from(eyebrowVet.svg), left: padding, top: y };
  }

  // Gradiente adaptativo: começa um pouco acima do topo real do bloco de texto
  // para garantir legibilidade independente de quantas linhas o título tem.
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

  // Empurra na ordem visual (cima -> baixo)
  if (eyebrowComposite) composites.push(eyebrowComposite);
  if (tituloComposite) composites.push(tituloComposite);
  composites.push(acentoComposite);
  if (handleComposite) composites.push(handleComposite);

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
  if (nome.startsWith("@")) return nome;
  const semEspaco = nome.replace(/\s+/g, "").toLowerCase();
  return `@${semEspaco}`;
}

async function baixarImagem(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baixar logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
