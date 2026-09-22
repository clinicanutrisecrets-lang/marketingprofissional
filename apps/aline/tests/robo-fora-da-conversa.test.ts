/**
 * O robô não entra numa conversa que a Aline está tendo.
 *
 * 🔴 Incidente de 22/09/2026. A Aline mandou uma mensagem pra Mariana Uchoa.
 * A Mariana respondeu "Meu sonhooooooo" — pra ELA. Oito segundos depois o
 * robô emendou: "Que bom saber que você se identificou! É o teste genético,
 * algum protocolo específico...". A Aline apagou.
 *
 * Não era lead. Era conversa pessoal dela, e o robô falou por cima.
 *
 * O sinal pra evitar isso SEMPRE chegou: o Instagram manda um eco (is_echo)
 * de toda mensagem que sai da conta, inclusive as que ela digita no celular.
 * O código recebia e descartava.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { extrairEventos } from "../src/lib/automacao/regras.ts";

const CONTA = "17841403100161321"; // @nutri_secrets
const PESSOA = "9988776655";

function webhookEco(texto: string, mid = "mid.eco1") {
  return {
    object: "instagram",
    entry: [{
      id: CONTA,
      time: Date.now(),
      messaging: [{
        sender: { id: CONTA },      // no eco o sender é A CONTA
        recipient: { id: PESSOA },  // e o recipient é a pessoa
        message: { mid, text: texto, is_echo: true },
      }],
    }],
  };
}

test("🔴 o eco aponta pra PESSOA, não pra conta", () => {
  // Usar o sender aqui apontaria a conversa pra própria Aline, e o robô
  // nunca saberia com quem ela falou.
  const [ev] = extrairEventos(webhookEco("oi, que saudade!"));
  assert.equal(ev.tipo, "eco");
  assert.equal(ev.igsid, PESSOA);
  assert.notEqual(ev.igsid, CONTA);
});

test("o eco carrega o texto e o id da mensagem", () => {
  const [ev] = extrairEventos(webhookEco("olha isso", "mid.abc"));
  assert.equal(ev.texto, "olha isso");
  assert.equal(ev.externalId, "mid.abc");
});

test("eco sem texto (foto, áudio) ainda identifica a conversa", () => {
  const p = webhookEco("");
  const [ev] = extrairEventos(p);
  assert.equal(ev.tipo, "eco");
  assert.equal(ev.igsid, PESSOA);
});

test("mensagem normal da pessoa continua vindo pelo sender", () => {
  const p = {
    object: "instagram",
    entry: [{
      id: CONTA, time: Date.now(),
      messaging: [{
        sender: { id: PESSOA }, recipient: { id: CONTA },
        message: { mid: "mid.1", text: "Meu sonhooooooo" },
      }],
    }],
  };
  const [ev] = extrairEventos(p);
  assert.equal(ev.tipo, "dm");
  assert.equal(ev.igsid, PESSOA);
  assert.equal(ev.texto, "Meu sonhooooooo");
});

/* ── As travas no processador (lidas do fonte, que é onde elas vivem) ───── */

import { readFileSync } from "node:fs";
const FONTE = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");

test("🔴 o eco NÃO é mais descartado junto com 'ignorar'", () => {
  assert.ok(
    !/ev\.tipo === "eco" \|\| ev\.tipo === "ignorar"/.test(FONTE),
    "o eco voltou a ser jogado fora, e com ele o único sinal de que a Aline está conversando",
  );
  assert.match(FONTE, /if \(ev\.tipo === "eco"\)[\s\S]{0,120}marcarSeFoiAline/);
});

test("🔴 contato com aline_falou_em não recebe resposta", () => {
  assert.match(FONTE, /if \(contato\.aline_falou_em\)\s*\{\s*resumo\.ignorados\+\+;\s*continue;\s*\}/);
});

test("a trava vem ANTES de qualquer resposta (regra, IA ou chave geral)", () => {
  const trava = FONTE.indexOf("contato.aline_falou_em");
  for (const depois of ["selecionarRegra(", "responderDmComScanner(", "gerarAgradecimentoComentario("]) {
    assert.ok(trava > 0 && trava < FONTE.indexOf(depois), `a trava tem que vir antes de ${depois}`);
  }
});

test("aline_falou_em é carregado junto com o contato", () => {
  assert.match(FONTE, /COLS_CONTATO = "[^"]*aline_falou_em/);
});

test("🔴 o robô reconhece o PRÓPRIO eco por message_id e não se autotrava", () => {
  assert.match(FONTE, /external_id["']?\s*[,:]/);
  assert.match(FONTE, /\.eq\("external_id", ev\.externalId\)/);
});

test("há rede por texto pros envios cujo id não ficou guardado", () => {
  assert.match(FONTE, /\.eq\("texto", ev\.texto\)/);
});
