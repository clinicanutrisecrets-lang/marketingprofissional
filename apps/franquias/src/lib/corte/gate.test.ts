import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// gate.ts importa "server-only", então o teste lê o fonte.
const src = readFileSync(new URL("./gate.ts", import.meta.url), "utf8");

test("edição automática: Aline, Juliana, Viviane e a demo estão na lista do código", () => {
  for (const e of ["clinicanutrisecrets@gmail.com", "julimendesnutri@gmail.com", "suporte.vivitavares@gmail.com", "demo@scannerdasaude.com"]) {
    assert.ok(src.includes(`"${e}"`), `${e} fora da lista`);
  }
});

test("a variável da Vercel SOMA à lista do código, nunca a substitui", () => {
  assert.match(src, /\[\.\.\.PADRAO, \.\.\.\(bruto \? bruto\.split\(","\) : \[\]\)\]/);
  assert.doesNotMatch(src, /bruto \? bruto\.split\(","\) : PADRAO/);
});
