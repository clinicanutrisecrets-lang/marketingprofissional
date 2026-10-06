/**
 * A tela de planejamento do feed (06/10/2026). O que ela promete: "como o
 * perfil vai ficar". As travas abaixo são o que separa isso de uma lista.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  agruparPorMes, chaveDoMes, dataCurta, dataDoPost, ehAcervoAntigo, ehDeGrade,
  ordenarParaFeed, rotuloDoMes, rotuloTipo, seloDoStatus, tituloDoPost, type PostFeed,
} from "../src/lib/feed/plano.ts";

const base: PostFeed = {
  id: "1", tipo: "feed_carrossel", status: "aguardando_aprovacao", semana_ref: null,
  data_hora_agendada: null, data_hora_postada: null, pilar: null, angulo: null,
  copy_legenda: null, criado_em: "2026-10-06T10:00:00Z",
};
const p = (o: Partial<PostFeed>): PostFeed => ({ ...base, ...o });

/* ── o que entra na grade ─────────────────────────────────────────────── */

test("story NÃO entra na grade: o Instagram não põe story no perfil", () => {
  assert.equal(ehDeGrade("stories"), false);
  assert.equal(ehDeGrade("stories_sequencia"), false);
  for (const t of ["feed_imagem", "feed_carrossel", "reels"]) assert.equal(ehDeGrade(t), true);
});

/* ── a ordem é a do perfil ────────────────────────────────────────────── */

test("o mais recente vem primeiro, como no Instagram", () => {
  const r = ordenarParaFeed([
    p({ id: "velho", data_hora_agendada: "2026-10-01T12:00:00Z" }),
    p({ id: "novo", data_hora_agendada: "2026-10-20T12:00:00Z" }),
    p({ id: "meio", data_hora_agendada: "2026-10-10T12:00:00Z" }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["novo", "meio", "velho"]);
});

test("o que já foi ao ar manda sobre o agendado", () => {
  // Post remarcado pra frente mas JÁ postado fica no lugar em que foi postado.
  const post = p({ data_hora_postada: "2026-10-02T12:00:00Z", data_hora_agendada: "2026-10-30T12:00:00Z" });
  assert.equal(dataDoPost(post), "2026-10-02T12:00:00Z");
});

test("sem hora marcada, vale a semana de referência", () => {
  assert.equal(dataDoPost(p({ semana_ref: "2026-10-12" })), "2026-10-12");
});

test("post sem data nenhuma vai pro fim, nunca pro topo", () => {
  const r = ordenarParaFeed([
    p({ id: "solto" }),
    p({ id: "comData", data_hora_agendada: "2026-01-01T12:00:00Z" }),
  ]);
  assert.deepEqual(r.map((x) => x.id), ["comData", "solto"]);
});

/* ── agrupamento por mês ──────────────────────────────────────────────── */

test("mês mais recente primeiro, e os sem data num grupo próprio no fim", () => {
  const g = agruparPorMes([
    p({ id: "a", data_hora_agendada: "2026-09-10T12:00:00Z" }),
    p({ id: "b", data_hora_agendada: "2026-10-10T12:00:00Z" }),
    p({ id: "c" }),
  ]);
  assert.deepEqual(g.map((x) => x.chave), ["2026-10", "2026-09", "sem-data"]);
  assert.equal(g[0].rotulo, "outubro de 2026");
});

test("data torta não derruba a tela: cai no grupo sem data", () => {
  assert.equal(chaveDoMes("mês que vem"), null);
  assert.equal(chaveDoMes(null), null);
  assert.equal(chaveDoMes("2026-13-01"), "2026-13"); // formato ok, mês inválido
  assert.equal(rotuloDoMes("2026-13"), "13 de 2026"); // sem quebrar
  const g = agruparPorMes([p({ id: "x", semana_ref: "qualquer coisa" })]);
  assert.equal(g[0].chave, "sem-data");
});

/* ── o acervo que ela mandou apagar ───────────────────────────────────── */

const CORTE = "2026-10-06T00:00:00.000Z";

test("post antigo esperando aprovação é acervo pra apagar", () => {
  assert.equal(ehAcervoAntigo(p({ criado_em: "2026-05-11T10:00:00Z" }), CORTE), true);
});

test("🔴 post que JÁ foi ao ar nunca é apagado, qualquer que seja o status", () => {
  const postado = p({ criado_em: "2026-05-11T10:00:00Z", data_hora_postada: "2026-05-12T10:00:00Z" });
  assert.equal(ehAcervoAntigo(postado, CORTE), false);
  // mesmo que o status tenha ficado pra trás
  assert.equal(ehAcervoAntigo({ ...postado, status: "aguardando_aprovacao" }, CORTE), false);
});

test("post novo não é tocado, nem o aprovado nem o agendado", () => {
  assert.equal(ehAcervoAntigo(p({ criado_em: "2026-10-07T10:00:00Z" }), CORTE), false);
  assert.equal(ehAcervoAntigo(p({ criado_em: "2026-05-11T10:00:00Z", status: "aprovado" }), CORTE), false);
  assert.equal(ehAcervoAntigo(p({ criado_em: "2026-05-11T10:00:00Z", status: "agendado" }), CORTE), false);
});

/* ── texto da tela ────────────────────────────────────────────────────── */

test("o título sai da primeira linha da legenda, numa linha só", () => {
  assert.equal(tituloDoPost(p({ copy_legenda: "  \n\nNão é falta de força de vontade.\nÉ cortisol." })),
    "Não é falta de força de vontade.");
});

test("legenda longa é cortada com reticência, nunca no meio da tela", () => {
  const t = tituloDoPost(p({ copy_legenda: "a".repeat(200) }), 20);
  assert.equal(t.length, 20);
  assert.ok(t.endsWith("…"));
});

test("sem legenda, mostra o pilar em vez de um quadrado mudo", () => {
  assert.equal(tituloDoPost(p({ pilar: "microbiota" })), "(microbiota)");
  assert.equal(tituloDoPost(p({})), "(sem legenda ainda)");
});

test("os estados viram palavra de gente", () => {
  assert.equal(seloDoStatus("aguardando_aprovacao").texto, "esperando você");
  assert.equal(seloDoStatus("postado").texto, "no ar");
  // gerando e aguardando_midia são a mesma espera pra quem olha
  assert.equal(seloDoStatus("gerando").texto, seloDoStatus("aguardando_midia").texto);
});

test("tipo vira o nome que ela usa", () => {
  assert.equal(rotuloTipo("feed_carrossel"), "carrossel");
  assert.equal(rotuloTipo("reels"), "reel");
});

test("data curta em dia/mês/ano, e vazia quando não há data", () => {
  assert.equal(dataCurta("2026-10-06T12:00:00Z"), "06/10/26");
  assert.equal(dataCurta(null), "");
});

/* ── ligação: a tela usa a régua, não uma cópia ───────────────────────── */

const pagina = readFileSync("src/app/perfis/[slug]/feed/page.tsx", "utf8");
const acoes = readFileSync("src/lib/feed/actions.ts", "utf8");

test("a tela separa grade de stories pela régua, sem lista própria", () => {
  assert.match(pagina, /ehDeGrade\(p\.tipo\)/);
  assert.doesNotMatch(pagina, /"feed_carrossel"\s*,\s*"reels"/);
});

test("🔴 erro de leitura vira aviso, nunca 'nada planejado'", () => {
  assert.match(pagina, /erroPosts/);
  const i = pagina.indexOf("if (erroPosts)");
  const j = pagina.indexOf("Nada planejado ainda");
  assert.ok(i > 0 && j > i, "o ramo de erro tem que vir ANTES do estado vazio");
});

test("a limpeza confere post a post pela régua, não por um delete solto", () => {
  assert.match(acoes, /ehAcervoAntigo\(p, CORTE_ACERVO_ANTIGO\)/);
  assert.doesNotMatch(acoes, /\.delete\(\)\s*\.eq\("status"/);
});

test("a limpeza é só de super_admin e apaga mídia antes do post", () => {
  assert.match(acoes, /assertSuperAdmin\(\)/);
  const iMid = acoes.indexOf('from("post_midias").delete()');
  const iPost = acoes.indexOf('from("posts").delete()');
  assert.ok(iMid > 0 && iPost > iMid, "a mídia tem que sair antes do post");
});
