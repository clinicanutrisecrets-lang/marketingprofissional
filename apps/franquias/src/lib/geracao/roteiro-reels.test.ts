import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  roteiroDoReelGerado,
  limparRoteiro,
  linkTeleprompter,
  duracaoEstimadaSegundos,
  ROTEIRO_MAX_CHARS,
} from "./roteiro-reels.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("reel: grava o roteiro que o modelo escreveu, limpo", () => {
  const r = roteiroDoReelGerado("reels", {
    script_reels: "Hook: Dez dias por mês você vira outra pessoa. [pausa] E ninguém acha isso estranho.\n\n\n\nCTA: Salva este post.",
  });
  assert.equal(
    r,
    "Dez dias por mês você vira outra pessoa. E ninguém acha isso estranho.\n\nSalva este post.",
  );
});

test("fora de reels grava nulo, mesmo que o modelo tenha mandado script", () => {
  assert.equal(roteiroDoReelGerado("feed_imagem", { script_reels: "texto" }), null);
  assert.equal(roteiroDoReelGerado("stories", { script_reels: "texto" }), null);
});

test("reel sem script, com script vazio ou de outro tipo grava nulo, nunca string vazia", () => {
  assert.equal(roteiroDoReelGerado("reels", {}), null);
  assert.equal(roteiroDoReelGerado("reels", { script_reels: "   \n " }), null);
  assert.equal(roteiroDoReelGerado("reels", { script_reels: 42 }), null);
  assert.equal(roteiroDoReelGerado("reels", { script_reels: "[olha pra câmera]" }), null);
});

test("limpar não come texto entre colchetes longo demais pra ser marcação", () => {
  const t = "a".repeat(80);
  assert.equal(limparRoteiro(`[${t}]`), `[${t}]`);
});

test("roteiro respeita o limite do textarea do teleprompter", () => {
  assert.equal(limparRoteiro("x".repeat(ROTEIRO_MAX_CHARS + 500)).length, ROTEIRO_MAX_CHARS);
});

test("link do teleprompter leva o roteiro codificado na URL", () => {
  const l = linkTeleprompter("Olá & tchau");
  assert.equal(l, "/dashboard/teleprompter?texto=Ol%C3%A1%20%26%20tchau");
});

test("duração estimada: ~2,5 palavras por segundo, mínimo 5s", () => {
  assert.equal(duracaoEstimadaSegundos("uma duas"), 5);
  assert.equal(duracaoEstimadaSegundos(Array(100).fill("palavra").join(" ")), 40);
});

// Travas de ligação: o roteiro só serve se os quatro pontos estiverem ligados.
test("ligação: o gerador semanal GRAVA o roteiro no post", () => {
  const s = fonte("./semanal.ts");
  assert.match(s, /roteiro_reels:\s*roteiroDoReelGerado\(item\.tipo,\s*post\)/);
  assert.match(s, /from "@\/lib\/geracao\/roteiro-reels"/);
});

test("ligação: o prompt do reel pede o roteiro como fala de teleprompter", () => {
  const s = fonte("../claude/prompts.ts");
  assert.match(s, /"script_reels"/);
  assert.match(s, /teleprompter/);
  assert.match(s, /80 a 120 palavras/);
});

test("ligação: a tela Aprovar semana abre o teleprompter com o roteiro", () => {
  const s = fonte("../../app/dashboard/aprovar/AprovacaoView.tsx");
  assert.match(s, /linkTeleprompter\(roteiro\)/);
  assert.match(s, /post\.roteiro_reels/);
  assert.match(s, /Gravar no teleprompter/);
});

test("ligação: a coluna existe na migração e é nula por padrão", () => {
  const s = fonte("../../../../../supabase/migrations/franquias/032_posts_roteiro_reels.sql");
  assert.match(s, /add column if not exists roteiro_reels text/);
});
