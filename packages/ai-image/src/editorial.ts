import sharp from "sharp";
import { comporTexto, type FamiliaFonte, type PedacoTexto } from "./textVector";

/**
 * Carrossel EDITORIAL do Studio (Aline, 13/10/2026: "ficou neeem melhor").
 *
 * Copia o carrossel da memória que ela aprovou (pasta do Drive de referência):
 * - capa com a FOTO INTEIRA ocupando o card, escurecida só embaixo pra o texto
 *   branco ler; sem foto, capa clara com um traço da cor da marca;
 * - fundo quase branco, título na Playfair fina, texto na Inter;
 * - a cor da marca só nos detalhes (rótulo do topo, subtítulo, traço, logo).
 *
 * Sem magenta e sem letra preta pesada: foi exatamente o que ela recusou
 * ("está roxo e preto, não são essas minhas cores, está cortando a foto").
 * Medidas tiradas do JPG de referência (1080x1350).
 */

export const W = 1080;
export const H = 1350;
const MARGEM = 80;
const LARGURA = W - MARGEM * 2;

export const CORES_EDITORIAL = {
  fundo: "#F5F9F8",
  titulo: "#15191A",
  corpo: "#5D6567",
  rotulo: "#3E958D",
  pagina: "#5E6869",
  linha: "#D4D8D7",
} as const;

export type SlideEditorial =
  | { tipo: "capa"; titulo: string; kicker?: string; subtitulo?: string }
  | { tipo: "meio"; titulo: string; corpo?: string; rotulo?: string }
  | { tipo: "fecho"; titulo: string; chamada?: string; rotulo?: string };

export type OpcoesEditorial = {
  /** Cor da marca (detalhes). */
  destaqueHex: string;
  /** Foto da capa (a foto da receita). Sem ela a capa sai clara. */
  fotoCapa?: Buffer;
  /** Logo em PNG transparente, na cor da marca (fundo claro). */
  logoClaro?: Buffer;
  /** O mesmo logo em branco (sobre a foto). */
  logoEscuro?: Buffer;
  /** @ da conta, usado quando não há logo. */
  assinatura?: string;
  /** Frase de rodapé do fecho. */
  aviso?: string;
};

type Camada = { input: Buffer; left: number; top: number };

const HEX = /^#[0-9a-fA-F]{6}$/;

function camadasDe(pedacos: PedacoTexto[], left: number, top: number): Camada[] {
  return pedacos.map((p) => ({ input: p.svg, left: Math.round(left + p.left), top: Math.round(top + p.top) }));
}

function texto(
  t: string,
  familia: FamiliaFonte,
  fontSize: number,
  cor: string,
  opts: { lineHeight?: number; letterSpacing?: number; maxWidth?: number; opacidade?: number } = {},
) {
  return comporTexto({
    texto: t,
    familia,
    fontSize,
    cor,
    maxWidth: opts.maxWidth ?? LARGURA,
    lineHeight: opts.lineHeight ?? 1.5,
    letterSpacing: opts.letterSpacing ?? 0,
    opacidade: opts.opacidade ?? 1,
    align: "left",
  });
}

/** Título que diminui até caber na altura. */
function tituloQueCabe(t: string, cor: string, inicial: number, maxAltura: number, minimo = 52) {
  let fs = inicial;
  for (;;) {
    const r = texto(t, "serif", fs, cor, { lineHeight: 1.08 });
    if (r.altura <= maxAltura || fs <= minimo) return r;
    fs = Math.max(minimo, Math.floor(fs * 0.93));
  }
}

/** Rótulo do topo, em caixa alta com espaçamento largo. */
function rotulo(t: string, cor: string, fontSize = 24) {
  return texto(t.toUpperCase(), "inter", fontSize, cor, { letterSpacing: Math.round(fontSize * 0.42), lineHeight: 1.2 });
}

function retangulo(w: number, h: number, cor: string): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${cor}"/></svg>`);
}

function numeroPagina(i: number, total: number) {
  const n = (x: number) => String(x).padStart(2, "0");
  return `${n(i + 1)}/${n(total)}`;
}

async function logoCamada(logo: Buffer | undefined, left: number, top: number, altura: number): Promise<Camada | null> {
  if (!logo) return null;
  const input = await sharp(logo).resize({ height: altura }).png().toBuffer();
  return { input, left, top };
}

function assinaturaCamada(assinatura: string | undefined, cor: string, left: number, top: number): Camada[] {
  if (!assinatura) return [];
  const r = texto(assinatura, "inter", 26, cor, { letterSpacing: 2, lineHeight: 1.2 });
  return camadasDe(r.pedacos, left, top);
}

async function base(fundo: string): Promise<sharp.Sharp> {
  return sharp({ create: { width: W, height: H, channels: 3, background: fundo } });
}

async function capaComFoto(s: Extract<SlideEditorial, { tipo: "capa" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  // Foto INTEIRA no card, cortada só o necessário pra cobrir 4:5 (centro).
  const foto = await sharp(o.fotoCapa!).rotate().resize(W, H, { fit: "cover", position: "centre" }).toBuffer();
  const veu = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset=".42" stop-color="#000" stop-opacity="0"/><stop offset=".76" stop-color="#000" stop-opacity=".72"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity=".84"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`,
  );
  const camadas: Camada[] = [{ input: veu, left: 0, top: 0 }];

  const logo = await logoCamada(o.logoEscuro, MARGEM, 80, 70);
  if (logo) camadas.push(logo);
  else camadas.push(...assinaturaCamada(o.assinatura, "#FFFFFF", MARGEM, 100));
  const pag = texto(numeroPagina(i, total), "inter", 24, "#FFFFFF", { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));

  // Monta de baixo pra cima: ARRASTE, subtítulo, título, kicker.
  const arr = rotulo("Arraste  →", "#FFFFFF");
  let y = H - 76 - arr.altura;
  camadas.push(...camadasDe(arr.pedacos, MARGEM, y));
  y -= 70;
  if (s.subtitulo) {
    const sub = texto(s.subtitulo, "inter", 30, "#FFFFFF", { opacidade: 0.95 });
    y -= sub.altura;
    camadas.push(...camadasDe(sub.pedacos, MARGEM, y));
    y -= 26;
  }
  const tit = tituloQueCabe(s.titulo, "#FFFFFF", 84, 360);
  y -= tit.altura;
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  if (s.kicker) {
    const k = rotulo(s.kicker, "#FFFFFF");
    y -= 56 + k.altura;
    camadas.push(...camadasDe(k.pedacos, MARGEM, y));
  }
  return sharp(foto).composite(camadas).png().toBuffer();
}

async function capaClara(s: Extract<SlideEditorial, { tipo: "capa" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  const c = CORES_EDITORIAL;
  const camadas: Camada[] = [];
  const logo = await logoCamada(o.logoClaro, MARGEM, 80, 70);
  if (logo) camadas.push(logo);
  else camadas.push(...assinaturaCamada(o.assinatura, o.destaqueHex, MARGEM, 100));
  const pag = texto(numeroPagina(i, total), "inter", 24, c.pagina, { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));

  let y = 380;
  camadas.push({ input: retangulo(96, 4, o.destaqueHex), left: MARGEM, top: y });
  y += 52;
  const tit = tituloQueCabe(s.titulo, c.titulo, 104, 520);
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  y += tit.altura + 40;
  const apoio = s.subtitulo || s.kicker;
  if (apoio) {
    const sub = texto(apoio, "serif", 43, o.destaqueHex, { lineHeight: 1.2 });
    camadas.push(...camadasDe(sub.pedacos, MARGEM, y));
  }
  const arr = rotulo("Arraste  →", c.pagina);
  camadas.push(...camadasDe(arr.pedacos, MARGEM, H - 76 - arr.altura));
  return (await base(c.fundo)).composite(camadas).png().toBuffer();
}

async function meio(s: Extract<SlideEditorial, { tipo: "meio" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  const c = CORES_EDITORIAL;
  const camadas: Camada[] = [];
  const rot = rotulo(s.rotulo || `Passo ${String(i + 1).padStart(2, "0")} de ${String(total).padStart(2, "0")}`, c.rotulo);
  camadas.push(...camadasDe(rot.pedacos, MARGEM, 100));
  const pag = texto(numeroPagina(i, total), "inter", 24, c.pagina, { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));

  let y = 228;
  const tit = tituloQueCabe(s.titulo, c.titulo, 84, 300);
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  y += tit.altura + 34;
  camadas.push({ input: retangulo(LARGURA, 2, c.linha), left: MARGEM, top: y });
  y += 44;
  if (s.corpo) {
    // Corpo grande e legível; encolhe se o texto for longo.
    let fs = 36;
    let corpo = texto(s.corpo, "inter", fs, c.corpo, { lineHeight: 1.55 });
    while (corpo.altura > H - y - 200 && fs > 26) {
      fs -= 2;
      corpo = texto(s.corpo, "inter", fs, c.corpo, { lineHeight: 1.55 });
    }
    camadas.push(...camadasDe(corpo.pedacos, MARGEM, y));
  }
  const ass = o.assinatura ? rotulo(o.assinatura.replace(/^@/, ""), c.pagina, 22) : null;
  if (ass) camadas.push(...camadasDe(ass.pedacos, MARGEM, H - 72 - ass.altura));
  return (await base(c.fundo)).composite(camadas).png().toBuffer();
}

async function fecho(s: Extract<SlideEditorial, { tipo: "fecho" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  const c = CORES_EDITORIAL;
  const camadas: Camada[] = [];
  const rot = rotulo(s.rotulo || "Para levar com você", c.rotulo);
  camadas.push(...camadasDe(rot.pedacos, MARGEM, 100));
  const pag = texto(numeroPagina(i, total), "inter", 24, c.pagina, { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));

  let y = 330;
  const tit = tituloQueCabe(s.titulo, c.titulo, 88, 420);
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  y += tit.altura + 44;
  if (s.chamada) {
    camadas.push({ input: retangulo(LARGURA, 2, c.linha), left: MARGEM, top: y });
    y += 34;
    const ch = texto(s.chamada, "inter", 32, c.titulo, { lineHeight: 1.45 });
    camadas.push(...camadasDe(ch.pedacos, MARGEM, y));
  }

  // Rodapé: aviso + logo.
  let yb = H - 80;
  const logo = await logoCamada(o.logoClaro, MARGEM, yb - 70, 70);
  if (logo) {
    camadas.push(logo);
    yb -= 70 + 28;
  } else if (o.assinatura) {
    const a = texto(o.assinatura, "inter", 26, o.destaqueHex, { letterSpacing: 2, lineHeight: 1.2 });
    yb -= a.altura;
    camadas.push(...camadasDe(a.pedacos, MARGEM, yb));
    yb -= 28;
  }
  if (o.aviso) {
    const av = texto(o.aviso, "inter", 21, c.corpo, { lineHeight: 1.4 });
    yb -= av.altura;
    camadas.push(...camadasDe(av.pedacos, MARGEM, yb));
    yb -= 30;
  }
  camadas.push({ input: retangulo(LARGURA, 2, c.linha), left: MARGEM, top: yb });
  return (await base(c.fundo)).composite(camadas).png().toBuffer();
}

/** Desenha um slide. `i`/`total` numeram o canto ("03/07"). */
export async function renderSlideEditorial(s: SlideEditorial, i: number, total: number, opcoes: OpcoesEditorial): Promise<Buffer> {
  const o = { ...opcoes, destaqueHex: HEX.test(opcoes.destaqueHex) ? opcoes.destaqueHex : "#0ABAB5" };
  if (s.tipo === "capa") return o.fotoCapa ? capaComFoto(s, i, total, o) : capaClara(s, i, total, o);
  if (s.tipo === "fecho") return fecho(s, i, total, o);
  return meio(s, i, total, o);
}

/** O carrossel inteiro: primeiro é a capa, último é o fecho. */
export async function renderCarrosselEditorial(slides: SlideEditorial[], opcoes: OpcoesEditorial): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (let i = 0; i < slides.length; i++) out.push(await renderSlideEditorial(slides[i]!, i, slides.length, opcoes));
  return out;
}
