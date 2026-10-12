/**
 * O material sai no direct mesmo quando a resposta pública falha.
 *
 * Antes de 12/10/2026 a regra respondia em público PRIMEIRO, sem try/catch:
 * comentário que a Meta não deixasse responder em público derrubava o evento,
 * e o direct (que entrega o material) nunca saía. E o "te mandei no direct"
 * ia ao ar mesmo quando o direct era recusado.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
const inicio = fonte.indexOf("async function executarRegra");
const fim = fonte.indexOf("async function executarOpcao");
const corpo = fonte.slice(inicio, fim);

test("o direct é enviado antes da resposta pública", () => {
  const direto = corpo.indexOf("desfechoDireto = await entregar(");
  const publico = corpo.indexOf("responderComentario(");
  assert.ok(direto > 0 && publico > 0);
  assert.ok(direto < publico, "a resposta pública voltou a vir antes do direct");
});

test("resposta pública não sai quando o direct foi recusado", () => {
  assert.match(corpo, /desfechoDireto !== "recusado"/);
});

test("falha na resposta pública não derruba a regra", () => {
  const publico = corpo.indexOf("responderComentario(");
  const tryAntes = corpo.lastIndexOf("try {", publico);
  const blocoDireto = corpo.indexOf("desfechoDireto = await entregar(");
  assert.ok(tryAntes > blocoDireto, "responderComentario saiu de dentro do try");
});
