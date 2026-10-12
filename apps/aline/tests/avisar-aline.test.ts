/**
 * Convite, imprensa e cliente com problema são pra Aline ler.
 * Incidente de 25/09/2026: o modo coração curtiu cinco mensagens da assessora
 * do podcast Fitocast e a de uma aluna perguntando do bônus, sem avisar ninguém.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { motivoParaAvisarAline, pareceAbordagemComercial } from "../src/lib/automacao/regras.ts";

test("convite de podcast vira aviso", () => {
  assert.ok(motivoParaAvisarAline("Meu nome é Erika, sou jornalista e trabalho na asessoria de comunicação do dr Julio. Ele tem um podcast chamado Fitocast"));
});

test("aluna perguntando do bônus vira aviso", () => {
  assert.ok(motivoParaAvisarAline("Oi Aline, tudo bem?! Como faço pra liberar o meu bônus de 3 meses que vc me deu ?!"));
});

test("dúvida comum não vira aviso", () => {
  assert.equal(motivoParaAvisarAline("Mesmo assim fico enfezada..kkkk"), null);
  assert.equal(motivoParaAvisarAline("tenho intestino preso e muita fadiga"), null);
  assert.equal(motivoParaAvisarAline("Bom dia Dra Aline"), null);
});

test("designer no nome do perfil é abordagem comercial", () => {
  assert.equal(pareceAbordagemComercial("Oi! Tudo bem, Aline? Dei uma olhada no perfil", { nome: "Diego Rosa | Designer", username: "o_diegorosa" }), true);
});

test("o aviso vem antes do coração e da IA no direct", () => {
  const fonte = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
  const aviso = fonte.indexOf("motivoParaAvisarAline(textoPessoa)");
  const coracao = fonte.indexOf("if (config.reagir_com_coracao)");
  const ia = fonte.indexOf("responderDmComScanner({");
  assert.ok(aviso > 0 && aviso < coracao && aviso < ia);
});

test("um coração por conversa, não um por mensagem", () => {
  const fonte = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
  const bloco = fonte.slice(fonte.indexOf("if (config.reagir_com_coracao)"), fonte.indexOf("reagirMensagem(cred"));
  assert.match(bloco, /coracaoNasUltimas24h\(contato\.id\)/);
});
