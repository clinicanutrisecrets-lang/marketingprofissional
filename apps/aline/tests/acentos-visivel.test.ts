import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { acentuarVisivel, acentuarFundo } from "../src/lib/texto/acentos-visivel.ts";

const ler = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

test("Studio: o texto que o modelo escreve sai com acento; hashtag e link não", () => {
  assert.equal(acentuarVisivel("Voce nao precisa de mais genetica, precisa de leitura."), "Você não precisa de mais genética, precisa de leitura.");
  const r = acentuarFundo({ legenda: "A saude pede atencao #saude https://x.com/nutricao", hashtags: ["#nutricao"], pilar: "saude_intestinal" });
  assert.equal(r.legenda, "A saúde pede atenção #saude https://x.com/nutricao");
  assert.deepEqual(r.hashtags, ["#nutricao"]);
  assert.equal(r.pilar, "saude_intestinal");
});

test("Studio: geração semanal, arte do post e reel animado passam pela rede", () => {
  assert.match(ler("../src/lib/posts/gerador-semanal.ts"), /acentuarFundo\(semTravessoesFundo\(parsed\.posts/);
  const arte = ler("../src/lib/arte-post/actions.ts");
  assert.match(arte, /validarArte\(acentuarFundo\(/);
  assert.match(arte, /validarPauta\(acentuarFundo\(/);
  assert.match(ler("../src/lib/reel-animado/spec.ts"), /acentuarFundo\(semAbreviacaoFundo\(semTravessoesFundo\(spec\)\)\)/);
});

test("Studio: o espelho da lista de acentos é igual ao do app de Marketing", () => {
  const a = ler("../src/lib/acentos-ptbr.ts").split("`")[1];
  const b = ler("../../franquias/src/lib/acentos-ptbr.ts").split("`")[1];
  assert.equal(a, b);
});
