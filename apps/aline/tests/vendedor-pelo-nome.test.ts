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
