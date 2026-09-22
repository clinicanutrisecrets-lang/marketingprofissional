/**
 * Modo coração: o robô avisa que viu, sem falar em nome dela.
 *
 * 🔴 Pedido da Aline em 22/09/2026, na mesma hora em que desligou a IA:
 * *"pode só curtir e mandar um coração, porque aí eu posso ver se quero
 * responder manualmente a mais."*
 *
 * Nasceu do robô ter respondido por cima de uma conversa pessoal dela. O
 * coração resolve o problema de raiz: não existe frase errada pra escrever
 * quando não se escreve nada.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerConfig } from "../src/lib/automacao/config.ts";

const PROC = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
const API = readFileSync(new URL("../src/lib/instagram/api.ts", import.meta.url), "utf8");

test("a chave nasce DESLIGADA: coração é escolha dela, não padrão", () => {
  assert.equal(lerConfig({}).reagir_com_coracao, false);
  assert.equal(lerConfig({ reagir_com_coracao: true }).reagir_com_coracao, true);
  assert.equal(lerConfig({ reagir_com_coracao: "sim" }).reagir_com_coracao, false);
});

test("a reação usa 'love' — é a única que a Meta aceita de fora", () => {
  assert.match(API, /sender_action:\s*"react"/);
  assert.match(API, /reaction:\s*"love"/);
});

test("🔴 o coração VENCE a IA: com ele ligado, ela não escreve direct nenhum", () => {
  const coracao = PROC.indexOf("config.reagir_com_coracao");
  const ia = PROC.indexOf("config.responder_dm_scanner");
  assert.ok(coracao > 0 && ia > 0 && coracao < ia, "a checagem do coração tem que vir antes da IA");
  // E o ramo termina em continue, sem cair na IA.
  const trecho = PROC.slice(coracao, ia);
  assert.match(trecho, /continue;\s*\}/);
});

test("vendedor não ganha coração", () => {
  const i = PROC.indexOf("config.reagir_com_coracao");
  const trecho = PROC.slice(i, i + 900);
  assert.match(trecho, /pareceAbordagemComercial/);
});

test("🔴 sem id da mensagem não há o que reagir: sai calado, não estoura", () => {
  const i = PROC.indexOf("config.reagir_com_coracao");
  const trecho = PROC.slice(i, i + 900);
  assert.match(trecho, /!ev\.externalId/);
});

test("falha ao reagir não derruba o lote", () => {
  const i = PROC.indexOf("config.reagir_com_coracao");
  const trecho = PROC.slice(i, i + 1200);
  assert.match(trecho, /try \{[\s\S]*reagirMensagem[\s\S]*catch/);
});

test("o coração fica registrado, pra ela ver no painel quem foi visto", () => {
  const i = PROC.indexOf("config.reagir_com_coracao");
  const trecho = PROC.slice(i, i + 1200);
  assert.match(trecho, /origem: "coracao"/);
});

test("🔴 as travas de antes continuam valendo, e vêm ANTES do coração", () => {
  const coracao = PROC.indexOf("config.reagir_com_coracao");
  for (const guarda of ["contato.aline_falou_em", "contato.silenciado", "config.nao_responder_usernames"]) {
    const i = PROC.indexOf(guarda);
    assert.ok(i > 0 && i < coracao, `${guarda} tem que ser checado antes do coração`);
  }
});

test("comentário não entra aqui: curtir comentário não existe na API", () => {
  // O ramo do coração vive dentro do gatilho "dm".
  const i = PROC.indexOf("config.reagir_com_coracao");
  const antes = PROC.slice(0, i);
  assert.ok(antes.lastIndexOf('gatilho === "dm"') > antes.lastIndexOf('gatilho === "comentario"'));
});
