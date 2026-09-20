/**
 * A trava de família, equipe e amigas — o pior erro que este robô pode
 * cometer é responder a irmã da Aline como se fosse lead.
 *
 * 🔴 A lição que gerou o teste: em 17/09/2026 ela mandou a lista de quem não
 * responder e escreveu quase tudo por NOME, não por @. Resolvendo contra os
 * contatos reais, o @ quase nunca parece com o nome:
 *     Carolina Schneider     → @nina_por_ai
 *     Lais Pereira           → @_laispl
 *     Clínica Vanessa Fialho → @fialhovanessa
 * Exigir o @ de memória deixaria gente de fora da trava, calado.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { lerConfig, normalizarNome, normalizarUsername } from "../src/lib/automacao/config.ts";

test("o @ é normalizado com ou sem arroba, em qualquer caixa", () => {
  for (const u of ["@ClaudiaArgenton", "claudiaargenton", " @claudiaargenton "]) {
    assert.equal(normalizarUsername(u), "claudiaargenton");
  }
});

test("o nome é comparado sem acento, sem caixa e com espaço único", () => {
  assert.equal(normalizarNome("Bianca Quissak Matos"), "bianca quissak matos");
  assert.equal(normalizarNome("  BIANCA   QUISSAK  MATOS "), "bianca quissak matos");
  assert.equal(normalizarNome("Giovana Varela"), "giovana varela");
});

test("pontuação e emoji no nome de exibição não quebram a trava", () => {
  // Nomes reais da base dela vêm assim.
  assert.equal(normalizarNome("Cláudia Argenton | Nutrição Oncológica"), "claudia argenton nutricao oncologica");
  assert.equal(normalizarNome("💫K a t i a V i e i r a💫"), "k a t i a v i e i r a");
});

test("a lista dela entra como ela escreveu: nomes e @ misturados", () => {
  const c = lerConfig({
    nao_responder_usernames: ["@claudiaargenton", "nina_por_ai", "_laispl"],
    nao_responder_nomes: ["Bianca Quissak Matos", "Newton Cabral Fernandes"],
  });
  assert.deepEqual(c.nao_responder_usernames, ["claudiaargenton", "nina_por_ai", "_laispl"]);
  assert.deepEqual(c.nao_responder_nomes, ["bianca quissak matos", "newton cabral fernandes"]);
});

test("lista ausente ou suja não derruba a config", () => {
  assert.deepEqual(lerConfig({}).nao_responder_nomes, []);
  assert.deepEqual(lerConfig({ nao_responder_nomes: "não é lista" }).nao_responder_nomes, []);
  assert.deepEqual(lerConfig({ nao_responder_nomes: [null, 42, "", "  ", "Ok"] }).nao_responder_nomes, ["ok"]);
});

test("🔴 só nome COMPLETO bloqueia: primeiro nome solto calaria meia base", () => {
  const c = lerConfig({ nao_responder_nomes: ["Carolina Schneider"] });
  // A comparação em processar.ts é includes() sobre o nome inteiro normalizado.
  assert.ok(c.nao_responder_nomes.includes(normalizarNome("Carolina Schneider")));
  assert.ok(!c.nao_responder_nomes.includes(normalizarNome("Carolina")));
  assert.ok(!c.nao_responder_nomes.includes(normalizarNome("Carolina Schneider Souza")));
});

test("nome vazio nunca casa: contato sem nome não pode cair na trava por acaso", () => {
  const c = lerConfig({ nao_responder_nomes: ["Giovana Varela"] });
  assert.ok(!c.nao_responder_nomes.includes(normalizarNome("")));
  assert.ok(!c.nao_responder_nomes.includes(normalizarNome("   ")));
});
