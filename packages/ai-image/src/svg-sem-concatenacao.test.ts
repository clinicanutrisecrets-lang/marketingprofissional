/**
 * Travas da foto inteira nos posts (Aline, 18/10/2026):
 *
 * 1. NENHUM SVG montado com pedaços de template ligados por "+". O minificador
 *    do Next 14 juntava os pedaços e comia o meio da string: o véu da capa com
 *    foto saía `height="1350<stop …`, o sharp recusava ("Couldn't find end of
 *    Start Tag svg"), e o carrossel da consulta e o post fixo das 5 contas
 *    caíram no desenho antigo, com a foto recortada numa janela. Em `tsx` e
 *    em teste o código roda sem minificar, então só a varredura do fonte pega.
 *
 * 2. A geração automática (capa do carrossel e post com foto dela) usa a foto
 *    INTEIRA com a transparência embaixo, nunca a faixa de 34% que cortava
 *    braço, cerca, o braço do sofá e o topo da cabeça.
 *
 *   node --experimental-strip-types --test packages/ai-image/src/svg-sem-concatenacao.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = new URL(".", import.meta.url).pathname;
const fontes = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

/** Pedaço de template que contém marcação SVG e termina em "+" pra emendar no próximo. */
const EMENDA_SVG = /`[^`]*<(?:svg|stop|rect|defs|linearGradient|path|g)\b[^`]*`\s*\+\s*\n\s*`/;

test("nenhum SVG emendado com + entre templates (o minificador corrompe)", () => {
  const achados: string[] = [];
  for (const f of fontes) {
    const src = readFileSync(join(DIR, f), "utf8");
    if (EMENDA_SVG.test(src)) achados.push(f);
  }
  assert.deepEqual(achados, [], `SVG montado com "+" entre templates em: ${achados.join(", ")}`);
});

test("a geração automática pede a foto inteira, não a faixa grande", () => {
  const idx = readFileSync(join(DIR, "index.ts"), "utf8");
  assert.equal((idx.match(/fotoInteira: true/g) ?? []).length, 2, "post com foto dela e capa do carrossel");
  assert.ok(!/fotoTamanho: "grande"/.test(idx), "a faixa grande cortava a foto");
});

test("os véus são SVG fechado, com o gradiente inteiro", () => {
  const ed = readFileSync(join(DIR, "editorial.ts"), "utf8");
  const card = readFileSync(join(DIR, "cardDesigner.ts"), "utf8");
  assert.match(ed, /const veu = Buffer\.from\(svgVeuCapa\(\)\)/);
  assert.match(card, /input: Buffer\.from\(svgVeuFotoInteira\(W, H\)\)/);
});
