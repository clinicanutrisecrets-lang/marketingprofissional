import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// gate.ts importa "server-only", então o teste lê o fonte.
const src = readFileSync(new URL("./gate.ts", import.meta.url), "utf8");

test("edição automática: Aline, Juliana, Viviane e a demo seguem na lista do time", () => {
  for (const e of ["clinicanutrisecrets@gmail.com", "julimendesnutri@gmail.com", "suporte.vivitavares@gmail.com", "demo@scannerdasaude.com"]) {
    assert.ok(src.includes(`"${e}"`), `${e} fora da lista`);
  }
});

test("aberta pra todas: só o freio explícito fecha", () => {
  assert.match(src, /if \(!corteIaFechadoParaTeste\(\)\) return true;/);
  assert.match(src, /\["false", "0", "off", "nao", "não"\]/);
});

test("a biblioteca de clipes continua do time, fora do freio", () => {
  const bib = src.slice(src.indexOf("export function bibliotecaDoTime"));
  assert.match(bib, /return doTime\(email\);/);
  assert.doesNotMatch(bib, /corteIaFechadoParaTeste/);
});
