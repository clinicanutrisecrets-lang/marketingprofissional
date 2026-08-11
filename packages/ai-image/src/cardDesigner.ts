import sharp from "sharp";
import type { BrandGuidelines, ConteudoPeca, Dimensoes } from "./types";
import { comporTexto, medirTexto, type PedacoTexto } from "./textVector";
import { svgIlustracao, type IlustracaoId } from "./lineArt";

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

export type CardLayout = "hero" | "foto" | "conteudo" | "citacao" | "lista" | "editorial";

export type CardInput = {
  layout: CardLayout;
  dimensoes: Dimensoes;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  /** Foto opcional (tirinha decorativa no layout "foto") */
  fotoBuffer?: Buffer;
  /** Enquadramento vertical da foto na tirinha (default "centro") */
  fotoPosicao?: "topo" | "centro" | "base";
  /** Força um esquema de cor (0..2); default = hash do headline */
  schemeIndex?: number;
  /** Cor de fundo personalizada (hex) — as cores de texto se adaptam
   *  automaticamente por luminância para manter contraste */
  corFundoHex?: string;
  /** Logo (PNG/JPG) composta no topo-centro do card */
  logoBuffer?: Buffer;
  /** Ilustração line-art da biblioteca interna (layout editorial) */
  ilustracao?: IlustracaoId;
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
async function fotoArredondada(
  foto: Buffer,
  w: number,
  h: number,
  raio: number,
  posicao: "topo" | "centro" | "base" = "centro",
): Promise<Buffer> {
  const pos = posicao === "topo" ? "top" : posicao === "base" ? "bottom" : "attention";
  const base = await sharp(foto).resize(w, h, { fit: "cover", position: pos }).png().toBuffer();
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
    // Logo e ilustração também valem aqui (slides de carrossel). Antes só o
    // caminho hero/foto desenhava logo, então a marca sumia dos slides
    // internos e a ilustração era calculada e descartada.
    return renderConteudo({
      W, H, scheme, conteudo, handle,
      logoComposite: await prepararLogo(input, brand, W, H),
      ilustracao: input.ilustracao,
    });
  }
  if (layout === "citacao") {
    return renderCitacao({ W, H, scheme, conteudo, handle });
  }
  if (layout === "lista") {
    return renderLista({ W, H, scheme, conteudo, handle });
  }
  if (layout === "editorial") {
    return renderEditorial({
      W, H, scheme, conteudo, handle,
      ilustracao: input.ilustracao,
      corMarca: brand.corPrimariaHex || "#2F5D50",
    });
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
      const foto = await fotoArredondada(fotoBuffer, fotoW, fotoH, Math.round(W * 0.024), input.fotoPosicao);
      fotoStrip = { buf: foto, w: fotoW, h: fotoH };
    } catch {
      // foto falhou — card segue tipográfico puro
    }
  }

  // Logo no topo-centro (estilo @patibianco). Empurra o conteúdo pra baixo.
  // Usa o buffer enviado ou baixa da logoUrl da marca (onboarding).
  const logoComposite = await prepararLogo(input, brand, W, H);

  // Ilustração temática também no card único (hero/foto). Antes só o layout
  // "editorial" a desenhava, então a arte padrão saía sem ícone nenhum —
  // sugerirIlustracao() rodava e o resultado ia pro lixo. Entra no topo do
  // grupo, que é medido e centralizado logo abaixo.
  if (input.ilustracao && !fotoStrip) {
    const tamIl = Math.round(W * 0.13);
    const il = svgIlustracao(input.ilustracao, tamIl, scheme.kicker, 0.9);
    if (il) {
      const bufIl = await sharp(il).png().toBuffer();
      itens.push({
        // Bloco no formato que `posicionar()` entende (pedacos com svg/left/top),
        // pra a ilustração ser medida e centralizada junto com os textos.
        bloco: {
          largura: tamIl,
          altura: tamIl,
          pedacos: [{ svg: bufIl, left: 0, top: 0 }],
        },
        gapAntes: 0,
      });
    }
  }

  if (eyebrow) {
    const pill = blocoPill(eyebrow, scheme.pill, W);
    if (pill) itens.push({ bloco: pill, gapAntes: itens.length ? Math.round(gapUnit * 0.8) : 0 });
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

/**
 * Prepara a logo pra composição: usa o upload da nutri ou, na falta dele, a
 * logo do onboarding (brand.logoUrl). Extraído do caminho hero pra poder ser
 * reusado nos slides de carrossel — a marca precisa aparecer em todos.
 */
async function prepararLogo(
  input: CardInput,
  brand: CardInput["brand"],
  W: number,
  H: number,
): Promise<{ buf: Buffer; w: number; h: number } | null> {
  let logoBruta: Buffer | undefined = input.logoBuffer;
  if (!logoBruta && brand.logoUrl) {
    try {
      const res = await fetch(brand.logoUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) logoBruta = Buffer.from(await res.arrayBuffer());
    } catch {
      // logo remota indisponível — segue sem
    }
  }
  if (!logoBruta) return null;
  try {
    const maxLogoH = Math.round(H * 0.055);
    const maxLogoW = Math.round(W * 0.34);
    const logoPng = await sharp(logoBruta)
      .resize(maxLogoW, maxLogoH, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const meta = await sharp(logoPng).metadata();
    return { buf: logoPng, w: meta.width ?? maxLogoW, h: meta.height ?? maxLogoH };
  } catch {
    return null; // logo inválida — segue sem
  }
}

async function renderConteudo(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  logoComposite?: { buf: Buffer; w: number; h: number } | null;
  ilustracao?: IlustracaoId;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle, logoComposite, ilustracao } = params;
  const contentW = Math.round(W * 0.82);
  const composites: sharp.OverlayOptions[] = [];

  const headline = (conteudo.headline ?? "").trim();
  const corpo = (conteudo.corpo ?? conteudo.subtitle ?? "").trim();

  // ── Passo 1: MEDIR tudo antes de desenhar ─────────────────────────────
  // Antes o texto começava num y fixo (H*0.1) e só empilhava pra baixo: os
  // slides do carrossel ficavam colados no topo enquanto a capa (layout hero)
  // vinha centralizada, e o conjunto parecia desalinhado. Agora medimos o
  // grupo inteiro e centralizamos, igual o hero faz.
  type Peca = { desenhar: (topo: number) => void; altura: number; gapAntes: number };
  const pecas: Peca[] = [];

  // Ilustração temática (line-art) como cabeçalho do slide — some quando não
  // há tema reconhecido. Fica ACIMA do título pra nunca colidir com o texto.
  if (ilustracao) {
    const tam = Math.round(W * 0.13);
    const il = svgIlustracao(ilustracao, tam, scheme.kicker, 0.9);
    if (il) {
      const buf = await sharp(il).png().toBuffer();
      pecas.push({
        altura: tam,
        gapAntes: 0,
        desenhar: (topo) =>
          composites.push({ input: buf, top: topo, left: Math.round((W - tam) / 2) }),
      });
    }
  }

  if (headline) {
    const titulo = blocoTitulo(headline, scheme.titulo, contentW, H * 0.24, Math.round(W * 0.062));
    pecas.push({
      altura: titulo.altura,
      gapAntes: pecas.length ? Math.round(H * 0.022) : 0,
      desenhar: (topo) =>
        composites.push(...posicionar(titulo, Math.round((W - titulo.largura) / 2), topo)),
    });

    const linhaW = Math.round(W * 0.1);
    const linha = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${linhaW}" height="3"><rect width="${linhaW}" height="3" rx="1.5" fill="${scheme.kicker}"/></svg>`,
    );
    pecas.push({
      altura: 3,
      gapAntes: Math.round(H * 0.015) + 8,
      desenhar: (topo) =>
        composites.push({ input: linha, top: topo, left: Math.round((W - linhaW) / 2) }),
    });
  }

  if (corpo) {
    const paragrafos = corpo
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);
    const fontSize = Math.round(W * 0.034);
    let primeiro = true;
    for (const p of paragrafos) {
      const bloco = blocoDeTexto(p, "sans", scheme.sub, fontSize, contentW, {
        lineHeight: 1.52,
        align: "left",
        peso: 0.4,
      });
      pecas.push({
        altura: bloco.altura,
        gapAntes: primeiro ? Math.round(H * 0.035) : Math.round(fontSize * 1.1),
        desenhar: (topo) =>
          composites.push(...posicionar(bloco, Math.round((W - contentW) / 2), topo)),
      });
      primeiro = false;
    }
  }

  // ── Passo 2: descartar o que não cabe (de trás pra frente) ────────────
  const areaTopo =
    Math.round(H * 0.08) + (logoComposite ? logoComposite.h + Math.round(H * 0.02) : 0);
  const areaBase = H - Math.round(H * 0.13); // acima do @handle do rodapé
  const alturaDisponivel = areaBase - areaTopo;
  const somar = (lista: Peca[]) =>
    lista.reduce((acc, x) => acc + x.gapAntes + x.altura, 0);
  while (pecas.length > 1 && somar(pecas) > alturaDisponivel) pecas.pop();

  // ── Passo 3: centralizar o grupo e desenhar ───────────────────────────
  const alturaGrupo = somar(pecas);
  const centrado = Math.round(areaTopo + (alturaDisponivel - alturaGrupo) * 0.46);
  let y = Math.max(areaTopo, Math.min(centrado, areaBase - alturaGrupo));

  if (logoComposite) {
    composites.push({
      input: logoComposite.buf,
      top: Math.round(H * 0.045),
      left: Math.round((W - logoComposite.w) / 2),
    });
  }

  for (const peca of pecas) {
    y += peca.gapAntes;
    peca.desenhar(y);
    y += peca.altura;
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

// ————— Layout citação —————

async function renderCitacao(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle } = params;
  const contentW = Math.round(W * 0.78);
  const composites: sharp.OverlayOptions[] = [];

  const frase = (conteudo.headline ?? "").trim();
  const autor = (conteudo.subtitle ?? "").trim();

  // Aspas decorativas gigantes (serif) no topo do bloco
  const aspas = blocoDeTexto("“", "serif", scheme.kicker, Math.round(W * 0.2), Math.round(W * 0.3), {
    lineHeight: 0.8,
  });

  const citacao = blocoTitulo(frase, scheme.titulo, contentW, H * 0.44, Math.round(W * 0.078));

  const autorBloco = autor
    ? blocoDeTexto(autor.toUpperCase(), "sans", scheme.sub, Math.round(W * 0.024), contentW, {
        letterSpacing: Math.round(W * 0.024 * 0.22),
        peso: 0.6,
      })
    : null;

  const gap1 = Math.round(H * 0.005);
  const gap2 = Math.round(H * 0.045);
  const linhaAltura = Math.max(2, Math.round(W * 0.004));
  const linhaW = Math.round(W * 0.1);

  const alturaGrupo =
    aspas.altura + gap1 + citacao.altura + gap2 + linhaAltura +
    (autorBloco ? gap2 + autorBloco.altura : 0);
  let y = Math.max(Math.round(H * 0.08), Math.round((H - alturaGrupo) * 0.44));

  composites.push(...posicionar(aspas, Math.round((W - aspas.largura) / 2), y));
  y += aspas.altura + gap1;
  composites.push(...posicionar(citacao, Math.round((W - citacao.largura) / 2), y));
  y += citacao.altura + gap2;
  const linha = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${linhaW}" height="${linhaAltura}"><rect width="${linhaW}" height="${linhaAltura}" rx="${linhaAltura / 2}" fill="${scheme.kicker}"/></svg>`,
  );
  composites.push({ input: linha, top: y, left: Math.round((W - linhaW) / 2) });
  y += linhaAltura + gap2;
  if (autorBloco) {
    composites.push(...posicionar(autorBloco, Math.round((W - autorBloco.largura) / 2), y));
  }

  if (handle) {
    const fsH = Math.round(W * 0.02);
    const hBloco = blocoDeTexto(handle, "sans", scheme.handle, fsH, contentW, {
      letterSpacing: Math.round(fsH * 0.18),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(hBloco, Math.round((W - hBloco.largura) / 2), H - Math.round(H * 0.055) - hBloco.altura),
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

// ————— Layout lista —————

async function renderLista(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle } = params;
  const contentW = Math.round(W * 0.8);
  const composites: sharp.OverlayOptions[] = [];

  const titulo = (conteudo.headline ?? "").trim();
  const eyebrow = (conteudo.eyebrow ?? "").trim();
  // Itens vêm do corpo, um por linha
  const itens = (conteudo.corpo ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 7);

  let y = Math.round(H * 0.09);

  if (eyebrow) {
    const pill = blocoPill(eyebrow, scheme.pill, W);
    if (pill) {
      composites.push(...posicionar(pill, Math.round((W - pill.largura) / 2), y));
      y += pill.altura + Math.round(H * 0.035);
    }
  }

  if (titulo) {
    const t = blocoTitulo(titulo, scheme.titulo, contentW, H * 0.22, Math.round(W * 0.07));
    composites.push(...posicionar(t, Math.round((W - t.largura) / 2), y));
    y += t.altura + Math.round(H * 0.05);
  }

  const fsItem = Math.round(W * 0.036);
  const bolinha = Math.round(W * 0.012);
  const gapItem = Math.round(fsItem * 1.15);
  const xTexto = Math.round((W - contentW) / 2) + bolinha * 3;
  const larguraTexto = contentW - bolinha * 3;
  const maxY = H - Math.round(H * 0.13);

  for (const item of itens) {
    const b = blocoDeTexto(item, "sans", scheme.sub, fsItem, larguraTexto, {
      lineHeight: 1.4,
      align: "left",
      peso: 0.5,
    });
    if (y + b.altura > maxY) break;
    const dot = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bolinha * 2}" height="${bolinha * 2}"><circle cx="${bolinha}" cy="${bolinha}" r="${bolinha}" fill="${scheme.kicker}"/></svg>`,
    );
    composites.push({
      input: dot,
      top: y + Math.round(fsItem * 0.45),
      left: Math.round((W - contentW) / 2),
    });
    composites.push(...posicionar(b, xTexto, y));
    y += b.altura + gapItem;
  }

  if (handle) {
    const fsH = Math.round(W * 0.02);
    const hBloco = blocoDeTexto(handle, "sans", scheme.handle, fsH, contentW, {
      letterSpacing: Math.round(fsH * 0.18),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(hBloco, Math.round((W - hBloco.largura) / 2), H - Math.round(H * 0.05) - hBloco.altura),
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

// ————— Layout editorial (headline em dois tons + ramos + ilustração) —————

const DOURADO = "#A9803F";

async function renderEditorial(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  ilustracao?: IlustracaoId;
  corMarca: string;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle, ilustracao, corMarca } = params;
  // Editorial vive melhor no fundo claro: força creme se o esquema for escuro
  const bgClaro = luminancia(scheme.bg) >= 0.55 ? scheme.bg : CREME;
  // Título e ilustrações SEMPRE na cor da marca da nutri (escurecida p/ contraste)
  const prim = /^#[0-9a-fA-F]{6}$/.test(corMarca) ? corMarca : "#2F5D50";
  const verde = luminancia(prim) < 0.5 ? prim : shade(prim, 0.45);
  const dourado = DOURADO;

  const composites: sharp.OverlayOptions[] = [];

  // Ramos decorativos nos cantos (traço fino, discretos)
  const ramoTam = Math.round(W * 0.26);
  const ramoTR = svgIlustracao("folhas", ramoTam, verde, 0.5);
  if (ramoTR) {
    composites.push({
      input: await sharp(ramoTR).rotate(180, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
      top: -Math.round(ramoTam * 0.22),
      left: W - ramoTam + Math.round(ramoTam * 0.18),
    });
  }
  const ramoBL = svgIlustracao("ramo", ramoTam, verde, 0.5);
  if (ramoBL) {
    composites.push({
      input: await sharp(ramoBL).png().toBuffer(),
      top: H - ramoTam + Math.round(ramoTam * 0.15),
      left: -Math.round(ramoTam * 0.18),
    });
  }

  const headline = (conteudo.headline ?? "").trim().toUpperCase();
  const subtitle = (conteudo.subtitle ?? "").trim();
  const temIlustracao = !!ilustracao;

  const margem = Math.round(W * 0.09);
  const larguraTexto = temIlustracao ? Math.round(W * 0.52) : Math.round(W * 0.72);
  let fs = Math.round(W * 0.072);

  // Quebra manual em linhas para alternar as cores (verde/dourado)
  const quebrar = (tam: number): string[] => {
    const palavras = headline.split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = "";
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (atual && medirTexto(teste, "serif", tam) > larguraTexto) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  let linhas = quebrar(fs);
  while (linhas.length * fs * 1.22 > H * 0.5 && fs > 30) {
    fs = Math.floor(fs * 0.92);
    linhas = quebrar(fs);
  }

  // Bloco de texto: começa no terço superior, alinhado à esquerda
  let y = Math.round(H * (temIlustracao ? 0.16 : 0.18));
  const lineGap = Math.round(fs * 1.22);
  linhas.forEach((linha, i) => {
    const dourada = i % 3 === 2; // a cada 3 linhas, uma dourada (ritmo das referências)
    const bloco = blocoDeTexto(linha, "serif", dourada ? dourado : verde, fs, larguraTexto + 40, {
      align: "left",
      lineHeight: 1.05,
    });
    composites.push(...posicionar(bloco, margem, y));
    y += lineGap;
  });

  // Separador: linha fina + losango
  y += Math.round(fs * 0.5);
  const sepW = Math.round(W * 0.2);
  const sep = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sepW + 20}" height="14"><line x1="0" y1="7" x2="${sepW}" y2="7" stroke="${dourado}" stroke-width="1.6"/><rect x="${sepW + 4}" y="3" width="8" height="8" transform="rotate(45 ${sepW + 8} 7)" fill="${dourado}"/></svg>`,
  );
  composites.push({ input: sep, top: y, left: margem });
  y += Math.round(fs * 0.9);

  // Subtítulo
  if (subtitle) {
    const sub = blocoDeTexto(subtitle, "sans", TEXTO_ESCURO, Math.round(W * 0.032), larguraTexto, {
      align: "left",
      lineHeight: 1.5,
      peso: 0.5,
    });
    composites.push(...posicionar(sub, margem, y));
  }

  // Ilustração à direita (grande, na cor verde)
  if (ilustracao) {
    const tam = Math.round(W * 0.42);
    const il = svgIlustracao(ilustracao, tam, verde);
    if (il) {
      composites.push({
        input: await sharp(il).png().toBuffer(),
        top: Math.round(H * 0.42),
        left: W - tam - Math.round(W * 0.06),
      });
    }
  }

  // Handle dourado na base, centralizado
  if (handle) {
    const fsH = Math.round(W * 0.021);
    const hBloco = blocoDeTexto(handle.toUpperCase(), "sans", dourado, fsH, W, {
      letterSpacing: Math.round(fsH * 0.22),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(hBloco, Math.round((W - hBloco.largura) / 2), H - Math.round(H * 0.05) - hBloco.altura),
    );
  }

  const [bgR, bgG, bgB] = hexToRgb(bgClaro);
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: bgR, g: bgG, b: bgB } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

// ————— Layout receita (foto dominante + título + condição) —————

export async function renderReceita(params: {
  dimensoes: Dimensoes;
  brand: BrandGuidelines;
  /** Foto REAL da receita (da biblioteca da marca) */
  fotoBuffer: Buffer;
  /** Título da receita, ex.: "Torta de cacau com abacate" */
  titulo: string;
  /** Condição/tema, ex.: "para quem tem Hashimoto" */
  condicao?: string;
  eyebrow?: string; // ex.: "receita terapêutica"
}): Promise<Buffer> {
  const { dimensoes, brand, fotoBuffer, titulo, condicao, eyebrow } = params;
  const [W, H] = dimensoes.split("x").map(Number) as [number, number];

  const prim = /^#[0-9a-fA-F]{6}$/.test(brand.corPrimariaHex) ? brand.corPrimariaHex : "#2F5D50";
  const corTitulo = luminancia(prim) < 0.5 ? prim : shade(prim, 0.45);
  const handle = derivarHandle(brand);

  // Foto ocupa o topo (~58%), painel creme embaixo
  const fotoH = Math.round(H * 0.58);
  const foto = await sharp(fotoBuffer)
    .resize(W, fotoH, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [{ input: foto, top: 0, left: 0 }];

  // Sombra suave na emenda foto/painel
  const sombra = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="40"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0.18"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="40" fill="url(#s)"/></svg>`,
  );
  composites.push({ input: sombra, top: fotoH, left: 0 });

  const contentW = Math.round(W * 0.84);
  let y = fotoH + Math.round(H * 0.045);

  // Pill de categoria
  const pill = blocoPill(eyebrow || "receita terapêutica", corTitulo, W);
  if (pill) {
    composites.push(...posicionar(pill, Math.round((W - pill.largura) / 2), y));
    y += pill.altura + Math.round(H * 0.02);
  }

  // Título da receita em caps serif
  const tituloBloco = blocoTitulo(
    titulo.toUpperCase(),
    corTitulo,
    contentW,
    H * 0.16,
    Math.round(W * 0.062),
  );
  composites.push(...posicionar(tituloBloco, Math.round((W - tituloBloco.largura) / 2), y));
  y += tituloBloco.altura + Math.round(H * 0.012);

  // Condição em manuscrita dourada
  if (condicao) {
    const cond = blocoDeTexto(condicao, "manuscrita", DOURADO, Math.round(W * 0.055), contentW, {
      lineHeight: 1.15,
    });
    composites.push(...posicionar(cond, Math.round((W - cond.largura) / 2), y));
  }

  // Handle
  if (handle) {
    const fsH = Math.round(W * 0.02);
    const hBloco = blocoDeTexto(handle, "sans", shade(prim, 0.2), fsH, contentW, {
      letterSpacing: Math.round(fsH * 0.18),
      peso: 0.5,
    });
    composites.push(
      ...posicionar(hBloco, Math.round((W - hBloco.largura) / 2), H - Math.round(H * 0.038) - hBloco.altura),
    );
  }

  const [bgR, bgG, bgB] = hexToRgb(CREME);
  return sharp({
    create: { width: W, height: H, channels: 3, background: { r: bgR, g: bgG, b: bgB } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}
