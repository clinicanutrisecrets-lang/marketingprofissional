import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  conteudoDaArteUnica,
  slidesDoCarrosselSemanal,
  MAX_SLIDES,
} from "./carrossel-semanal.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("arte única: só título e subtítulo, sem selo e sem chamada", () => {
  const c = conteudoDaArteUnica({ headline: "Eu ignoro análise de exame 'normal'", subtitle: "Se tá na margem, já é sinal" });
  assert.deepEqual(c, { headline: "Eu ignoro análise de exame 'normal'", subtitle: "Se tá na margem, já é sinal" });
  assert.equal("eyebrow" in c, false);
  assert.equal("cta" in c, false);
});

test("carrossel: usa os slides que o modelo escreveu, capa e fecho como título", () => {
  const s = slidesDoCarrosselSemanal({
    headline: "ignorado",
    slides: ["Você pode estar ovulando e não engravidar", "A qualidade do óvulo depende de energia.", "Ferritina baixa pesa nisso.", "Salva pra lembrar na próxima consulta"],
  });
  assert.equal(s.length, 4);
  assert.deepEqual(s[0], { headline: "Você pode estar ovulando e não engravidar" });
  // Frase curta sai grande (título); parágrafo longo sai como corpo.
  assert.deepEqual(s[1], { headline: "A qualidade do óvulo depende de energia." });
  assert.deepEqual(s[3], { headline: "Salva pra lembrar na próxima consulta" });
});

test("carrossel: parágrafo longo no meio vira corpo, não título espremido", () => {
  const longo = "x ".repeat(120).trim();
  const s = slidesDoCarrosselSemanal({ slides: ["Capa do post", longo, "Salve pra depois"] });
  assert.deepEqual(s[1], { headline: "", corpo: longo });
});

test("carrossel: slide em objeto também serve, e link sai da arte", () => {
  const s = slidesDoCarrosselSemanal({
    slides: [{ headline: "Capa" }, { texto: "Meio" }, { titulo: "Fim, acesse scannerdasaude.com/x" }],
  });
  assert.equal(s.length, 3);
  assert.ok(!/scannerdasaude/.test(JSON.stringify(s)));
});

test("carrossel: sem slides, a legenda vira os slides e nada de chamada inventada", () => {
  const s = slidesDoCarrosselSemanal({
    headline: "Quando alguém chega tentando engravidar há mais de 1 ano",
    copy_legenda:
      "Quando alguém chega no consultório tentando engravidar há mais de 1 ano, eu sei o que procurar.\n\nPrimeiro: ferritina, vitamina D e homocisteína, sempre juntas.\n\n#Fertilidade #SaudeDaMulher",
  });
  assert.equal(s.length, 3);
  assert.equal(s[0]!.headline, "Quando alguém chega tentando engravidar há mais de 1 ano");
  assert.ok(!JSON.stringify(s).includes("#Fertilidade"));
  assert.ok(!/direct|me chama/i.test(JSON.stringify(s)));
});

test("carrossel: sem material pra 2 slides devolve vazio", () => {
  assert.deepEqual(slidesDoCarrosselSemanal({ headline: "Só título", copy_legenda: "curto" }), []);
  assert.deepEqual(slidesDoCarrosselSemanal({}), []);
});

test("carrossel: no máximo MAX_SLIDES", () => {
  const s = slidesDoCarrosselSemanal({ slides: Array.from({ length: 14 }, (_, i) => `slide ${i}`) });
  assert.equal(s.length, MAX_SLIDES);
});

test("ligação: o gerador semanal não escreve mais selo nem chamada na arte", () => {
  const g = fonte("./semanal.ts");
  assert.ok(!g.includes('eyebrow: "Nutrição de Precisão"'), "o selo fixo voltou");
  assert.ok(!/\bcta:\s*post\.copy_cta/.test(g), "a chamada voltou pra arte");
});

test("ligação: o carrossel sai pelo desenhador e grava todos os slides", () => {
  const g = fonte("./semanal.ts");
  assert.match(g, /gerarCarrosselEUpload\(/);
  assert.match(g, /slidesDoCarrosselSemanal\(/);
  assert.match(g, /urls_slides:/);
});
