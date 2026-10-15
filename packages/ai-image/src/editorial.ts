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
  | {
      tipo: "meio";
      titulo: string;
      corpo?: string;
      rotulo?: string;
      /**
       * Foto embaixo do texto (post de venda da consulta, Aline 14/10/2026).
       * Só entra quando o texto deixa espaço: slide com muito texto sai sem
       * foto ("os que têm muito texto não precisam ter foto em todos").
       */
      foto?: Buffer;
      /**
       * Altura (0 a 1) do ponto que não pode sair do corte: o rosto, a mão com
       * o cotonete. Sem ela o corte procura a região de interesse sozinho.
       */
      fotoFocoY?: number;
      /**
       * Linhas com rótulo à esquerda e texto à direita (o slide "o que é a
       * consulta" do post fixo, Aline 15/10/2026). Entram no lugar do corpo.
       */
      linhas?: { rotulo: string; texto: string }[];
      /** Frase curta em caixa alta no pé do slide. */
      rodape?: string;
    }
  | {
      /**
       * FOTO INTEIRA no card, rótulo no topo e título embaixo, sobre o véu
       * escuro (slides 3 a 8 do carrossel da consulta integrativa). Com
       * `itens`, o título sobe e entra uma lista numerada no lugar do apoio.
       */
      tipo: "foto";
      titulo: string;
      foto: Buffer;
      rotulo?: string;
      subtitulo?: string;
      itens?: string[];
      rodape?: string;
    }
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
  /**
   * Logo de uma marca qualquer (colorida, com ou sem fundo). Vai numa PLACA
   * BRANCA na capa com foto, e no fecho quando não há logoClaro. É o caminho
   * do app de Marketing, que não tem a versão branca da logo de cada uma.
   */
  logoPlaca?: Buffer;
  /**
   * Fecho na COR DA MARCA (texto branco), como no exemplo aprovado. Sem ela,
   * o fecho segue claro. Cor clara demais pra letra branca é ignorada.
   */
  fundoFecho?: string;
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

/** Logo numa placa branca arredondada (capa com foto). */
async function logoNaPlaca(logo: Buffer | undefined, left: number, top: number, altura: number): Promise<Camada | null> {
  if (!logo) return null;
  try {
    const png = await sharp(logo).trim({ threshold: 10 }).resize({ height: altura }).png().toBuffer();
    const m = await sharp(png).metadata();
    const w = m.width ?? altura;
    const padX = Math.round(altura * 0.45);
    const padY = Math.round(altura * 0.3);
    const pw = w + padX * 2;
    const ph = altura + padY * 2;
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="${Math.round(ph / 2)}" fill="#FFFFFF" fill-opacity="0.94"/></svg>`,
    );
    const input = await sharp(svg).composite([{ input: png, left: padX, top: padY }]).png().toBuffer();
    return { input, left, top };
  } catch {
    return null;
  }
}

/** Luminância relativa (0..1) de um #RRGGBB. */
function luminanciaHex(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** O fecho pode ir na cor da marca só se a letra branca ler sobre ela. */
export function fundoFechoUsavel(hex: string | undefined): string | null {
  if (!hex || !HEX.test(hex)) return null;
  return luminanciaHex(hex) <= 0.45 ? hex : null;
}

/**
 * Altura da foto no slide do meio. Abaixo do mínimo a foto não entra: foto
 * espremida numa faixa fina corta a pessoa e não mostra nada.
 */
export const FOTO_MEIO_MIN = 380;
export const FOTO_MEIO_MAX = 560;

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
  const foto = await sharp(o.fotoCapa!).rotate().resize(W, H, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
  const veu = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset=".42" stop-color="#000" stop-opacity="0"/><stop offset=".76" stop-color="#000" stop-opacity=".72"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity=".84"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`,
  );
  const camadas: Camada[] = [{ input: veu, left: 0, top: 0 }];

  const logo = (await logoCamada(o.logoEscuro, MARGEM, 80, 70)) ?? (await logoNaPlaca(o.logoPlaca, MARGEM, 72, 52));
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

async function slideFoto(s: Extract<SlideEditorial, { tipo: "foto" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  const comLista = !!s.itens?.length;
  const foto = await sharp(s.foto).rotate().resize(W, H, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
  // Com lista o véu cobre o card quase inteiro: a lista precisa ler do meio pra baixo.
  const paradas = comLista
    ? `<stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity=".7"/>`
    : `<stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity=".72"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity=".84"/>`;
  const veu = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${paradas}</linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`,
  );
  const camadas: Camada[] = [{ input: veu, left: 0, top: 0 }];
  if (s.rotulo) camadas.push(...camadasDe(rotulo(s.rotulo, "#FFFFFF").pedacos, MARGEM, 100));
  const pag = texto(numeroPagina(i, total), "inter", 24, "#FFFFFF", { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));

  if (comLista) {
    let y = 330;
    const tit = tituloQueCabe(s.titulo, "#FFFFFF", 88, 220);
    camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
    y += tit.altura + 24;
    const numLarg = 110;
    for (const [k, item] of s.itens!.entries()) {
      camadas.push({ input: retangulo(LARGURA, 1, "#FFFFFF"), left: MARGEM, top: y });
      y += 26;
      // Branco: a cor da marca some sobre o véu escuro quando ela é escura.
      const num = texto(String(k + 1).padStart(2, "0"), "serif", 40, "#FFFFFF", { lineHeight: 1.2, opacidade: 0.75 });
      const t = texto(item, "inter", 38, "#FFFFFF", { lineHeight: 1.3, maxWidth: LARGURA - numLarg });
      camadas.push(...camadasDe(num.pedacos, MARGEM, y));
      camadas.push(...camadasDe(t.pedacos, MARGEM + numLarg, y));
      y += Math.max(num.altura, t.altura) + 26;
    }
    if (s.rodape) {
      const r = rotulo(s.rodape, "#FFFFFF", 22);
      camadas.push(...camadasDe(r.pedacos, MARGEM, H - 76 - r.altura));
    }
    return sharp(foto).composite(camadas).png().toBuffer();
  }

  let y = H - 76;
  if (s.subtitulo) {
    const sub = texto(s.subtitulo, "inter", 32, "#FFFFFF", { opacidade: 0.95 });
    y -= sub.altura;
    camadas.push(...camadasDe(sub.pedacos, MARGEM, y));
    y -= 22;
  }
  const tit = tituloQueCabe(s.titulo, "#FFFFFF", 84, 320);
  y -= tit.altura;
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  return sharp(foto).composite(camadas).png().toBuffer();
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
  if (s.linhas?.length) {
    // Rótulo em caixa alta à esquerda, texto à direita, traço entre as linhas.
    const colRot = 282;
    for (const [k, l] of s.linhas.entries()) {
      if (k > 0) {
        camadas.push({ input: retangulo(LARGURA, 2, c.linha), left: MARGEM, top: y });
        y += 34;
      }
      const r = rotulo(l.rotulo, o.destaqueHex, 22);
      const t = texto(l.texto, "inter", 34, c.titulo, { lineHeight: 1.5, maxWidth: LARGURA - colRot });
      camadas.push(...camadasDe(r.pedacos, MARGEM, y + 12));
      camadas.push(...camadasDe(t.pedacos, MARGEM + colRot, y));
      y += Math.max(r.altura + 12, t.altura) + 34;
    }
  } else if (s.corpo) {
    // Corpo grande e legível; encolhe se o texto for longo.
    let fs = 36;
    let corpo = texto(s.corpo, "inter", fs, c.corpo, { lineHeight: 1.55 });
    while (corpo.altura > H - y - 200 && fs > 26) {
      fs -= 2;
      corpo = texto(s.corpo, "inter", fs, c.corpo, { lineHeight: 1.55 });
    }
    camadas.push(...camadasDe(corpo.pedacos, MARGEM, y));
    y += corpo.altura;
  }
  // Foto embaixo do texto, só se sobrar espaço. O corte procura a região de
  // interesse (rosto, mãos), nunca o centro cego: centro cortava a cabeça das
  // pessoas sentadas (Aline, 14/10/2026).
  if (s.foto) {
    const topo = y + 48;
    const altura = Math.min(FOTO_MEIO_MAX, H - 150 - topo);
    if (altura >= FOTO_MEIO_MIN) {
      const raio = 28;
      const mascara = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${altura}"><rect width="${LARGURA}" height="${altura}" rx="${raio}" ry="${raio}" fill="#fff"/></svg>`,
      );
      try {
        const foco = s.fotoFocoY;
        let recorte: Buffer;
        if (typeof foco === "number" && foco >= 0 && foco <= 1) {
          const larga = await sharp(s.foto).rotate().resize({ width: LARGURA }).toBuffer({ resolveWithObject: true });
          const h = larga.info.height;
          recorte =
            h > altura
              ? await sharp(larga.data)
                  .extract({ left: 0, top: Math.max(0, Math.min(h - altura, Math.round(foco * h - altura / 2))), width: LARGURA, height: altura })
                  .toBuffer()
              : await sharp(larga.data).resize(LARGURA, altura, { fit: "cover", position: "centre" }).toBuffer();
        } else {
          recorte = await sharp(s.foto).rotate().resize(LARGURA, altura, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
        }
        const foto = await sharp(recorte).composite([{ input: mascara, blend: "dest-in" }]).png().toBuffer();
        camadas.push({ input: foto, left: MARGEM, top: topo });
      } catch {
        // foto ilegível: o slide segue só com o texto
      }
    }
  }
  const pe = s.rodape || (o.assinatura ? o.assinatura.replace(/^@/, "") : "");
  const ass = pe ? rotulo(pe, c.pagina, 22) : null;
  if (ass) camadas.push(...camadasDe(ass.pedacos, MARGEM, H - 72 - ass.altura));
  return (await base(c.fundo)).composite(camadas).png().toBuffer();
}

async function fecho(s: Extract<SlideEditorial, { tipo: "fecho" }>, i: number, total: number, o: OpcoesEditorial): Promise<Buffer> {
  const corFundo = fundoFechoUsavel(o.fundoFecho);
  if (corFundo) return fechoNaCor(s, i, total, o, corFundo);
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
  const logo = (await logoCamada(o.logoClaro, MARGEM, yb - 70, 70)) ?? (await logoNaPlaca(o.logoPlaca, MARGEM, yb - 76, 52));
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

/** Fecho na cor da marca, letra branca (o slide verde do exemplo aprovado). */
async function fechoNaCor(
  s: Extract<SlideEditorial, { tipo: "fecho" }>,
  i: number,
  total: number,
  o: OpcoesEditorial,
  cor: string,
): Promise<Buffer> {
  const camadas: Camada[] = [];
  const pag = texto(numeroPagina(i, total), "inter", 24, "#FFFFFF", { letterSpacing: 3, lineHeight: 1.2 });
  camadas.push(...camadasDe(pag.pedacos, W - MARGEM - pag.largura, 100));
  const rot = rotulo(s.rotulo || "Para levar com você", "#FFFFFF");
  const tit = tituloQueCabe(s.titulo, "#FFFFFF", 92, 460);
  const ch = s.chamada ? texto(s.chamada, "inter", 34, "#FFFFFF", { lineHeight: 1.5, opacidade: 0.92 }) : null;
  const bloco = rot.altura + 36 + tit.altura + (ch ? 44 + ch.altura : 0);
  let y = Math.max(220, Math.round((H - bloco) / 2) - 40);
  camadas.push(...camadasDe(rot.pedacos, MARGEM, y));
  y += rot.altura + 36;
  camadas.push(...camadasDe(tit.pedacos, MARGEM, y));
  y += tit.altura + 44;
  if (ch) camadas.push(...camadasDe(ch.pedacos, MARGEM, y));
  const logo = await logoNaPlaca(o.logoPlaca, MARGEM, H - 80 - 52 - 32, 52);
  if (logo) camadas.push(logo);
  else camadas.push(...assinaturaCamada(o.assinatura, "#FFFFFF", MARGEM, H - 110));
  return (await base(cor)).composite(camadas).png().toBuffer();
}

/** Desenha um slide. `i`/`total` numeram o canto ("03/07"). */
export async function renderSlideEditorial(s: SlideEditorial, i: number, total: number, opcoes: OpcoesEditorial): Promise<Buffer> {
  const o = { ...opcoes, destaqueHex: HEX.test(opcoes.destaqueHex) ? opcoes.destaqueHex : "#0ABAB5" };
  if (s.tipo === "capa") return o.fotoCapa ? capaComFoto(s, i, total, o) : capaClara(s, i, total, o);
  if (s.tipo === "fecho") return fecho(s, i, total, o);
  if (s.tipo === "foto") return slideFoto(s, i, total, o);
  return meio(s, i, total, o);
}

/** O carrossel inteiro: primeiro é a capa, último é o fecho. */
export async function renderCarrosselEditorial(slides: SlideEditorial[], opcoes: OpcoesEditorial): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (let i = 0; i < slides.length; i++) out.push(await renderSlideEditorial(slides[i]!, i, slides.length, opcoes));
  return out;
}
