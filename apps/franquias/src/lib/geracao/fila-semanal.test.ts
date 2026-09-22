/**
 * A fila do pacote semanal (Gleryston sem posts, 22/09/2026).
 *
 * Roda sem instalar nada:
 *   node --experimental-strip-types --test src/lib/geracao/fila-semanal.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  LOTE_PARALELO,
  ORCAMENTO_MS,
  segundaDaSemana,
  semanasParaRemontar,
  avisoFilaCortada,
  cabeMaisUmLote,
  filhaIndisponivel,
  lotesDaFila,
  ordenarFila,
} from "./fila-semanal.ts";

const raiz = join(import.meta.dirname, "../../..");
const semComentario = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** As contas reais, na ordem física que a tabela devolvia em 22/09/2026. */
const FISICA = [
  { id: "99c3a208", nome_completo: "Dra. Demo Teste Scanner", email: "demo@scannerdasaude.com", criado_em: "2026-04-15T23:06:29Z" },
  { id: "9f11143f", nome_completo: "Teste Meta Review", email: "clinicanutrisecrets+metareview@gmail.com", criado_em: "2026-04-20T18:08:08Z" },
  { id: "b1c99403", nome_completo: "Nutri Demo", email: "demo.nutri@scannerdasaude.com", criado_em: "2026-08-07T02:14:24Z" },
  { id: "8af97c61", nome_completo: "Viviane Tavares", email: "suporte.vivitavares@gmail.com", criado_em: "2026-08-11T17:54:19Z" },
  { id: "6a5b459d", nome_completo: "Aline Quissak", email: "clinicanutrisecrets@gmail.com", criado_em: "2026-04-14T06:11:34Z" },
  { id: "2e8d44ec", nome_completo: "Juliana Mendes", email: "julimendesnutri@gmail.com", criado_em: "2026-08-11T14:03:39Z" },
  { id: "09b807b9", nome_completo: "Gleryston Agra de Mello", email: "gleryston@yahoo.com.br", criado_em: "2026-08-26T17:18:59Z" },
];

test("a ordem não é mais a física da tabela", () => {
  const ordem = ordenarFila(FISICA).map((c) => c.id);
  assert.notDeepEqual(ordem, FISICA.map((c) => c.id));
  // a mais antiga (Aline, 14/04) vai primeiro; a mais nova (Gleryston) por último
  assert.equal(ordem[0], "6a5b459d");
  assert.equal(ordem[ordem.length - 1], "09b807b9");
});

test("a ordem é estável: mesma entrada, mesma saída, em qualquer embaralhada", () => {
  const a = ordenarFila(FISICA).map((c) => c.id);
  const b = ordenarFila([...FISICA].reverse()).map((c) => c.id);
  assert.deepEqual(a, b);
});

test("criadas no mesmo instante desempatam por id, nunca pela ordem de chegada", () => {
  const mesmo = "2026-09-01T10:00:00Z";
  const x = [
    { id: "zzz", nome_completo: "Z", email: null, criado_em: mesmo },
    { id: "aaa", nome_completo: "A", email: null, criado_em: mesmo },
  ];
  assert.deepEqual(ordenarFila(x).map((c) => c.id), ["aaa", "zzz"]);
  assert.deepEqual(ordenarFila([...x].reverse()).map((c) => c.id), ["aaa", "zzz"]);
});

test("ordenar não mexe no array que recebeu", () => {
  const copia = [...FISICA];
  ordenarFila(FISICA);
  assert.deepEqual(FISICA.map((c) => c.id), copia.map((c) => c.id));
});

test("as 7 contas de hoje cabem em 2 lotes", () => {
  const lotes = lotesDaFila(ordenarFila(FISICA));
  assert.equal(lotes.length, 2);
  assert.equal(lotes[0].length, LOTE_PARALELO);
  assert.equal(lotes[1].length, 7 - LOTE_PARALELO);
  // ninguém se perde e ninguém aparece duas vezes
  const todos = lotes.flat().map((c) => c.id);
  assert.equal(new Set(todos).size, 7);
});

test("fila vazia não vira lote vazio", () => {
  assert.deepEqual(lotesDaFila([]), []);
});

test("o orçamento fecha ANTES do teto de 300s da função", () => {
  assert.ok(ORCAMENTO_MS < 300_000, "sem folga não dá pra devolver o relatório");
  assert.ok(cabeMaisUmLote(0));
  assert.ok(cabeMaisUmLote(ORCAMENTO_MS - 1));
  assert.equal(cabeMaisUmLote(ORCAMENTO_MS), false);
  assert.equal(cabeMaisUmLote(299_000), false);
});

test("quem fica de fora é nomeado; quando ninguém fica, não há aviso", () => {
  assert.equal(avisoFilaCortada([]), null);
  const aviso = avisoFilaCortada([FISICA[6], FISICA[5]]);
  assert.ok(aviso);
  assert.match(aviso, /gleryston@yahoo\.com\.br/);
  assert.match(aviso, /julimendesnutri@gmail\.com/);
});

test("só 'a filha não está aí' cai no inline; erro de geração não repete", () => {
  for (const s of [404, 401, 403, 405]) assert.equal(filhaIndisponivel(s), true, `${s}`);
  for (const s of [200, 400, 429, 500, 502, 504]) assert.equal(filhaIndisponivel(s), false, `${s}`);
});

/* ── as semanas que o admin pode remontar à mão ───────────────────────── */

test("a segunda da semana é a MESMA de segunda a domingo", () => {
  // 21/09/2026 é segunda; a semana dela vai até domingo 27/09
  for (const dia of ["21", "22", "24", "27"]) {
    assert.equal(
      segundaDaSemana(new Date(`2026-09-${dia}T12:00:00Z`)),
      "2026-09-21",
      `dia ${dia}`,
    );
  }
  assert.equal(segundaDaSemana(new Date("2026-09-20T09:00:00Z")), "2026-09-14");
  assert.equal(segundaDaSemana(new Date("2026-09-28T00:00:00Z")), "2026-09-28");
});

test("a data é em UTC: meia-noite de segunda não vira o domingo anterior", () => {
  assert.equal(segundaDaSemana(new Date("2026-09-21T00:00:00Z")), "2026-09-21");
  assert.equal(segundaDaSemana(new Date("2026-09-21T23:59:59Z")), "2026-09-21");
});

test("o admin remonta a semana que corre e a que vem, nunca a que passou", () => {
  const s = semanasParaRemontar(new Date("2026-09-22T12:00:00Z"));
  assert.deepEqual(s, { atual: "2026-09-21", proxima: "2026-09-28" });
  assert.ok(s.atual < s.proxima);
});

test("o domingo do cron ainda chama de 'próxima' a semana que ele monta", () => {
  // o cron de 20/09 monta 2026-09-21; pra quem abre o admin no mesmo domingo,
  // essa é a PRÓXIMA — a atual ainda é a de 14/09
  const s = semanasParaRemontar(new Date("2026-09-20T09:00:00Z"));
  assert.equal(s.proxima, "2026-09-21");
});

/* ── ligação: o defeito era no cron, não na régua ─────────────────────── */

test("o cron pai não gera mais dentro do próprio loop", () => {
  const src = semComentario(
    readFileSync(join(raiz, "src/app/api/cron/gerar-semanas/route.ts"), "utf8"),
  );
  // a única chamada direta que resta é o fallback de filha indisponível
  const chamadas = src.match(/gerarPostsDaSemana\(/g) ?? [];
  assert.equal(chamadas.length, 1, "geração inline voltou pro laço do pai");
  assert.match(src, /filhaIndisponivel/, "o fallback perdeu a guarda");
  assert.match(src, /gerar-semanas\/uma/, "o pai parou de despachar");
});

test("a consulta das contas tem ordem explícita pela régua, não a física", () => {
  const src = semComentario(
    readFileSync(join(raiz, "src/app/api/cron/gerar-semanas/route.ts"), "utf8"),
  );
  assert.match(src, /ordenarFila\(\(franqueadas/, "sem ordenarFila a fila volta a ser a física");
  assert.match(src, /criado_em/, "sem criado_em no select não há como ordenar");
});

test("erro ao ler as contas não vira 'nenhuma franqueada ativa'", () => {
  const src = semComentario(
    readFileSync(join(raiz, "src/app/api/cron/gerar-semanas/route.ts"), "utf8"),
  );
  assert.match(src, /erroLista/, "o erro da consulta voltou a ser engolido");
});

test("quem sobra sai no relatório e no log, com nome", () => {
  const src = semComentario(
    readFileSync(join(raiz, "src/app/api/cron/gerar-semanas/route.ts"), "utf8"),
  );
  assert.match(src, /avisoFilaCortada\(naoProcessadas\)/, "o aviso parou de ser calculado");
  assert.match(src, /nao_processadas/);
  assert.match(src, /console\.error/);
});

test("a ação de montar a semana à mão tem UMA tela que a chame", () => {
  const bloco = readFileSync(
    join(raiz, "src/app/admin/franqueadas/[id]/GerarSemanaBlock.tsx"),
    "utf8",
  );
  assert.match(bloco, /gerarSemanaAdmin\(/, "o botão parou de chamar a ação");
  const pagina = readFileSync(
    join(raiz, "src/app/admin/franqueadas/[id]/page.tsx"),
    "utf8",
  );
  assert.match(pagina, /<GerarSemanaBlock/, "o bloco existe mas ninguém o desenha");
});

test("'já está montada' não é pintado como falha", () => {
  const bloco = readFileSync(
    join(raiz, "src/app/admin/franqueadas/[id]/GerarSemanaBlock.tsx"),
    "utf8",
  );
  assert.match(bloco, /jaExiste/);
});

test("a rota filha exige o CRON_SECRET (gerar post custa modelo)", () => {
  const src = readFileSync(
    join(raiz, "src/app/api/cron/gerar-semanas/uma/route.ts"),
    "utf8",
  );
  assert.match(src, /Bearer \$\{process\.env\.CRON_SECRET\}/);
  assert.match(src, /status: 401/);
  assert.match(src, /maxDuration = 300/, "sem os 300s dela a filha não resolve nada");
});

test("o despacho não pode ser cacheado pelo fetch do Next", () => {
  const src = readFileSync(
    join(raiz, "src/app/api/cron/gerar-semanas/route.ts"),
    "utf8",
  );
  assert.match(src, /fetchCache = "force-no-store"/);
  assert.match(src, /cache: "no-store"/);
});
