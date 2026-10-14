import { test } from "node:test";
import assert from "node:assert/strict";
import { semAbreviacao, semAbreviacaoFundo } from "./sem-abreviacao.ts";

test("as frases que saíram na semana da Mariana viram português por extenso", () => {
  assert.equal(semAbreviacao("Seu exame tá normal. Mas o cansaço não passou."), "Seu exame está normal. Mas o cansaço não passou.");
  assert.equal(semAbreviacao("Achei que tava só comendo demais"), "Achei que estava só comendo demais");
  assert.equal(semAbreviacao("Salva pra lembrar e manda pro seu marido"), "Salva para lembrar e manda para o seu marido");
});

test("caixa é preservada", () => {
  assert.equal(semAbreviacao("Tá na hora"), "Está na hora");
  assert.equal(semAbreviacao("PRA VOCÊ"), "PARA VOCÊ");
});

test("palavra que só começa igual não é tocada", () => {
  const t = "Estava pronta: prato, protocolo, pró-ativo, tatuagem, também, tão bom.";
  assert.equal(semAbreviacao(t), t);
});

test("link e hashtag ficam como estão", () => {
  const r = semAbreviacaoFundo({ copy_legenda: "Vem pra cá", checkout_url: "https://x.com/pra", hashtags: ["#pra"] });
  assert.equal(r.copy_legenda, "Vem para cá");
  assert.equal(r.checkout_url, "https://x.com/pra");
  assert.deepEqual(r.hashtags, ["#pra"]);
});

test("ligação: a geração semanal e o reel animado passam pela troca", async () => {
  const { readFileSync } = await import("node:fs");
  const sem = readFileSync(new URL("../geracao/semanal.ts", import.meta.url), "utf8");
  assert.match(sem, /semAbreviacaoFundo\(await gerarPost\(/);
  const reel = readFileSync(new URL("../conteudo/reel-animado.ts", import.meta.url), "utf8");
  assert.match(reel, /semAbreviacaoFundo\(semTravessoesFundo\(spec\)\)/);
});
