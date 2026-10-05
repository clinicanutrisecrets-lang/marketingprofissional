/**
 * Logo com fundo chapado (Daiane, 01/10/2026) e emoji na arte (Juliana,
 * 05/10/2026).
 *   node --experimental-strip-types --test packages/ai-image/src/logoFundo.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { corDoFundo, removerFundoChapado } from "./logoFundo.ts";

const aqui = dirname(fileURLToPath(import.meta.url));

/** Imagem w×h com fundo `fundo`, um quadrado de `tinta` no meio e um furo branco dentro. */
function logoFalsa(w: number, h: number, fundo: number[], tinta: number[], furo = true): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dentro = x >= w * 0.3 && x < w * 0.7 && y >= h * 0.3 && y < h * 0.7;
      const noFuro = furo && x >= w * 0.45 && x < w * 0.55 && y >= h * 0.45 && y < h * 0.55;
      const c = dentro && !noFuro ? tinta : fundo;
      d[i] = c[0]!; d[i + 1] = c[1]!; d[i + 2] = c[2]!; d[i + 3] = 255;
    }
  return d;
}
const alfa = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

test("fundo branco some, inclusive o miolo da letra; o desenho fica opaco", () => {
  const d = logoFalsa(100, 100, [255, 255, 255], [40, 150, 230]);
  const r = removerFundoChapado(d, 100, 100);
  assert.ok(r);
  assert.equal(alfa(r.pixels, 100, 0, 0), 0);
  assert.equal(alfa(r.pixels, 100, 50, 50), 0, "miolo branco (o furo do 'o') some também");
  assert.equal(alfa(r.pixels, 100, 35, 35), 255);
});

test("fundo escuro: só o que encosta na borda some, a ilha da mesma cor fica", () => {
  const d = logoFalsa(100, 100, [20, 20, 60], [240, 200, 40]);
  // furo da mesma cor do fundo, mas cercado de desenho
  for (let y = 45; y < 55; y++) for (let x = 45; x < 55; x++) {
    const i = (y * 100 + x) * 4; d[i] = 20; d[i + 1] = 20; d[i + 2] = 60;
  }
  const r = removerFundoChapado(d, 100, 100);
  assert.ok(r);
  assert.equal(alfa(r.pixels, 100, 0, 0), 0);
  assert.equal(alfa(r.pixels, 100, 50, 50), 255);
});

test("logo que já tem transparência fica como está", () => {
  const d = logoFalsa(50, 50, [255, 255, 255], [0, 0, 0]);
  d[3] = 0;
  assert.equal(corDoFundo(d, 50, 50), null);
  assert.equal(removerFundoChapado(d, 50, 50), null);
});

test("cantos de cores diferentes (foto, não fundo chapado): não mexe", () => {
  const d = logoFalsa(50, 50, [255, 255, 255], [0, 0, 0]);
  const i = (49 * 50 + 49) * 4; d[i] = 10; d[i + 1] = 100; d[i + 2] = 10;
  assert.equal(removerFundoChapado(d, 50, 50), null);
});

test("imagem toda do fundo: não apaga a logo inteira", () => {
  const d = logoFalsa(40, 40, [255, 255, 255], [255, 255, 255], false);
  assert.equal(removerFundoChapado(d, 40, 40), null);
});

test("a logo da arte passa pela limpeza antes de ser desenhada", () => {
  const src = readFileSync(join(aqui, "cardDesigner.ts"), "utf8");
  const prep = src.slice(src.indexOf("async function prepararLogo"));
  assert.match(prep.slice(0, prep.indexOf("\n}\n")), /logoSemFundo\(logoBruta\)/);
});

test("emoji sai da arte (a fonte não tem o glifo e virava quadradinho)", () => {
  const src = readFileSync(join(aqui, "textVector.ts"), "utf8");
  assert.match(src, /const texto = semEmoji\(opts\.texto\)/);
});
