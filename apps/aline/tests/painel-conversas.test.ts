/**
 * Painel de conversas (Aline, 06/11/2026): urgente, esperando você, ninguém
 * respondeu, robô respondeu.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { montarPainel, horasDeJanela, legendaDaOrigem, linkDoDirect, type ContatoPainel, type MensagemPainel } from "../src/lib/automacao/painel.ts";

const agora = Date.parse("2026-11-06T15:00:00Z");
const h = (n: number) => new Date(agora - n * 3600_000).toISOString();
const contato = (id: string, extra: Partial<ContatoPainel> = {}): ContatoPainel => ({
  id, username: id, nome: null, precisa_humano: false, precisa_humano_motivo: null, silenciado: false,
  aline_falou_em: null, ultima_msg_recebida_em: h(1), ...extra,
});
const msg = (id: string, contato_id: string, direcao: "entrada" | "saida", horas: number, origem: string | null = null): MensagemPainel =>
  ({ id, contato_id, canal: "dm", direcao, texto: id, origem, criado_em: h(horas) });

test("cada conversa cai num bloco só, na ordem certa", () => {
  const contatos = [
    contato("crise", { precisa_humano: true, precisa_humano_motivo: "🔴 mensagem de sofrimento ou risco à vida: leia agora" }),
    contato("bonus", { precisa_humano: true, precisa_humano_motivo: "cliente com dúvida de compra, acesso ou bônus" }),
    contato("calada"),
    contato("respondida"),
    contato("amiga", { aline_falou_em: h(30) }),
  ];
  const mensagens = [
    msg("c1", "crise", "entrada", 2), msg("c2", "crise", "saida", 2, "risco:crise"),
    msg("b1", "bonus", "entrada", 3),
    msg("s1", "calada", "entrada", 1),
    msg("r1", "respondida", "entrada", 5), msg("r2", "respondida", "saida", 5, "ia_scanner"),
    msg("a1", "amiga", "entrada", 1),
  ];
  const p = montarPainel(contatos, mensagens, agora);
  assert.deepEqual(p.urgentes.map((v) => v.contato.id), ["crise"]);
  assert.deepEqual(p.esperando.map((v) => v.contato.id), ["bonus"]);
  assert.deepEqual(p.semResposta.map((v) => v.contato.id), ["calada"]); // a amiga é conversa dela
  assert.deepEqual(p.roboRespondeu.map((v) => v.contato.id), ["respondida"]);
  assert.equal(p.contadores.entradas24h, 5);
  assert.equal(p.contadores.saidas24h, 2);
});

test("janela de 24 h: horas que faltam, ou fechada", () => {
  assert.equal(horasDeJanela(h(20), agora), 4);
  assert.equal(horasDeJanela(h(25), agora), null);
  assert.equal(horasDeJanela(null, agora), null);
});

test("a origem aparece em palavras dela", () => {
  assert.equal(legendaDaOrigem("risco:crise"), "mensagem de segurança (CVV / 192)");
  assert.equal(legendaDaOrigem("opcao:Sou mãe"), 'botão "Sou mãe"');
  assert.equal(legendaDaOrigem("ia_scanner"), "conversa escrita pelo robô");
});

test("abrir no Instagram usa o @ da pessoa", () => {
  assert.equal(linkDoDirect("@maria.souza"), "https://ig.me/m/maria.souza");
  assert.equal(linkDoDirect(null), null);
});

test("🔴 erro de leitura mostra erro, nunca painel vazio", () => {
  const page = readFileSync(new URL("../src/app/perfis/[slug]/conversas/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Erro ao carregar as conversas/);
  assert.match(page, /Erro ao carregar os contatos/);
});
