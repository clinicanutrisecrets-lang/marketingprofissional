import sharp from "sharp";
import type { BrandGuidelines, ConteudoPeca, Dimensoes } from "./types";
import { comporTexto, medirTexto, type PedacoTexto } from "./textVector";
import {
  AVISO_LAYOUT_SEM_FOTO,
  larguraColunaTexto,
  normalizarFotoLugar,
  normalizarFotoTamanho,
  planejarFoto,
  resolverLugar,
  type FotoLugar,
  type FotoTamanho,
  type PlanoFoto,
  type Rect,
} from "./fotoLayout";

/**
 * Motor de cards tipográficos — arte de estúdio, 100% determinística.
 *
 * Em vez de depender de foto gerada por IA como protagonista (aleatória,
 * cara e muitas vezes fora do tema), o card é DESENHADO: fundo em cor da
 * marca, tipografia editorial grande (Playfair Display), apoio em
 * Montserrat e detalhe manuscrito em Caveat. Padrão visual de social media
 * premium (referências da usuária).
 *
 * SEM ILUSTRAÇÃO (Aline, 12/09/2026): os desenhos em traço fino "estavam
 * sempre dando algum problema" e saíram por completo. O que dá identidade é
 * a paleta, a diagramação de título/subtítulo (letras maiores e menores) e o
 * espaço pra FOTO que a própria profissional sobe — em que lugar e tamanho
 * ela escolher (`fotoLayout.ts`).
 *
 * Zero chamadas de IA → zero custo, zero surpresa, zero revisão.
 */

export type CardLayout =
  | "hero"
  | "foto"
  | "conteudo"
  | "citacao"
  | "lista"
  | "editorial"
  | "capa_clara"
  | "capa_escura";

export type CardInput = {
  layout: CardLayout;
  dimensoes: Dimensoes;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  /** Foto opcional da profissional (layouts foto/hero, editorial, citação e lista) */
  fotoBuffer?: Buffer;
  /** Enquadramento vertical (crop) da foto (default "centro") */
  fotoPosicao?: "topo" | "centro" | "base";
  /** Onde a foto entra em relação ao texto (default "topo") */
  fotoLugar?: FotoLugar;
  /** Tamanho da foto (default "media" — a tirinha de sempre) */
  fotoTamanho?: FotoTamanho;
  /** Força um esquema de cor (0..2); default = hash do headline */
  schemeIndex?: number;
  /** Cor de fundo personalizada (hex) — as cores de texto se adaptam
   *  automaticamente por luminância para manter contraste */
  corFundoHex?: string;
  /** Logo (PNG/JPG) composta no topo-centro do card */
  logoBuffer?: Buffer;
};

/**
 * Resultado completo do render. `avisoFoto` existe pra a tela nunca ficar sem
 * saber que a foto encolheu, saiu ou não é aceita naquele layout — descartar
 * foto em silêncio era o defeito dos layouts editorial/citação/lista.
 */
export type CardResultado = {
  buffer: Buffer;
  /** A foto enviada foi de fato desenhada no card. */
  fotoDesenhada: boolean;
  /** Motivo, em linguagem da tela, quando a foto não saiu como pedido. */
  avisoFoto: string | null;
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
  familia: "serif" | "sans" | "sans-black" | "manuscrita",
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



// ————— Foto: preparação comum a todos os layouts —————

/** Foto crua + escolhas da profissional, já normalizadas. */
type FotoPedida = {
  raw: Buffer;
  lugar: FotoLugar;
  tamanho: FotoTamanho;
  posicao: "topo" | "centro" | "base";
};

function fotoPedida(input: CardInput): FotoPedida | null {
  if (!input.fotoBuffer) return null;
  return {
    raw: input.fotoBuffer,
    lugar: normalizarFotoLugar(input.fotoLugar),
    tamanho: normalizarFotoTamanho(input.fotoTamanho),
    posicao: input.fotoPosicao ?? "centro",
  };
}

const AVISO_FOTO_ILEGIVEL = "Não foi possível ler a foto enviada — tente JPG ou PNG.";

/**
 * Desenha a foto no retângulo planejado. Falha de leitura NÃO derruba o card:
 * o texto sai e o aviso viaja pra tela.
 */
async function desenharFoto(
  composites: sharp.OverlayOptions[],
  foto: FotoPedida,
  rect: Rect,
  raio: number,
): Promise<boolean> {
  try {
    const buf = await fotoArredondada(foto.raw, rect.w, rect.h, raio, foto.posicao);
    composites.push({ input: buf, top: rect.y, left: rect.x });
    return true;
  } catch {
    return false;
  }
}

/** Junta os avisos numa frase só (lugar caiu pra topo + foto encolheu, etc.). */
function juntarAvisos(...avisos: Array<string | null | undefined>): string | null {
  const lista = avisos.filter((a): a is string => !!a);
  return lista.length ? lista.join(" ") : null;
}

function fundo(W: number, H: number, bgHex: string, composites: sharp.OverlayOptions[]): Promise<Buffer> {
  const [r, g, b] = hexToRgb(bgHex);
  return sharp({ create: { width: W, height: H, channels: 3, background: { r, g, b } } })
    .composite(composites)
    .png()
    .toBuffer();
}

// ————— Renderizador principal —————

/** Compatibilidade: só o PNG. Quem precisa saber da foto usa `renderCardDetalhado`. */
export async function renderCard(input: CardInput): Promise<Buffer> {
  return (await renderCardDetalhado(input)).buffer;
}

export async function renderCardDetalhado(input: CardInput): Promise<CardResultado> {
  const { layout, dimensoes, brand, conteudo } = input;
  const [W, H] = dimensoes.split("x").map(Number) as [number, number];

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
  const foto = fotoPedida(input);

  if (layout === "conteudo") {
    // Logo também vale aqui (slides de carrossel) — a marca aparece em todos.
    const buffer = await renderConteudo({
      W, H, scheme, conteudo, handle,
      logoComposite: await prepararLogo(input, brand, W, H),
    });
    return { buffer, fotoDesenhada: false, avisoFoto: foto ? AVISO_LAYOUT_SEM_FOTO : null };
  }
  if (layout === "citacao") {
    return renderCitacao({ W, H, scheme, conteudo, handle, foto });
  }
  if (layout === "lista") {
    return renderLista({ W, H, scheme, conteudo, handle, foto });
  }
  if (layout === "capa_clara" || layout === "capa_escura") {
    const buffer = await renderCapa({
      W, H, conteudo, handle,
      escura: layout === "capa_escura",
      corMarca: brand.corPrimariaHex || "#2F5D50",
      logoComposite: await prepararLogo(input, brand, W, H),
    });
    return { buffer, fotoDesenhada: false, avisoFoto: foto ? AVISO_LAYOUT_SEM_FOTO : null };
  }
  if (layout === "editorial") {
    return renderEditorial({
      W, H, scheme, conteudo, handle, foto,
      corMarca: brand.corPrimariaHex || "#2F5D50",
    });
  }

  // hero / foto: a mesma pilha — "hero" com foto vira "foto".
  return renderPilha({
    W, H, scheme, conteudo, handle, foto,
    logoComposite: await prepararLogo(input, brand, W, H),
  });
}

// ————— Layout hero / foto (pilha central) —————

async function renderPilha(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  foto: FotoPedida | null;
  logoComposite: { buf: Buffer; w: number; h: number } | null;
}): Promise<CardResultado> {
  const { W, H, scheme, conteudo, handle, foto, logoComposite } = params;
  const stories = H / W > 1.5;

  const headline = (conteudo.headline ?? "").trim();
  const eyebrow = (conteudo.eyebrow ?? "").trim();
  const subtitle = (conteudo.subtitle ?? "").trim();
  const kicker = (conteudo.cta ?? "").trim();

  const composites: sharp.OverlayOptions[] = [];
  const margem = Math.round(W * 0.08);
  const gapUnit0 = Math.round(H * (stories ? 0.028 : 0.038));

  // Com foto ao lado, o texto vive numa coluna à esquerda; nos outros casos,
  // ocupa 84% da largura como sempre.
  const lugarResolvido = foto ? resolverLugar("foto", foto.lugar) : null;
  const lugar: FotoLugar = lugarResolvido?.lugar ?? "topo";
  const aoLado = !!foto && lugar === "direita";
  const gapFotoTexto = aoLado ? Math.round(W * 0.03) : Math.round(gapUnit0 * 1.75);
  const contentW = aoLado ? larguraColunaTexto(W, margem, gapFotoTexto) : Math.round(W * 0.84);

  // Com foto, tudo encolhe um pouco pra sobrar respiro
  const esc = foto ? 0.86 : 1;
  type Item = { bloco: Bloco; gapAntes: number };
  const itens: Item[] = [];
  const gapUnit = Math.round(gapUnit0 * esc);

  if (eyebrow) {
    const pill = blocoPill(eyebrow, scheme.pill, W);
    if (pill) itens.push({ bloco: pill, gapAntes: 0 });
  }

  if (headline) {
    const budget =
      H *
      (stories
        ? 0.34
        : foto
          ? aoLado
            ? 0.34
            : foto.tamanho === "grande"
              ? 0.2
              : 0.24
          : 0.38);
    const titulo = blocoTitulo(
      headline,
      scheme.titulo,
      contentW,
      budget,
      Math.round(W * (stories ? 0.095 : aoLado ? 0.078 : 0.1) * esc),
    );
    itens.push({ bloco: titulo, gapAntes: itens.length ? Math.round(gapUnit * 1.15) : 0 });
  }

  if (subtitle) {
    const sub = blocoDeTexto(
      subtitle,
      "sans",
      scheme.sub,
      Math.round(W * 0.041 * esc),
      Math.min(contentW, Math.round(W * 0.78)),
      { peso: 1.1, lineHeight: 1.42 },
    );
    itens.push({ bloco: sub, gapAntes: Math.round(gapUnit * 1.1) });
  }

  if (kicker) {
    const k = blocoDeTexto(
      kicker,
      "manuscrita",
      scheme.kicker,
      Math.round(W * 0.07 * esc),
      Math.min(contentW, Math.round(W * 0.8)),
      { lineHeight: 1.15 },
    );
    itens.push({ bloco: k, gapAntes: gapUnit });
  }

  const alturaTexto = itens.reduce((acc, x) => acc + x.gapAntes + x.bloco.altura, 0);
  // Com logo, a área útil começa abaixo dela
  const areaTopo = Math.round(H * 0.07) + (logoComposite ? logoComposite.h + Math.round(H * 0.02) : 0);
  // Base da área útil: acima do handle (que fica fixo no rodapé)
  const areaBase = H - Math.round(H * (stories ? 0.13 : 0.12));

  if (logoComposite) {
    composites.push({
      input: logoComposite.buf,
      top: Math.round(H * 0.045),
      left: Math.round((W - logoComposite.w) / 2),
    });
  }

  let fotoDesenhada = false;
  let avisoFoto: string | null = null;
  let textoRect: Rect;

  if (foto) {
    const plano: PlanoFoto = planejarFoto({
      W, H, lugar, tamanho: foto.tamanho, areaTopo, areaBase,
      margemX: margem, larguraTexto: contentW, alturaTexto, gap: gapFotoTexto,
    });
    textoRect = plano.texto;
    if (plano.foto) {
      fotoDesenhada = await desenharFoto(composites, foto, plano.foto, Math.round(W * 0.024));
      avisoFoto = juntarAvisos(lugarResolvido?.aviso, plano.aviso, fotoDesenhada ? null : AVISO_FOTO_ILEGIVEL);
    } else {
      avisoFoto = juntarAvisos(lugarResolvido?.aviso, plano.aviso);
    }
  } else {
    const centrado = Math.round(areaTopo + (areaBase - areaTopo - alturaTexto) * 0.46);
    // Nunca deixa o grupo invadir o rodapé: se for alto demais, ancora no teto
    const y = Math.max(areaTopo, Math.min(centrado, areaBase - alturaTexto));
    textoRect = { x: Math.round((W - contentW) / 2), y, w: contentW, h: alturaTexto };
  }

  let y = textoRect.y;
  for (const { bloco, gapAntes } of itens) {
    y += gapAntes;
    composites.push(...posicionar(bloco, textoRect.x + Math.round((textoRect.w - bloco.largura) / 2), y));
    y += bloco.altura;
  }

  // Handle na base (fixo)
  if (handle) {
    const fsH = Math.round(W * 0.02);
    const hBloco = blocoDeTexto(handle, "sans", scheme.handle, fsH, Math.round(W * 0.84), {
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

  return { buffer: await fundo(W, H, scheme.bg, composites), fotoDesenhada, avisoFoto };
}

// ————— Logo —————

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

// ————— Slide de conteúdo (carrossel interno) —————

async function renderConteudo(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  logoComposite?: { buf: Buffer; w: number; h: number } | null;
}): Promise<Buffer> {
  const { W, H, scheme, conteudo, handle, logoComposite } = params;
  const contentW = Math.round(W * 0.82);
  const composites: sharp.OverlayOptions[] = [];

  const headline = (conteudo.headline ?? "").trim();
  const corpo = (conteudo.corpo ?? conteudo.subtitle ?? "").trim();

  // ── Passo 1: MEDIR tudo antes de desenhar ─────────────────────────────
  // Antes o texto começava num y fixo (H*0.1) e só empilhava pra baixo: os
  // slides do carrossel ficavam colados no topo enquanto a capa (layout hero)
  // vinha centralizada, e o conjunto parecia desalinhado. Agora medimos o
  // grupo inteiro e centralizamos, igual o hero faz.
  //
  // Sem ícone de cabeçalho (Aline, 12/09/2026): o slide abre direto no
  // título, e a régua fina abaixo dele é o único ornamento.
  type Peca = { desenhar: (topo: number) => void; altura: number; gapAntes: number };
  const pecas: Peca[] = [];

  if (headline) {
    const titulo = blocoTitulo(headline, scheme.titulo, contentW, H * 0.24, Math.round(W * 0.062));
    pecas.push({
      altura: titulo.altura,
      gapAntes: 0,
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

  return fundo(W, H, scheme.bg, composites);
}

// ————— Layout citação —————

async function renderCitacao(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  foto: FotoPedida | null;
}): Promise<CardResultado> {
  const { W, H, scheme, conteudo, handle, foto } = params;
  const contentW = Math.round(W * 0.78);
  const composites: sharp.OverlayOptions[] = [];

  const frase = (conteudo.headline ?? "").trim();
  const autor = (conteudo.subtitle ?? "").trim();

  // Aspas decorativas gigantes (serif) no topo do bloco
  const aspas = blocoDeTexto("“", "serif", scheme.kicker, Math.round(W * 0.2), Math.round(W * 0.3), {
    lineHeight: 0.8,
  });

  // Com foto o orçamento da frase encolhe — a foto precisa de lugar honesto.
  const citacao = blocoTitulo(
    frase,
    scheme.titulo,
    contentW,
    H * (foto ? (foto.tamanho === "grande" ? 0.26 : 0.32) : 0.44),
    Math.round(W * (foto ? 0.068 : 0.078)),
  );

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

  const areaTopo = Math.round(H * 0.08);
  const areaBase = H - Math.round(H * 0.12);

  let fotoDesenhada = false;
  let avisoFoto: string | null = null;
  let y: number;
  if (foto) {
    const { lugar, aviso: avisoLugar } = resolverLugar("citacao", foto.lugar);
    const plano = planejarFoto({
      W, H, lugar, tamanho: foto.tamanho, areaTopo, areaBase,
      margemX: Math.round((W - contentW) / 2), larguraTexto: contentW,
      alturaTexto: alturaGrupo, gap: Math.round(H * 0.04), ancora: 0.44,
    });
    y = plano.texto.y;
    if (plano.foto) {
      fotoDesenhada = await desenharFoto(composites, foto, plano.foto, Math.round(W * 0.024));
      avisoFoto = juntarAvisos(avisoLugar, plano.aviso, fotoDesenhada ? null : AVISO_FOTO_ILEGIVEL);
    } else {
      avisoFoto = juntarAvisos(avisoLugar, plano.aviso);
    }
  } else {
    y = Math.max(areaTopo, Math.round((H - alturaGrupo) * 0.44));
  }

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

  return { buffer: await fundo(W, H, scheme.bg, composites), fotoDesenhada, avisoFoto };
}

// ————— Layout lista —————

async function renderLista(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  foto: FotoPedida | null;
}): Promise<CardResultado> {
  const { W, H, scheme, conteudo, handle, foto } = params;
  const contentW = Math.round(W * 0.8);
  const composites: sharp.OverlayOptions[] = [];

  const titulo = (conteudo.headline ?? "").trim();
  const eyebrow = (conteudo.eyebrow ?? "").trim();
  // Itens vêm do corpo, um por linha
  const itensTexto = (conteudo.corpo ?? "")
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 7);

  // ── Medir tudo primeiro (a foto precisa saber a altura do texto) ────────
  type Peca = { altura: number; gapAntes: number; desenhar: (topo: number) => void };
  const pecas: Peca[] = [];

  if (eyebrow) {
    const pill = blocoPill(eyebrow, scheme.pill, W);
    if (pill) {
      pecas.push({
        altura: pill.altura,
        gapAntes: 0,
        desenhar: (topo) => composites.push(...posicionar(pill, Math.round((W - pill.largura) / 2), topo)),
      });
    }
  }

  if (titulo) {
    const t = blocoTitulo(titulo, scheme.titulo, contentW, H * (foto ? 0.16 : 0.22), Math.round(W * (foto ? 0.062 : 0.07)));
    pecas.push({
      altura: t.altura,
      gapAntes: pecas.length ? Math.round(H * 0.035) : 0,
      desenhar: (topo) => composites.push(...posicionar(t, Math.round((W - t.largura) / 2), topo)),
    });
  }

  const fsItem = Math.round(W * (foto ? 0.032 : 0.036));
  const bolinha = Math.round(W * 0.012);
  const gapItem = Math.round(fsItem * 1.15);
  const xTexto = Math.round((W - contentW) / 2) + bolinha * 3;
  const larguraTexto = contentW - bolinha * 3;

  let primeiroItem = true;
  for (const item of itensTexto) {
    const b = blocoDeTexto(item, "sans", scheme.sub, fsItem, larguraTexto, {
      lineHeight: 1.4,
      align: "left",
      peso: 0.5,
    });
    const dot = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${bolinha * 2}" height="${bolinha * 2}"><circle cx="${bolinha}" cy="${bolinha}" r="${bolinha}" fill="${scheme.kicker}"/></svg>`,
    );
    pecas.push({
      altura: b.altura,
      gapAntes: primeiroItem ? (pecas.length ? Math.round(H * 0.05) : 0) : gapItem,
      desenhar: (topo) => {
        composites.push({ input: dot, top: topo + Math.round(fsItem * 0.45), left: Math.round((W - contentW) / 2) });
        composites.push(...posicionar(b, xTexto, topo));
      },
    });
    primeiroItem = false;
  }

  const areaTopo = Math.round(H * 0.09);
  const areaBase = H - Math.round(H * 0.13);
  const somar = (lista: Peca[]) => lista.reduce((acc, x) => acc + x.gapAntes + x.altura, 0);
  // Item que não cabe sai (de trás pra frente) — como antes, mas medido.
  while (pecas.length > 1 && somar(pecas) > areaBase - areaTopo) pecas.pop();
  const alturaTexto = somar(pecas);

  let fotoDesenhada = false;
  let avisoFoto: string | null = null;
  let y: number;
  if (foto) {
    const { lugar, aviso: avisoLugar } = resolverLugar("lista", foto.lugar);
    const plano = planejarFoto({
      W, H, lugar, tamanho: foto.tamanho, areaTopo, areaBase,
      margemX: Math.round((W - contentW) / 2), larguraTexto: contentW,
      alturaTexto, gap: Math.round(H * 0.04), ancora: 0.3,
    });
    y = plano.texto.y;
    if (plano.foto) {
      fotoDesenhada = await desenharFoto(composites, foto, plano.foto, Math.round(W * 0.024));
      avisoFoto = juntarAvisos(avisoLugar, plano.aviso, fotoDesenhada ? null : AVISO_FOTO_ILEGIVEL);
    } else {
      avisoFoto = juntarAvisos(avisoLugar, plano.aviso);
    }
  } else {
    y = areaTopo;
  }

  for (const peca of pecas) {
    y += peca.gapAntes;
    peca.desenhar(y);
    y += peca.altura;
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

  return { buffer: await fundo(W, H, scheme.bg, composites), fotoDesenhada, avisoFoto };
}

// ————— Capas grotescas (carrossel) —————

const DOURADO = "#A9803F";

/**
 * Capa de carrossel em tipografia GROTESCA PESADA — os dois estilos que a
 * Aline escolheu (16/08), alternativos ao editorial em Playfair.
 *
 *  - `capa_clara`  (padrão): fundo creme, faixa e destaque na cor da marca.
 *    Conversa com os slides internos, que já são creme — o carrossel vira uma
 *    peça só.
 *  - `capa_escura`: fundo na cor da marca, título em caixa alta branco. Mais
 *    peso, lê de mais longe no feed.
 *
 * O título vai em Montserrat 900 de VERDADE (família "sans-black", instância
 * estática) — engrossar por contorno daria um traço sujo neste tamanho. A
 * linha de apoio fica em Playfair, que é o contraponto serifado da marca.
 */
async function renderCapa(params: {
  W: number;
  H: number;
  conteudo: ConteudoPeca;
  handle: string;
  escura: boolean;
  corMarca: string;
  logoComposite: { buf: Buffer; w: number; h: number } | null;
}): Promise<Buffer> {
  const { W, H, conteudo, handle, escura, corMarca, logoComposite } = params;
  const prim = /^#[0-9a-fA-F]{6}$/.test(corMarca) ? corMarca : "#2F5D50";

  const bg = escura ? prim : CREME;
  const tintaBase = escura ? "#FFFFFF" : shade(prim, 0.22);
  const tintaDestaque = escura ? "#FFFFFF" : prim;
  const tintaApoio = escura ? "#FFFFFF" : shade(prim, 0.62);
  const tintaHandle = escura ? "#FFFFFF" : shade(prim, 0.5);

  const composites: sharp.OverlayOptions[] = [];
  if (logoComposite) {
    composites.push({
      input: logoComposite.buf,
      top: Math.round(H * 0.06),
      left: Math.round((W - logoComposite.w) / 2),
    });
  }

  const margem = Math.round(W * 0.085);
  const larguraTexto = Math.round(W * 0.83);
  const headlineBruto = (conteudo.headline ?? "").trim();
  const headline = escura ? headlineBruto.toUpperCase() : headlineBruto;
  const apoio = (conteudo.subtitle ?? "").trim();
  const eyebrow = (conteudo.eyebrow ?? "").trim();

  // Quebra própria: a capa alterna a cor entre a primeira linha e as demais,
  // então cada linha é um bloco separado.
  const quebrar = (tam: number): string[] => {
    const palavras = headline.split(/\s+/).filter(Boolean);
    const linhas: string[] = [];
    let atual = "";
    for (const p of palavras) {
      const teste = atual ? `${atual} ${p}` : p;
      if (atual && medirTexto(teste, "sans-black", tam) > larguraTexto) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  };

  let fs = Math.round(W * 0.108);
  let linhas = quebrar(fs);
  // Cabe em no máximo 4 linhas e em 42% da altura — títulos longos encolhem.
  while ((linhas.length > 4 || linhas.length * fs * 1.0 > H * 0.42) && fs > Math.round(W * 0.05)) {
    fs = Math.floor(fs * 0.93);
    linhas = quebrar(fs);
  }

  // Monta os blocos ANTES de posicionar: a altura real de cada linha vem do
  // compositor (acentos e descendentes mudam tudo). Estimar por `fs` deixava o
  // conjunto fora do centro, com sobra visível embaixo.
  // A cor de destaque vai na ÚLTIMA linha — a ênfase cai no fim da frase, e
  // isso continua funcionando com 2 ou com 4 linhas.
  const blocosTitulo = linhas.map((linha, i) =>
    blocoDeTexto(linha, "sans-black", i === linhas.length - 1 ? tintaDestaque : tintaBase, fs, larguraTexto + 40, {
      align: "left",
      lineHeight: 1.0,
      letterSpacing: -Math.round(fs * 0.022),
    }),
  );
  const avancoLinha = Math.round(fs * 1.02);
  const alturaTitulo =
    avancoLinha * (blocosTitulo.length - 1) + (blocosTitulo[blocosTitulo.length - 1]?.altura ?? fs);
  const fsApoio = Math.round(fs * 0.62);
  const blocoApoio = apoio
    ? blocoDeTexto(apoio, "serif", tintaApoio, fsApoio, larguraTexto, { align: "left", lineHeight: 1.18 })
    : null;
  const fsEyebrow = Math.round(W * 0.026);
  const blocoEyebrow =
    escura && eyebrow
      ? blocoDeTexto(eyebrow.toUpperCase(), "sans", tintaApoio, fsEyebrow, larguraTexto, {
          letterSpacing: Math.round(fsEyebrow * 0.34),
          opacidade: 0.78,
        })
      : null;

  const faixaAlt = escura ? 0 : Math.round(H * 0.008);
  const faixaLarg = Math.round(W * 0.13);
  const gapFaixa = escura ? 0 : Math.round(H * 0.032);
  const gapEyebrow = blocoEyebrow ? blocoEyebrow.altura + Math.round(H * 0.026) : 0;
  // Respiro maior antes do apoio: com 0.026 a serifada encostava no
  // descendente do título ("gestação" + "o que muda no corpo").
  const respiroApoio = Math.round(H * 0.045);
  const gapApoio = blocoApoio ? respiroApoio + blocoApoio.altura : 0;

  const alturaTotal = faixaAlt + gapFaixa + gapEyebrow + alturaTitulo + gapApoio;
  let y = Math.round((H - alturaTotal) / 2);

  if (!escura) {
    composites.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${faixaLarg}" height="${faixaAlt}"><rect width="${faixaLarg}" height="${faixaAlt}" fill="${prim}"/></svg>`,
      ),
      left: margem,
      top: y,
    });
    y += faixaAlt + gapFaixa;
  }

  if (blocoEyebrow) {
    composites.push(...posicionar(blocoEyebrow, margem, y));
    y += gapEyebrow;
  }

  blocosTitulo.forEach((bloco, i) => {
    composites.push(...posicionar(bloco, margem, y));
    if (i < blocosTitulo.length - 1) y += avancoLinha;
    else y += bloco.altura;
  });

  if (blocoApoio) {
    y += respiroApoio;
    composites.push(...posicionar(blocoApoio, margem, y));
  }

  if (handle) {
    const fsH = Math.round(W * 0.021);
    const hBloco = blocoDeTexto(handle.toUpperCase(), "sans", tintaHandle, fsH, W, {
      letterSpacing: Math.round(fsH * 0.22),
      opacidade: 0.62,
    });
    composites.push(
      ...posicionar(hBloco, Math.round((W - hBloco.largura) / 2), H - Math.round(H * 0.05) - hBloco.altura),
    );
  }

  const [r, g, b] = hexToRgb(bg);
  return sharp({ create: { width: W, height: H, channels: 3, background: { r, g, b } } })
    .composite(composites)
    .png()
    .toBuffer();
}

// ————— Layout editorial (headline em dois tons + foto opcional) —————

/**
 * Editorial: título serif em caixa alta alinhado à esquerda, a cada três
 * linhas uma dourada, separador fino com losango e subtítulo. Sem ilustração
 * e sem ramos nos cantos (Aline, 12/09/2026) — o lado direito, onde ficava o
 * desenho, é o lugar natural da FOTO (`fotoLugar: "direita"`); sem foto, o
 * texto ocupa a largura toda.
 */
async function renderEditorial(params: {
  W: number;
  H: number;
  scheme: Scheme;
  conteudo: ConteudoPeca;
  handle: string;
  foto: FotoPedida | null;
  corMarca: string;
}): Promise<CardResultado> {
  const { W, H, scheme, conteudo, handle, foto, corMarca } = params;
  // Editorial vive melhor no fundo claro: força creme se o esquema for escuro
  const bgClaro = luminancia(scheme.bg) >= 0.55 ? scheme.bg : CREME;
  // Título SEMPRE na cor da marca da nutri (escurecida p/ contraste)
  const prim = /^#[0-9a-fA-F]{6}$/.test(corMarca) ? corMarca : "#2F5D50";
  const verde = luminancia(prim) < 0.5 ? prim : shade(prim, 0.45);
  const dourado = DOURADO;

  const composites: sharp.OverlayOptions[] = [];

  const headline = (conteudo.headline ?? "").trim().toUpperCase();
  const subtitle = (conteudo.subtitle ?? "").trim();

  const margem = Math.round(W * 0.09);
  const lugarResolvido = foto ? resolverLugar("editorial", foto.lugar) : null;
  const lugar: FotoLugar = lugarResolvido?.lugar ?? "topo";
  const aoLado = !!foto && lugar === "direita";
  const gapFotoTexto = aoLado ? Math.round(W * 0.04) : Math.round(H * 0.04);
  const larguraTexto = aoLado ? larguraColunaTexto(W, margem, gapFotoTexto) : W - margem * 2;
  let fs = Math.round(W * (aoLado ? 0.062 : 0.072));

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

  // Palavra que não quebra ("AMAMENTAÇÃO") estoura a coluna e invade a área da
  // foto — o corpo tem que encolher até a MAIOR PALAVRA caber, não só até o
  // número de linhas caber.
  const maiorPalavraCabe = (tam: number) =>
    headline
      .split(/\s+/)
      .filter(Boolean)
      .every((p) => medirTexto(p, "serif", tam) <= larguraTexto);

  // Orçamento de altura do título: com foto em cima/embaixo sobra menos.
  const budgetTitulo = H * (foto && !aoLado ? (foto.tamanho === "grande" ? 0.28 : 0.36) : 0.5);
  let linhas = quebrar(fs);
  while ((linhas.length * fs * 1.22 > budgetTitulo || !maiorPalavraCabe(fs)) && fs > 30) {
    fs = Math.floor(fs * 0.92);
    linhas = quebrar(fs);
  }

  // ── Medir o bloco inteiro antes de posicionar ─────────────────────────
  const lineGap = Math.round(fs * 1.22);
  const blocosLinha = linhas.map((linha, i) => {
    const dourada = i % 3 === 2; // a cada 3 linhas, uma dourada (ritmo das referências)
    return blocoDeTexto(linha, "serif", dourada ? dourado : verde, fs, larguraTexto + 40, {
      align: "left",
      lineHeight: 1.05,
    });
  });
  const alturaTitulo = blocosLinha.length
    ? lineGap * (blocosLinha.length - 1) + (blocosLinha[blocosLinha.length - 1]?.altura ?? fs)
    : 0;
  const gapSep1 = Math.round(fs * 0.5);
  const sepAltura = 14;
  const gapSep2 = Math.round(fs * 0.9);
  const sub = subtitle
    ? blocoDeTexto(subtitle, "sans", TEXTO_ESCURO, Math.round(W * (aoLado ? 0.03 : 0.032)), larguraTexto, {
        align: "left",
        lineHeight: 1.5,
        peso: 0.5,
      })
    : null;
  const alturaTexto = alturaTitulo + gapSep1 + sepAltura + gapSep2 + (sub ? sub.altura : 0);

  const areaTopo = Math.round(H * 0.1);
  const areaBase = H - Math.round(H * 0.12);

  let fotoDesenhada = false;
  let avisoFoto: string | null = null;
  let textoRect: Rect;
  if (foto) {
    const plano = planejarFoto({
      W, H, lugar, tamanho: foto.tamanho, areaTopo, areaBase,
      margemX: margem, larguraTexto, alturaTexto, gap: gapFotoTexto, ancora: 0.4,
    });
    textoRect = plano.texto;
    if (plano.foto) {
      fotoDesenhada = await desenharFoto(composites, foto, plano.foto, Math.round(W * 0.024));
      avisoFoto = juntarAvisos(lugarResolvido?.aviso, plano.aviso, fotoDesenhada ? null : AVISO_FOTO_ILEGIVEL);
    } else {
      avisoFoto = juntarAvisos(lugarResolvido?.aviso, plano.aviso);
    }
  } else {
    // Sem foto: bloco começa no terço superior, alinhado à esquerda (de sempre)
    textoRect = { x: margem, y: Math.round(H * 0.18), w: larguraTexto, h: alturaTexto };
  }

  // Na pilha (topo/base) o texto fica centralizado como bloco, mas as linhas
  // seguem alinhadas à esquerda dentro dele: é a marca do editorial.
  const xTexto = aoLado ? textoRect.x : margem;
  let y = textoRect.y;
  blocosLinha.forEach((bloco) => {
    composites.push(...posicionar(bloco, xTexto, y));
    y += lineGap;
  });
  if (blocosLinha.length) y = y - lineGap + (blocosLinha[blocosLinha.length - 1]?.altura ?? fs);

  // Separador: linha fina + losango (régua de layout, não desenho)
  y += gapSep1;
  const sepW = Math.round(W * 0.2);
  const sep = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sepW + 20}" height="${sepAltura}"><line x1="0" y1="7" x2="${sepW}" y2="7" stroke="${dourado}" stroke-width="1.6"/><rect x="${sepW + 4}" y="3" width="8" height="8" transform="rotate(45 ${sepW + 8} 7)" fill="${dourado}"/></svg>`,
  );
  composites.push({ input: sep, top: y, left: xTexto });
  y += sepAltura + gapSep2;

  if (sub) {
    composites.push(...posicionar(sub, xTexto, y));
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

  return { buffer: await fundo(W, H, bgClaro, composites), fotoDesenhada, avisoFoto };
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
