import { test } from "node:test";
import assert from "node:assert/strict";
import { pareceAbordagemComercial } from "../src/lib/automacao/regras.ts";

/**
 * 🔴 O caso que escapou (20/09/2026): o João Pedro passou pelo filtro porque
 * o ofício dele está no NOME DO PERFIL, não na mensagem. Quem pendura
 * "Tráfego Pago" no próprio nome está anunciando, não pedindo ajuda.
 */
test("ofício no NOME do perfil basta, mesmo com a mensagem limpa", () => {
  const msg = "Oi Aline, tudo bem? Vi seu conteúdo e queria te fazer uma proposta.";
  assert.equal(pareceAbordagemComercial(msg), false, "sem o nome, a mensagem sozinha não denuncia");
  assert.equal(pareceAbordagemComercial(msg, { nome: "João Pedro | Tráfego Pago" }), true);
});

test("separador no nome e no @ não esconde o ofício", () => {
  assert.equal(pareceAbordagemComercial("oi", { nome: "Lucas • Social Media" }), true);
  assert.equal(pareceAbordagemComercial("oi", { username: "trafego.pago.lucas" }), true);
  assert.equal(pareceAbordagemComercial("oi", { username: "socialmedia_oficial" }), true);
  assert.equal(pareceAbordagemComercial("oi", { nome: "Ana - Edição de Vídeo" }), true);
});

test("termo curto NÃO casa grudado: só ofício longo vale sem separador", () => {
  // "imovel" tem 6 letras; grudado dentro de um nome viraria falso positivo
  // à toa. Com separador continua pegando.
  assert.equal(pareceAbordagemComercial("oi", { nome: "Imóveis Curitiba" }), true);
  assert.equal(pareceAbordagemComercial("oi", { username: "mariaimovelinda" }), false);
});

test("paciente e nutri de verdade passam", () => {
  assert.equal(pareceAbordagemComercial("Como faço pra agendar a consulta?", { nome: "Célia Agostinho" }), false);
  assert.equal(
    pareceAbordagemComercial("Quero o material do GLP1", { nome: "Dra. Mariana Uchôa", username: "marianauchoanutri" }),
    false,
  );
  assert.equal(pareceAbordagemComercial("", { nome: "Maria Silva" }), false);
});

test("identidade vazia ou ausente não muda o que já funcionava", () => {
  assert.equal(pareceAbordagemComercial("trabalho com tráfego pago"), true);
  assert.equal(pareceAbordagemComercial("oi tudo bem"), false);
  assert.equal(pareceAbordagemComercial("oi tudo bem", {}), false);
  assert.equal(pareceAbordagemComercial("oi tudo bem", { nome: null, username: null }), false);
});

test("parceria só conta com abordagem fria, e isso não mudou", () => {
  assert.equal(pareceAbordagemComercial("queria propor uma parceria", { nome: "Ana Nutri" }), false);
  assert.equal(pareceAbordagemComercial("gostei do seu perfil, quero fechar uma parceria"), true);
});

test("06/11: os vendedores reais de outubro são reconhecidos; paciente pedindo consulta não", () => {
  assert.equal(pareceAbordagemComercial("Oi, *Dra Aline!* Tudo bem? Sou do time da VENDÍ. Estamos lançando o VENDÍ Clínicas, a primeira plataforma AI first do Brasil para clínicas."), true);
  assert.equal(pareceAbordagemComercial("Olá, Aline! Meu nome é Sofia, sou nutricionista da Selvs, e é com muita alegria que iniciamos um novo ciclo de visitação online!"), true);
  assert.equal(pareceAbordagemComercial("Bom Dia! Como faço pra agendar uma consulta ?"), false);
  assert.equal(pareceAbordagemComercial("Vc mora em Curitiba, atende pela Unimed"), false);
  assert.equal(pareceAbordagemComercial("Fiz os exames todos aqui para a gineco, me avisa que marco um horário com você."), false);
});
