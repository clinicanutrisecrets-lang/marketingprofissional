import sharp from "sharp";
import type { ConteudoPeca, Dimensoes, BrandGuidelines, TipoPeca } from "./types";
import { getSafeZone } from "./types";

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

  const normalizada = await sharp(imagemIA)
    .resize(largura, altura, { fit: "cover", position: "center" })
    .toBuffer();

  const safe = getSafeZone(dimensoesFinal);

  const overlaySvg = construirOverlaySvg({
    largura,
    altura,
    safe,
    tipo,
    brand,
    conteudo,
  });

  let composicao = sharp(normalizada).composite([
    { input: Buffer.from(overlaySvg), top: 0, left: 0 },
  ]);

  if (brand.logoUrl) {
    try {
      const logoBuf = await baixarImagem(brand.logoUrl);
      const logoLargura = Math.round(largura * 0.12);
      const logoResized = await sharp(logoBuf)
        .resize(logoLargura, logoLargura, { fit: "inside" })
        .png()
        .toBuffer();
      composicao = composicao.composite([
        { input: Buffer.from(overlaySvg), top: 0, left: 0 },
        {
          input: logoResized,
          top: Math.round(altura * 0.04),
          left: largura - logoLargura - Math.round(largura * 0.04),
        },
      ]);
    } catch {
      // logo falhou, segue sem
    }
  }

  return composicao.png().toBuffer();
}

async function baixarImagem(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`baixar logo: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function construirOverlaySvg(params: {
  largura: number;
  altura: number;
  safe: ReturnType<typeof getSafeZone>;
  tipo: TipoPeca;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
}): string {
  const { largura, altura, safe, brand, conteudo } = params;

  const corPrimaria = brand.corPrimariaHex || "#2F5D50";
  const padding = Math.round(largura * 0.06);
  const maxWidthTexto = largura - padding * 2;

  const fonteHeadline = Math.round(largura * 0.065);
  const fonteSubtitle = Math.round(largura * 0.032);
  const fonteCorpo = Math.round(largura * 0.028);
  const fonteEyebrow = Math.round(largura * 0.022);
  const fonteCta = Math.round(largura * 0.03);

  const linhasHeadline = quebrarLinhas(conteudo.headline, Math.floor(maxWidthTexto / (fonteHeadline * 0.5)));
  const linhasCorpo = conteudo.corpo
    ? quebrarLinhas(conteudo.corpo, Math.floor(maxWidthTexto / (fonteCorpo * 0.52)))
    : [];

  let y = safe.y + Math.round(safe.height * 0.12);

  const partes: string[] = [];

  partes.push(
    `<defs>
      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${corPrimaria}" stop-opacity="0"/>
        <stop offset="35%" stop-color="${corPrimaria}" stop-opacity="0.82"/>
        <stop offset="100%" stop-color="${corPrimaria}" stop-opacity="0.95"/>
      </linearGradient>
    </defs>`,
  );
  partes.push(
    `<rect x="${safe.x}" y="${safe.y}" width="${safe.width}" height="${safe.height}" fill="url(#grad)"/>`,
  );

  if (conteudo.eyebrow) {
    partes.push(
      `<text x="${padding}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${fonteEyebrow}" font-weight="600" fill="#FFFFFF" letter-spacing="3" opacity="0.85">${escapeXml(conteudo.eyebrow.toUpperCase())}</text>`,
    );
    y += fonteEyebrow + Math.round(fonteEyebrow * 0.8);
  }

  const lineHeightHeadline = Math.round(fonteHeadline * 1.1);
  linhasHeadline.forEach((linha, idx) => {
    partes.push(
      `<text x="${padding}" y="${y + lineHeightHeadline * idx}" font-family="Georgia, Palatino, serif" font-size="${fonteHeadline}" font-weight="500" fill="#FFFFFF">${escapeXml(linha)}</text>`,
    );
  });
  y += lineHeightHeadline * linhasHeadline.length + Math.round(fonteHeadline * 0.3);

  if (conteudo.subtitle) {
    const linhasSub = quebrarLinhas(conteudo.subtitle, Math.floor(maxWidthTexto / (fonteSubtitle * 0.5)));
    const lineHeightSub = Math.round(fonteSubtitle * 1.4);
    linhasSub.forEach((linha, idx) => {
      partes.push(
        `<text x="${padding}" y="${y + lineHeightSub * idx}" font-family="Helvetica, Arial, sans-serif" font-size="${fonteSubtitle}" font-weight="400" fill="#FFFFFF" opacity="0.9">${escapeXml(linha)}</text>`,
      );
    });
    y += lineHeightSub * linhasSub.length + Math.round(fonteSubtitle * 0.8);
  }

  if (linhasCorpo.length > 0) {
    const lineHeightCorpo = Math.round(fonteCorpo * 1.45);
    linhasCorpo.forEach((linha, idx) => {
      partes.push(
        `<text x="${padding}" y="${y + lineHeightCorpo * idx}" font-family="Helvetica, Arial, sans-serif" font-size="${fonteCorpo}" font-weight="400" fill="#FFFFFF" opacity="0.92">${escapeXml(linha)}</text>`,
      );
    });
    y += lineHeightCorpo * linhasCorpo.length + Math.round(fonteCorpo * 0.8);
  }

  if (conteudo.cta) {
    const ctaPadX = Math.round(fonteCta * 0.9);
    const ctaPadY = Math.round(fonteCta * 0.5);
    const ctaWidthAprox = conteudo.cta.length * fonteCta * 0.58 + ctaPadX * 2;
    const ctaX = padding;
    const ctaY = y;
    partes.push(
      `<rect x="${ctaX}" y="${ctaY}" width="${ctaWidthAprox}" height="${fonteCta + ctaPadY * 2}" rx="${Math.round((fonteCta + ctaPadY * 2) / 2)}" fill="#FFFFFF"/>`,
    );
    partes.push(
      `<text x="${ctaX + ctaPadX}" y="${ctaY + fonteCta + ctaPadY - Math.round(fonteCta * 0.15)}" font-family="Helvetica, Arial, sans-serif" font-size="${fonteCta}" font-weight="600" fill="${corPrimaria}">${escapeXml(conteudo.cta)}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}">${partes.join("")}</svg>`;
}

function quebrarLinhas(texto: string, maxChars: number): string[] {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = "";
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (tentativa.length <= maxChars) {
      atual = tentativa;
    } else {
      if (atual) linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
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
