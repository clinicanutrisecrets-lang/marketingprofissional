import sharp from "sharp";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";

type OverlayInput = {
  imagemIA: Buffer;
  dimensoesFinal: Dimensoes;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
};

type LayoutSpec = {
  largura: number;
  altura: number;
  // proporcao do gradiente inferior (0..1) — area que vai escurecer pra legibilidade
  alturaGradiente: number;
  // padding lateral em px
  padding: number;
  // posicao y onde comeca o titulo (em px)
  yTitulo: number;
  fontSizeTitulo: number;
  fontSizeHandle: number;
  larguraAcento: number;
  logoLargura: number;
};

export async function aplicarOverlayTexto(input: OverlayInput): Promise<Buffer> {
  const { imagemIA, dimensoesFinal, tipo, brand, conteudo } = input;
  const [largura, altura] = dimensoesFinal.split("x").map(Number) as [number, number];

  const layout = construirLayout(largura, altura, tipo);
  const corPrimaria = brand.corPrimariaHex || "#2F5D50";
  const handle = derivarHandle(brand);

  const baseNormalizada = await sharp(imagemIA)
    .resize(largura, altura, { fit: "cover", position: "attention" })
    .toBuffer();

  // 1. Gradiente sutil apenas na faixa inferior — preto translúcido pra legibilidade
  const gradienteSvg = construirGradienteInferior(layout);
  let composicao = sharp(baseNormalizada).composite([
    { input: Buffer.from(gradienteSvg), top: 0, left: 0 },
  ]);

  // 2. Texto: título serif + linha de acento + handle
  const textoSvg = construirTextoEditorial({
    layout,
    corPrimaria,
    titulo: conteudo.headline,
    subtitle: conteudo.subtitle,
    handle,
  });
  composicao = composicao.composite([
    { input: Buffer.from(gradienteSvg), top: 0, left: 0 },
    { input: Buffer.from(textoSvg), top: 0, left: 0 },
  ]);

  // 3. Logo discreto no canto superior esquerdo (se existir)
  if (brand.logoUrl) {
    try {
      const logoBuf = await baixarImagem(brand.logoUrl);
      const logoResized = await sharp(logoBuf)
        .resize(layout.logoLargura, layout.logoLargura, { fit: "inside" })
        .png()
        .toBuffer();
      composicao = composicao.composite([
        { input: Buffer.from(gradienteSvg), top: 0, left: 0 },
        { input: Buffer.from(textoSvg), top: 0, left: 0 },
        {
          input: logoResized,
          top: layout.padding,
          left: layout.padding,
        },
      ]);
    } catch {
      // logo falhou — segue sem
    }
  }

  return composicao.png().toBuffer();
}

function construirLayout(largura: number, altura: number, tipo: TipoPeca): LayoutSpec {
  // Defaults pra feed_imagem 1080x1080
  let alturaGradiente = 0.32;
  let yTituloRel = 0.74;
  let fontSizeTituloRel = 0.062;
  let fontSizeHandleRel = 0.022;
  let larguraAcentoRel = 0.18;
  let logoLarguraRel = 0.085;
  let paddingRel = 0.055;

  if (tipo === "stories") {
    alturaGradiente = 0.28;
    yTituloRel = 0.78;
    fontSizeTituloRel = 0.058;
    fontSizeHandleRel = 0.02;
    larguraAcentoRel = 0.16;
    logoLarguraRel = 0.08;
    paddingRel = 0.06;
  } else if (tipo === "feed_carrossel") {
    alturaGradiente = 0.3;
    yTituloRel = 0.76;
    fontSizeTituloRel = 0.06;
    fontSizeHandleRel = 0.022;
    larguraAcentoRel = 0.17;
    logoLarguraRel = 0.085;
    paddingRel = 0.055;
  }

  return {
    largura,
    altura,
    alturaGradiente,
    padding: Math.round(largura * paddingRel),
    yTitulo: Math.round(altura * yTituloRel),
    fontSizeTitulo: Math.round(largura * fontSizeTituloRel),
    fontSizeHandle: Math.round(largura * fontSizeHandleRel),
    larguraAcento: Math.round(largura * larguraAcentoRel),
    logoLargura: Math.round(largura * logoLarguraRel),
  };
}

function construirGradienteInferior(layout: LayoutSpec): string {
  const { largura, altura, alturaGradiente } = layout;
  const inicioGradiente = Math.round(altura * (1 - alturaGradiente));
  const alturaPx = altura - inicioGradiente;

  // Gradiente preto suave: transparente no topo da faixa, escurece progressivamente
  // até ~70% no rodapé. Não é bloco sólido — preserva a fotografia.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="55%" stop-color="#000000" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.78"/>
    </linearGradient>
    <linearGradient id="topFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${largura}" height="${Math.round(altura * 0.14)}" fill="url(#topFade)"/>
  <rect x="0" y="${inicioGradiente}" width="${largura}" height="${alturaPx}" fill="url(#bottomFade)"/>
</svg>`;
}

function construirTextoEditorial(params: {
  layout: LayoutSpec;
  corPrimaria: string;
  titulo: string;
  subtitle?: string;
  handle: string;
}): string {
  const { layout, corPrimaria, titulo, subtitle, handle } = params;
  const { largura, altura, padding, yTitulo, fontSizeTitulo, fontSizeHandle, larguraAcento } =
    layout;

  // Quebra titulo em no máximo 3 linhas, prioriza linhas mais curtas pra elegância
  const charsPorLinha = Math.floor((largura - padding * 2) / (fontSizeTitulo * 0.46));
  const linhasTitulo = quebrarLinhasEditorial(titulo, charsPorLinha, 3);

  const lineHeightTitulo = Math.round(fontSizeTitulo * 1.08);
  const partes: string[] = [];

  // Título — serif, grande, branco, line-height tight
  let yCursor = yTitulo;
  linhasTitulo.forEach((linha, idx) => {
    partes.push(
      `<text x="${padding}" y="${yCursor + lineHeightTitulo * idx}" ` +
        `font-family="Georgia, 'Times New Roman', 'DejaVu Serif', serif" ` +
        `font-size="${fontSizeTitulo}" font-weight="400" fill="#FFFFFF" ` +
        `style="letter-spacing:-0.5px">${escapeXml(linha)}</text>`,
    );
  });
  yCursor += lineHeightTitulo * linhasTitulo.length + Math.round(fontSizeTitulo * 0.55);

  // Linha de acento fina — cor da marca
  partes.push(
    `<rect x="${padding}" y="${yCursor}" width="${larguraAcento}" height="2" fill="${corPrimaria}"/>`,
  );
  yCursor += Math.round(fontSizeHandle * 1.6);

  // Handle — pequeno, sans uppercase, espaçado
  partes.push(
    `<text x="${padding}" y="${yCursor}" ` +
      `font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" ` +
      `font-size="${fontSizeHandle}" font-weight="500" fill="#FFFFFF" ` +
      `style="letter-spacing:3.5px;opacity:0.85">${escapeXml(handle.toUpperCase())}</text>`,
  );

  // Subtitle (opcional) — só renderiza se couber acima do título sem invadir foto
  if (subtitle) {
    const fontSizeSub = Math.round(fontSizeTitulo * 0.32);
    const ySub = yTitulo - Math.round(fontSizeSub * 2.2);
    const charsSubLinha = Math.floor((largura - padding * 2) / (fontSizeSub * 0.48));
    const linhasSub = quebrarLinhasEditorial(subtitle, charsSubLinha, 1);
    if (linhasSub.length > 0 && ySub > altura * 0.55) {
      partes.push(
        `<text x="${padding}" y="${ySub}" ` +
          `font-family="Helvetica, Arial, 'DejaVu Sans', sans-serif" ` +
          `font-size="${fontSizeSub}" font-weight="500" fill="#FFFFFF" ` +
          `style="letter-spacing:2px;opacity:0.78">${escapeXml(linhasSub[0]!.toUpperCase())}</text>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">${partes.join("")}</svg>`;
}

function derivarHandle(brand: BrandGuidelines): string {
  const nome = (brand.nomeMarca || "").trim();
  if (!nome) return "@";
  if (nome.startsWith("@")) return nome;
  // Se nome tem espaço, transforma em handle plausível; senão usa cru
  const semEspaco = nome.replace(/\s+/g, "").toLowerCase();
  return `@${semEspaco}`;
}

async function baixarImagem(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baixar logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Quebra de linhas otimizada pra editorial — prefere linhas balanceadas,
 * limita ao número de linhas alvo (corta restante com elipse).
 */
function quebrarLinhasEditorial(texto: string, maxChars: number, maxLinhas: number): string[] {
  const palavras = texto.trim().split(/\s+/);
  const linhas: string[] = [];
  let atual = "";

  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length <= maxChars) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = p;
      if (linhas.length === maxLinhas) {
        // Estourou — corta título com elipse
        linhas[maxLinhas - 1] = `${linhas[maxLinhas - 1]!.replace(/[.,;:]+$/, "")}…`;
        return linhas;
      }
    }
  }
  if (atual && linhas.length < maxLinhas) linhas.push(atual);
  return linhas;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
