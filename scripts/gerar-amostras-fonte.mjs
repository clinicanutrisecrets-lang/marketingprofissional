/**
 * Gera as amostras visuais dos três estilos de fonte do editor de arte.
 *
 * 🔴 A AMOSTRA É DESENHADA COM A FONTE DE VERDADE, a mesma que o motor de
 * card usa (Playfair / Montserrat / Montserrat 900, embutidas em base64 no
 * `textVector.ts`). Escrever o exemplo em CSS mentiria: o navegador da nutri
 * não tem Playfair instalada, cairia numa serifada qualquer, e ela escolheria
 * olhando uma letra que não é a que sai no card.
 *
 * Saída: apps/franquias/public/fontes/<estilo>.svg (glifos já vetorizados,
 * nenhuma fonte baixada no navegador).
 *
 * Rodar:  node --experimental-strip-types --import ./scripts/registrar-resolver.mjs \
 *            scripts/gerar-amostras-fonte.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { comporTexto } from "../packages/ai-image/src/textVector.ts";

/** A mesma palavra nos três — comparar exige o mesmo texto. */
const PALAVRA = "Nutrição";
const FONT_SIZE = 64;
const COR = "#2F5D50";

const AMOSTRAS = [
  { estilo: "classica", familia: "serif" },
  { estilo: "impacto", familia: "sans-black" },
  { estilo: "leve", familia: "sans" },
];

const destino = join(import.meta.dirname, "../apps/franquias/public/fontes");
mkdirSync(destino, { recursive: true });

for (const { estilo, familia } of AMOSTRAS) {
  const r = comporTexto({
    texto: PALAVRA,
    familia,
    fontSize: FONT_SIZE,
    maxWidth: 900,
    cor: COR,
    align: "left",
  });
  // Cada pedaço já é um <svg> completo; aninhar com x/y preserva a geometria
  // exata que o card compõe com o Sharp.
  const dentro = r.pedacos
    .map((p) => {
      const corpo = p.svg.toString("utf8").replace(/^<svg /, `<svg x="${p.left}" y="${p.top}" `);
      return corpo;
    })
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r.largura}" height="${r.altura}" ` +
    `viewBox="0 0 ${r.largura} ${r.altura}" role="img" aria-label="${PALAVRA}">${dentro}</svg>`;
  const arquivo = join(destino, `${estilo}.svg`);
  writeFileSync(arquivo, svg);
  console.log(`${estilo.padEnd(9)} ${familia.padEnd(11)} ${r.largura}x${r.altura}  ${svg.length} bytes`);
}
