import opentype from "opentype.js";
import { PLAYFAIR_DISPLAY_B64 } from "./fonts/playfair";
import { MONTSERRAT_B64 } from "./fonts/montserrat";

/**
 * Renderização de texto 100% vetorial.
 *
 * Em vez de pedir ao Sharp/Pango para desenhar texto (que depende do
 * fontconfig — inexistente no Vercel/Lambda, gerando □□□), convertemos cada
 * caractere em path SVG usando opentype.js a partir de uma fonte embutida em
 * base64. O resultado é geometria pura: o Sharp só rasteriza formas, sem
 * depender de nenhuma fonte do sistema.
 */

let _playfair: opentype.Font | null = null;
let _montserrat: opentype.Font | null = null;

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function getPlayfair(): opentype.Font {
  if (!_playfair) _playfair = opentype.parse(b64ToArrayBuffer(PLAYFAIR_DISPLAY_B64));
  return _playfair;
}

function getMontserrat(): opentype.Font {
  if (!_montserrat) _montserrat = opentype.parse(b64ToArrayBuffer(MONTSERRAT_B64));
  return _montserrat;
}

export type FamiliaFonte = "serif" | "sans";

type RenderOpts = {
  texto: string;
  familia: FamiliaFonte;
  fontSize: number;
  maxWidth: number;
  cor: string; // hex, ex "#FFFFFF"
  opacidade?: number; // 0..1
  lineHeight?: number; // multiplicador, default 1.25
  letterSpacing?: number; // px extra entre letras (para labels em caixa alta)
};

export type TextoVetorial = {
  svg: string;
  largura: number;
  altura: number;
  linhas: number;
};

/**
 * Quebra o texto em linhas que cabem em maxWidth e devolve um SVG com os
 * glifos já convertidos em <path>. O SVG tem exatamente o tamanho do bloco
 * de texto (largura x altura) para facilitar o posicionamento no composite.
 */
export function renderTextoVetorial(opts: RenderOpts): TextoVetorial {
  const {
    texto,
    familia,
    maxWidth,
    cor,
    opacidade = 1,
    lineHeight = 1.25,
    letterSpacing = 0,
  } = opts;

  const font = familia === "serif" ? getPlayfair() : getMontserrat();

  const medir = (s: string, fs: number): number => {
    const sc = fs / font.unitsPerEm;
    let w = 0;
    for (const g of font.stringToGlyphs(s)) {
      w += (g.advanceWidth ?? 0) * sc + letterSpacing;
    }
    return w;
  };

  // Auto-reduz a fonte se a palavra mais longa não couber na largura disponível,
  // evitando que palavras como "biodisponibilidade" sejam cortadas.
  let fontSize = opts.fontSize;
  const palavrasMed = texto.split(/\s+/).filter(Boolean);
  let maiorPalavra = 0;
  for (const p of palavrasMed) maiorPalavra = Math.max(maiorPalavra, medir(p, fontSize));
  if (maiorPalavra > maxWidth) {
    fontSize = Math.max(12, Math.floor(fontSize * (maxWidth / maiorPalavra)));
  }

  // Medição usando as métricas da fonte (unitsPerEm)
  const scale = fontSize / font.unitsPerEm;
  const medirPalavra = (palavra: string): number => medir(palavra, fontSize);
  const larguraEspaco =
    (font.charToGlyph(" ").advanceWidth ?? font.unitsPerEm * 0.25) * scale + letterSpacing;

  // Quebra de linha por palavra
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = "";
  let larguraAtual = 0;
  for (const palavra of palavras) {
    const wPalavra = medirPalavra(palavra);
    const adicional = atual ? larguraEspaco + wPalavra : wPalavra;
    if (atual && larguraAtual + adicional > maxWidth) {
      linhas.push(atual);
      atual = palavra;
      larguraAtual = wPalavra;
    } else {
      atual = atual ? `${atual} ${palavra}` : palavra;
      larguraAtual += adicional;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length === 0) linhas.push("");

  const ascent = font.ascender * scale;
  const descent = Math.abs(font.descender * scale);
  const lineHeightPx = fontSize * lineHeight;
  const alturaTotal = Math.ceil(lineHeightPx * (linhas.length - 1) + ascent + descent);

  // Gera os paths SEMPRE glifo a glifo (um <path> por caractere).
  // IMPORTANTE: o librsvg usado pelo Sharp trunca a renderização de um único
  // <path> muito grande (uma linha inteira vira um path de ~13KB e é cortada
  // por volta de 470px). Emitir um path por glifo contorna esse limite.
  let larguraMax = 0;
  const pathsSvg: string[] = [];
  linhas.forEach((linha, i) => {
    const yBaseline = ascent + i * lineHeightPx;
    let x = 0;
    for (const g of font.stringToGlyphs(linha)) {
      const gp = g.getPath(x, yBaseline, fontSize);
      const d = gp.toPathData(2);
      if (d && d !== "") pathsSvg.push(`<path d="${d}"/>`);
      x += (g.advanceWidth ?? 0) * scale + letterSpacing;
    }
    if (x > larguraMax) larguraMax = x;
  });

  // +2px de folga para não cortar a última coluna de pixels do glifo
  const larguraSvg = Math.ceil(Math.max(1, larguraMax)) + 2;
  const fill = cor;
  const fillOpacity = opacidade < 1 ? ` fill-opacity="${opacidade}"` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraSvg}" height="${alturaTotal}" viewBox="0 0 ${larguraSvg} ${alturaTotal}"><g fill="${fill}"${fillOpacity}>${pathsSvg.join("")}</g></svg>`;

  return { svg, largura: larguraSvg, altura: alturaTotal, linhas: linhas.length };
}
