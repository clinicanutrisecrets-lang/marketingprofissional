import opentype from "opentype.js";
import { PLAYFAIR_DISPLAY_B64 } from "./fonts/playfair";
import { MONTSERRAT_B64 } from "./fonts/montserrat";
import { CAVEAT_B64 } from "./fonts/caveat";

/**
 * Renderização de texto 100% vetorial.
 *
 * Convertemos cada caractere em path SVG com opentype.js a partir de fontes
 * embutidas em base64 — geometria pura, nenhuma dependência de fonte do
 * sistema (o fontconfig não existe no Vercel/Lambda; Pango/SVG <text>
 * viravam □□□).
 *
 * BLINDAGEM CRÍTICA: o librsvg usado pelo Sharp CORROMPE silenciosamente
 * SVGs com payload grande (glifos somem ou viram borrões a partir de
 * ~25KB). Por isso o texto é composto PALAVRA POR PALAVRA — cada palavra é
 * um SVG minúsculo (<8KB) posicionado com precisão pelas métricas da fonte.
 */

let _playfair: opentype.Font | null = null;
let _montserrat: opentype.Font | null = null;
let _caveat: opentype.Font | null = null;

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function getFont(familia: FamiliaFonte): opentype.Font {
  if (familia === "serif") {
    if (!_playfair) _playfair = opentype.parse(b64ToArrayBuffer(PLAYFAIR_DISPLAY_B64));
    return _playfair;
  }
  if (familia === "manuscrita") {
    if (!_caveat) _caveat = opentype.parse(b64ToArrayBuffer(CAVEAT_B64));
    return _caveat;
  }
  if (!_montserrat) _montserrat = opentype.parse(b64ToArrayBuffer(MONTSERRAT_B64));
  return _montserrat;
}

export type FamiliaFonte = "serif" | "sans" | "manuscrita";

export type ComposeOpts = {
  texto: string;
  familia: FamiliaFonte;
  fontSize: number;
  maxWidth: number;
  cor: string; // hex, ex "#FFFFFF"
  opacidade?: number; // 0..1
  lineHeight?: number; // multiplicador, default 1.25
  letterSpacing?: number; // px extra entre letras
  align?: "left" | "center"; // default left
  peso?: number; // 0 = normal; >0 engrossa via stroke (px)
};

export type PedacoTexto = {
  svg: Buffer;
  /** offset relativo ao canto superior-esquerdo do bloco */
  left: number;
  top: number;
};

export type TextoComposto = {
  pedacos: PedacoTexto[];
  largura: number;
  altura: number;
  linhas: number;
  fontSizeUsado: number;
};

/**
 * Compõe um bloco de texto como uma lista de SVGs pequenos (um por palavra),
 * com quebra de linha automática, alinhamento e auto-redução para palavras
 * que não cabem na largura.
 */
export function comporTexto(opts: ComposeOpts): TextoComposto {
  const {
    texto,
    familia,
    maxWidth,
    cor,
    opacidade = 1,
    lineHeight = 1.25,
    letterSpacing = 0,
    align = "left",
    peso = 0,
  } = opts;

  const font = getFont(familia);

  const medir = (s: string, fs: number): number => {
    const sc = fs / font.unitsPerEm;
    let w = 0;
    for (const g of font.stringToGlyphs(s)) {
      w += (g.advanceWidth ?? 0) * sc + letterSpacing;
    }
    return w;
  };

  // Auto-reduz a fonte se a palavra mais longa não couber
  let fontSize = opts.fontSize;
  const palavrasTodas = texto.split(/\s+/).filter(Boolean);
  let maiorPalavra = 0;
  for (const p of palavrasTodas) maiorPalavra = Math.max(maiorPalavra, medir(p, fontSize));
  if (maiorPalavra > maxWidth) {
    fontSize = Math.max(12, Math.floor(fontSize * (maxWidth / maiorPalavra)));
  }

  const scale = fontSize / font.unitsPerEm;
  const larguraEspaco =
    (font.charToGlyph(" ").advanceWidth ?? font.unitsPerEm * 0.25) * scale + letterSpacing;

  // Quebra em linhas (listas de palavras com larguras medidas)
  type Palavra = { txt: string; w: number };
  const linhas: Palavra[][] = [];
  let atual: Palavra[] = [];
  let larguraAtual = 0;
  for (const p of palavrasTodas) {
    const w = medir(p, fontSize);
    const adicional = atual.length ? larguraEspaco + w : w;
    if (atual.length && larguraAtual + adicional > maxWidth) {
      linhas.push(atual);
      atual = [{ txt: p, w }];
      larguraAtual = w;
    } else {
      atual.push({ txt: p, w });
      larguraAtual += adicional;
    }
  }
  if (atual.length) linhas.push(atual);
  if (linhas.length === 0) linhas.push([]);

  const ascent = font.ascender * scale;
  const descent = Math.abs(font.descender * scale);
  const alturaLinhaBox = Math.ceil(ascent + descent);
  const lineHeightPx = fontSize * lineHeight;
  const alturaTotal = Math.ceil(lineHeightPx * (linhas.length - 1) + ascent + descent);

  const largurasLinhas = linhas.map((l) =>
    l.reduce((acc, p, i) => acc + p.w + (i > 0 ? larguraEspaco : 0), 0),
  );
  const larguraMax = Math.max(1, ...largurasLinhas);
  const larguraBloco = align === "center" ? Math.ceil(maxWidth) : Math.ceil(larguraMax) + 2;

  const fillOpacity = opacidade < 1 ? ` fill-opacity="${opacidade}"` : "";
  const strokeAttr =
    peso > 0
      ? ` stroke="${cor}" stroke-width="${peso}"${opacidade < 1 ? ` stroke-opacity="${opacidade}"` : ""}`
      : "";

  // Um SVG POR PALAVRA — payload pequeno, librsvg nunca corrompe
  const pedacos: PedacoTexto[] = [];
  linhas.forEach((linha, li) => {
    const yTopoLinha = li * lineHeightPx;
    let x = align === "center" ? (larguraBloco - largurasLinhas[li]!) / 2 : 0;
    for (const palavra of linha) {
      const wSvg = Math.ceil(palavra.w) + 4;
      const paths: string[] = [];
      let px = 1; // 1px de folga anti-corte à esquerda
      for (const g of font.stringToGlyphs(palavra.txt)) {
        // Offset INTEIRO por glifo: com x fracionário o librsvg corrompe
        // certas curvas (glifo vira borrão). Desvio ≤0.5px — invisível.
        const gp = g.getPath(Math.round(px), Math.round(ascent), fontSize);
        const d = gp.toPathData(2);
        if (d && d !== "") paths.push(`<path d="${d}"/>`);
        px += (g.advanceWidth ?? 0) * scale + letterSpacing;
      }
      if (paths.length) {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wSvg}" height="${alturaLinhaBox}" viewBox="0 0 ${wSvg} ${alturaLinhaBox}"><g fill="${cor}"${fillOpacity}${strokeAttr}>${paths.join("")}</g></svg>`;
        pedacos.push({ svg: Buffer.from(svg), left: Math.round(x) - 1, top: Math.round(yTopoLinha) });
      }
      x += palavra.w + larguraEspaco;
    }
  });

  return {
    pedacos,
    largura: larguraBloco,
    altura: alturaTotal,
    linhas: linhas.length,
    fontSizeUsado: fontSize,
  };
}

/** Mede a largura de um texto numa fonte/tamanho, sem renderizar. */
export function medirTexto(
  texto: string,
  familia: FamiliaFonte,
  fontSize: number,
  letterSpacing = 0,
): number {
  const font = getFont(familia);
  const sc = fontSize / font.unitsPerEm;
  let w = 0;
  for (const g of font.stringToGlyphs(texto)) {
    w += (g.advanceWidth ?? 0) * sc + letterSpacing;
  }
  return w;
}
