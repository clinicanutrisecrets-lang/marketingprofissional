import sharp from "sharp";
import type { BrandGuidelines, ConteudoPeca, Dimensoes } from "./types";
import { comporTexto, medirTexto, type PedacoTexto } from "./textVector";

/**
 * Motor de cards tipográficos — arte de estúdio, 100% determinística.
 *
 * Em vez de depender de foto gerada por IA como protagonista (aleatória,
 * cara e muitas vezes fora do tema), o card é DESENHADO: fundo em cor da
 * marca, tipografia editorial grande (Playfair Display), apoio em
 * Montserrat e detalhe manuscrito em Caveat. Padrão visual de social media
 * premium (referências da usuária).
 *
 * Zero chamadas de IA → zero custo, zero surpresa, zero revisão.
 */

export type CardLayout = "hero" | "foto" | "conteudo";

export type CardInput = {
  layout: CardLayout;
  dimensoes: Dimensoes;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  /** Foto opcional (tirinha decorativa no layout "foto") */
  fotoBuffer?: Buffer;
  /** Força um esquema de cor (0..2); default = hash do headline */
  schemeIndex?: number;
  /** Cor de fundo personalizada (hex) — as cores de texto se adaptam
   *  automaticamente por luminância para manter contraste */
  corFundoHex?: string;
  /** Logo (PNG/JPG) composta no topo-centro do card */
  logoBuffer?: Buffer;
};

type Scheme = {
  bg: string;
  titulo: string;
  sub: string;
  kicker: string;
  pill: string;
  handle: string;
};

// ————— Utilidades de cor —————

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mistura a cor com preto (f=0 → cor pura, f=1 → preto). */
function shade(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - f), g * (1 - f), b * (1 - f));
}

/** Mistura a cor com branco (f=0 → cor pura, f=1 → branco). */
function tint(hex: string, f: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

const CREME = "#F5EFE2";
const TEXTO_ESCURO = "#3E3A33";
const TERRACOTA = "#C0765A";

function esquemas(corPrimaria: string): Scheme[] {
  const prim = /^#[0-9a-fA-F]{6}$/.test(corPrimaria) ? corPrimaria : "#2F5D50";
  // Contraste alto em todos os papéis — texto de apoio nunca "some" no fundo
  return [
    // 1. Profundo — bloco na cor da marca, texto creme (capa/premium)
    {
      bg: shade(prim, 0.18),
      titulo: CREME,
      sub: "#EFE9DC",
      kicker: "#DE9A74", // terracota clara: destaca no fundo escuro
      pill: CREME,
      handle: "#D8D0BF",
    },
    // 2. Creme — fundo linho, título na cor da marca (leve/clean)
    {
      bg: CREME,
      titulo: shade(prim, 0.12),
      sub: TEXTO_ESCURO,
      kicker: shade(TERRACOTA, 0.12),
      pill: shade(prim, 0.12),
      handle: shade(prim, 0.2),
    },
    // 3. Suave — pastel da marca, contraste alto (variação)
    {
      bg: tint(prim, 0.84),
      titulo: shade(prim, 0.38),
      sub: TEXTO_ESCURO,
      kicker: shade(TERRACOTA, 0.1),
      pill: shade(prim, 0.38),
      handle: shade(prim, 0.35),
    },
  ];
}

/** Luminância relativa aproximada (0 = preto, 1 = branco). */
function luminancia(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Esquema derivado de uma cor de fundo escolhida pela usuária: as cores de
 * texto se adaptam por luminância pra nunca perder contraste.
 */
function esquemaCustom(bgHex: string, corPrimaria: string): Scheme {
  const prim = /^#[0-9a-fA-F]{6}$/.test(corPrimaria) ? corPrimaria : "#2F5D50";
  const escuro = luminancia(bgHex) < 0.55;
  if (escuro) {
    return {
      bg: bgHex,
      titulo: CREME,
      sub: "#EFE9DC",
      kicker: "#DE9A74",
      pill: CREME,
      handle: "#D8D0BF",
    };
  }
  return {
    bg: bgHex,
    titulo: shade(prim, 0.15),
    sub: TEXTO_ESCURO,
    kicker: shade(TERRACOTA, 0.12),
    pill: shade(prim, 0.15),
    handle: shade(prim, 0.25),
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function derivarHandle(brand: BrandGuidelines): string {
  const nome = (brand.nomeMarca || "").trim();
  if (!nome) return "";
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (semAcento.startsWith("@")) return semAcento.toLowerCase();
  return `@${semAcento.replace(/\s+/g, "").toLowerCase()}`;
}

// ————— Blocos de composição —————

/** Um bloco pronto: lista de SVGs com offsets relativos ao topo-esquerdo do bloco. */
type Bloco = { pedacos: PedacoTexto[]; largura: number; altura: number };

function blocoDeTexto(
  texto: string,
  familia: "serif" | "sans" | "manuscrita",
  cor: string,
  fontSize: number,
  maxWidth: number,
  opts?: {
    peso?: number;
    lineHeight?: number;
    opacidade?: number;
    align?: "left" | "center";
    letterSpacing?: number;
  },
): Bloco {
  const r = comporTexto({
    texto,
    familia,
    fontSize,
    maxWidth,
    cor,
    lineHeight: opts?.lineHeight ?? 1.4,
    peso: opts?.peso ?? 0,
    opacidade: opts?.opacidade ?? 1,
    align: opts?.align ?? "center",
    letterSpacing: opts?.letterSpacing ?? 0,
  });
  return { pedacos: r.pedacos, largura: r.largura, altura: r.altura };
}

/** Pill de eyebrow: texto em caixa alta com contorno oval (estilo editorial). */
function blocoPill(texto: string, cor: string, larguraCard: number): Bloco | null {
  const t = texto.trim().toUpperCase();
  if (!t) return null;
  const fontSize = Math.round(larguraCard * 0.021);
  const tracking = Math.round(fontSize * 0.28);
  const textW = medirTexto(t, "sans", fontSize, tracking);
  const padX = Math.round(fontSize * 1.9);
  const padY = Math.round(fontSize * 1.05);
  const w = Math.ceil(textW + padX * 2);
  const h = Math.ceil(fontSize + padY * 2);

  const texto_ = comporTexto({
    texto: t,
    familia: "sans",
    fontSize,
    maxWidth: w,
    cor,
    letterSpacing: tracking,
    align: "center",
    peso: 0.6,
  });

  const elipse = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 2}" ry="${h / 2 - 2}" fill="none" stroke="${cor}" stroke-width="1.8"/></svg>`,
  );

  const yTexto = Math.round((h - texto_.altura) / 2);
  const pedacos: PedacoTexto[] = [
    { svg: elipse, left: 0, top: 0 },
    ...texto_.pedacos.map((p) => ({ ...p, top: p.top + yTexto })),
  ];
  return { pedacos, largura: w, altura: h };
}

/** Título serif com auto-ajuste de tamanho até caber no orçamento de altura. */
function blocoTitulo(
  texto: string,
  cor: string,
  maxWidth: number,
  maxHeight: number,
  fontSizeInicial: number,
): Bloco {
  let fs = fontSizeInicial;
  for (let i = 0; i < 12; i++) {
    const r = comporTexto({
      texto,
      familia: "serif",
      fontSize: fs,
      maxWidth,
      cor,
      lineHeight: 1.08,
      align: "center",
    });
    if (r.altura <= maxHeight || fs <= 24) {
      return { pedacos: r.pedacos, largura: r.largura, altura: r.altura };
    }
    fs = Math.floor(fs * 0.92);
  }
  const r = comporTexto({
    texto,
    familia: "serif",
    fontSize: fs,
    maxWidth,
    cor,
    lineHeight: 1.08,
    align: "center",
  });
  return { pedacos: r.pedacos, largura: r.largura, altura: r.altura };
}

/** Foto com cantos arredondados (tirinha decorativa). */
async function fotoArredondada(foto: Buffer, w: number, h: number, raio: number): Promise<Buffer> {
  const base = await sharp(foto).resize(w, h, { fit: "cover", position: "attention" }).png().toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${raio}" ry="${raio}" fill="#fff"/></svg>`,
  );
  return sharp(base).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

/** Converte um Bloco posicionado em composites do Sharp. */
function posicionar(b: Bloco, left: number, top: number): sharp.OverlayOptions[] {
  return b.pedacos.map((p) => ({ input: p.svg, left: left + p.left, top: top + p.top }));
}

// ————— Renderizador principal —————

export async function renderCard(input: CardInput): Promise<Buffer> {
  const { layout, dimensoes, brand, conteudo, fotoBuffer } = input;
  const [W, H] = dimensoes.split("x").map(Number) as [number, number];
  const stories = H / W > 1.5;

  const corFundoValida =
    input.corFundoHex && /^#[0-9a-fA-F]{6}$/.test(input.corFundoHex) ? input.corFundoHex : null;
  let scheme: Scheme;
  if (corFundoValida) {
    scheme = esquemaCustom(corFundoValida, brand.corPrimariaHex || "#2F5D50");
  } else {
    const lista = esquemas(brand.corPrimariaHex || "#2F5D50");
    const idx = input.schemeIndex ?? hashString(conteudo.headline || "x") % lista.length;
    scheme = lista[Math.abs(idx) % lista.length]!;
  }

  const handle = derivarHandle(brand);

  if (layout === "conteudo") {
    return renderConteudo({ W, H, scheme, conteudo, handle });
  }

  const headline = (conteudo.headline ?? "").trim();
  const eyebrow = (conteudo.eyebrow ?? "").trim();
  const subtitle = (conteudo.subtitle ?? "").trim();
  const kicker = (conteudo.cta ?? "").trim();

  const contentW = Math.round(W * 0.84);
  const composites: sharp.OverlayOptions[] = [];

  // ——— hero / foto: pilha central ———
  // Com foto, tudo encolhe um pouco pra sobrar respiro (a foto rouba ~22% da altura)
  const esc = layout === "foto" && fotoBuffer ? 0.86 : 1;
  type Item = { bloco: Bloco; gapAntes: number; foto?: Buffer };
  const itens: Item[] = [];
  const gapUnit = Math.round(H * (stories ? 0.028 : 0.038) * esc);

  let fotoStrip: { buf: Buffer; w: number; h: number } | null = null;
  if (layout === "foto" && fotoBuffer) {
    const fotoW = contentW;
    const fotoH = Math.round(H * (stories ? 0.2 : 0.22));
    try {
      const foto = await fotoArredondada(fotoBuffer, fotoW, fotoH, Math.round(W * 0.024));
      fotoStrip = { buf: foto, w: fotoW, h: fotoH };
    } catch {
      // foto falhou — card segue tipográfico puro
    }
  }

  // Logo no topo-centro (estilo @patibianco). Empurra o conteúdo pra baixo.
  // Usa o buffer enviado ou baixa da logoUrl da marca (onboarding).
  let logoBruta: Buffer | undefined = input.logoBuffer;
  if (!logoBruta && brand.logoUrl) {
    try {
      const res = await fetch(brand.logoUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) logoBruta = Buffer.from(await res.arrayBuffer());
    } catch {
      // logo remota indisponível — segue sem
    }
  }
  let logoComposite: { buf: Buffer; w: number; h: number } | null = null;
  if (logoBruta) {
    try {
      const maxLogoH = Math.round(H * 0.055);
      const maxLogoW = Math.round(W * 0.34);
      const logoPng = await sharp(logoBruta)
        .resize(maxLogoW, maxLogoH, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      const meta = await sharp(logoPng).metadata();
      logoComposite = { buf: logoPng, w: meta.width ?? maxLogoW, h: meta.height ?? maxLogoH };
    } catch {
      // logo inválida — segue sem
    }
  }

  if (eyebrow) {
    const pill = blocoPill(eyebrow, scheme.pill, W);
    if (pill) itens.push({ bloco: pill, gapAntes: 0 });
  }

  if (headline) {
    const budget = H * (stories ? 0.34 : fotoStrip ? 0.24 : 0.38);
    const titulo = blocoTitulo(
      headline,
      scheme.titulo,
      contentW,
      budget,
      Math.round(W * (stories ? 0.095 : 0.1) * esc),
    );
    itens.push({ bloco: titulo, gapAntes: itens.length || fotoStrip ? Math.round(gapUnit * 1.15) : 0 });
  }

  if (subtitle) {
    const sub = blocoDeTexto(subtitle, "sans", scheme.sub, Math.round(W * 0.041 * esc), Math.round(W * 0.78), {
      peso: 1.1,
      lineHeight: 1.42,
    });
    itens.push({ bloco: sub, gapAntes: Math.round(gapUnit * 1.1) });
  }

  if (kicker) {
    const k = blocoDeTexto(kicker, "manuscrita", scheme.kicker, Math.round(W * 0.07 * esc), Math.round(W * 0.8), {
      lineHeight: 1.15,
    });
    itens.push({ bloco: k, gapAntes: gapUnit });
  }

  const alturaFoto = fotoStrip ? fotoStrip.h + Math.round(gapUnit * 0.6) : 0;
  const alturaGrupo =
    alturaFoto + itens.reduce((acc, x) => acc + x.gapAntes + x.bloco.altura, 0);
  // Com logo, a área útil começa abaixo dela
  const areaTopo = Math.round(H * 0.07) + (logoComposite ? logoComposite.h + Math.round(H * 0.02) : 0);
  // Base da área útil: acima do handle (que fica fixo no rodapé)
  const areaBase = H - Math.round(H * (stories ? 0.13 : 0.12));
  const centrado = Math.round(areaTopo + (areaBase - areaTopo - alturaGrupo) * 0.46);
  // Nunca deixa o grupo invadir o rodapé: se for alto demais, ancora no teto
  let y = Math.max(areaTopo, Math.min(centrado, areaBase - alturaGrupo));

  if (logoComposite) {
    composites.push({
      input: logoComposite.buf,
      top: Math.round(H * 0.045),
      left: Math.round((W - logoComposite.w) / 2),
    });
  }

  if (fotoStrip) {
    composites.push({ input: fotoStrip.buf, top: y, left: Math.round((W - fotoStrip.w) / 2) });
    y += fotoStrip.h + Math.round(gapUnit * 0.6);
  }

  for (const { bloco, gapAntes } of itens) {
    y += gapAntes;
    composites.push(...posicionar(bloco, Math.round((W - bloco.largura) / 2), y));
    y += bloco.altura;
  }

  // Handle na base (fixo)
  if (handle) {
    const fsH = Math.round(W * 0.02);
    const hBloco = blocoDeTexto(handle, "sans", scheme.handle, fsH, contentW, {
      letterSpacing: Math.round(fsH * 0.18),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(
        hBloco,
        Math.round((W - hBloco.largura) / 2),
        H - Math.round(H * 0.055) - hBloco.altura,
      ),
    );
  }

  const [bgR, bgG, bgB] = hexToRgb(scheme.bg);
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: bgR, g: bgG, b: bgB } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

// ————— Slide de conteúdo (carrossel interno) —————

async function renderConteudo(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle } = params;
  const contentW = Math.round(W * 0.82);
  const composites: sharp.OverlayOptions[] = [];

  const headline = (conteudo.headline ?? "").trim();
  const corpo = (conteudo.corpo ?? conteudo.subtitle ?? "").trim();

  let y = Math.round(H * 0.1);

  if (headline) {
    const titulo = blocoTitulo(headline, scheme.titulo, contentW, H * 0.24, Math.round(W * 0.062));
    composites.push(...posicionar(titulo, Math.round((W - titulo.largura) / 2), y));
    y += titulo.altura + Math.round(H * 0.015);

    const linhaW = Math.round(W * 0.1);
    const linha = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${linhaW}" height="3"><rect width="${linhaW}" height="3" rx="1.5" fill="${scheme.kicker}"/></svg>`,
    );
    composites.push({ input: linha, top: y + 8, left: Math.round((W - linhaW) / 2) });
    y += Math.round(H * 0.05);
  }

  if (corpo) {
    const paragrafos = corpo
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);
    const fontSize = Math.round(W * 0.034);
    const maxY = H - Math.round(H * 0.14);
    for (const p of paragrafos) {
      const bloco = blocoDeTexto(p, "sans", scheme.sub, fontSize, contentW, {
        lineHeight: 1.52,
        align: "left",
        peso: 0.4,
      });
      if (y + bloco.altura > maxY) break; // não estoura o card
      composites.push(...posicionar(bloco, Math.round((W - contentW) / 2), y));
      y += bloco.altura + Math.round(fontSize * 1.1);
    }
  }

  if (handle) {
    const fsH = Math.round(W * 0.019);
    const hBloco = blocoDeTexto(handle, "sans", scheme.handle, fsH, contentW, {
      letterSpacing: Math.round(fsH * 0.18),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(
        hBloco,
        Math.round((W - hBloco.largura) / 2),
        H - Math.round(H * 0.05) - hBloco.altura,
      ),
    );
  }

  const [bgR, bgG, bgB] = hexToRgb(scheme.bg);
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: bgR, g: bgG, b: bgB } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
