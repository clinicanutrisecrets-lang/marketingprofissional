/**
 * Letras "quase apagadas" no carrossel (Juliana, 03/11/2026): o Montserrat
 * embutido era o arquivo VARIÁVEL, e o opentype.js só desenha a instância
 * padrão dele, que é a Thin (100). Todo texto de apoio saía em Thin.
 *   node --experimental-strip-types --test packages/ai-image/src/fonte-leitura.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./fonts/montserrat.ts", import.meta.url), "utf8");
const b64 = src.match(/MONTSERRAT_B64 = "([A-Za-z0-9+/=]+)"/)?.[1] ?? "";
const ttf = Buffer.from(b64, "base64");

function tabela(tag: string): number | null {
  const n = ttf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16;
    if (ttf.toString("latin1", r, r + 4) === tag) return ttf.readUInt32BE(r + 8);
  }
  return null;
}

test("Montserrat de leitura é instância estática (sem eixo variável)", () => {
  assert.ok(ttf.length > 10_000, "fonte vazia");
  assert.equal(tabela("fvar"), null, "voltou o arquivo variável: o opentype.js desenha a Thin");
});

test("Montserrat de leitura é Regular (peso 400)", () => {
  const os2 = tabela("OS/2");
  assert.ok(os2 !== null, "sem tabela OS/2");
  assert.equal(ttf.readUInt16BE(os2! + 4), 400);
});
