import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/** O bloco entre `const SYSTEM_SPEC = \`` e a crase que fecha. */
function bloco(fonte: string, inicio: RegExp, fim: string): string {
  const m = fonte.match(inicio);
  assert.ok(m && m.index !== undefined, "início não encontrado");
  const de = m.index + m[0].length;
  const ate = fonte.indexOf(fim, de);
  assert.ok(ate > de, "fim não encontrado");
  return fonte.slice(de, ate);
}

const studio = ler("../src/lib/reel-animado/spec.ts");
const avancado = ler("../../franquias/src/lib/conteudo/reel-animado.ts");

test("o prompt do reel desenhado é o MESMO do Avançado (contrato com o renderizador)", () => {
  const a = bloco(studio, /export const SYSTEM_SPEC = `/, "`.trim();");
  const b = bloco(avancado, /const SYSTEM_SPEC = `/, "`.trim();");
  assert.equal(a, b);
});

test("a normalização do SPEC é a mesma do Avançado", () => {
  const a = bloco(studio, /export function normalizarSpecReel\(/, "\nexport type DuracaoReel");
  const b = bloco(avancado, /function normalizarSpecReel\(/, "\nexport type DuracaoReel");
  assert.equal(a, b);
  assert.match(studio, /export const DUR_MAX_TOTAL_S = 60;/);
});

test("o botão reserva o post ANTES de disparar o robô, e devolve se o robô recusar", () => {
  const acao = ler("../src/lib/reel-animado/actions.ts");
  const reserva = acao.indexOf('update({ status: "gerando" })');
  const disparo = acao.indexOf("render-reel.yml/dispatches");
  assert.ok(reserva > 0 && disparo > reserva);
  assert.match(acao, /\.neq\("status", "gerando"\)/);
  assert.match(acao, /aline_post_id: post\.id/);
  assert.doesNotMatch(acao, /heygen|avatar_id/i);
});

test("o robô entrega o vídeo no post do Studio e nunca o deixa preso em gerando", () => {
  const wf = ler("../../../.github/workflows/render-reel.yml");
  assert.match(wf, /aline_post_id:/);
  assert.match(wf, /Content-Profile: aline/);
  assert.match(wf, /rest\/v1\/post_midias/);
  assert.match(wf, /"status":"aguardando_aprovacao","midia_pendente":false/);
  assert.match(wf, /failure\(\) && inputs\.aline_post_id != ''[\s\S]*status=eq\.gerando[\s\S]*aguardando_midia/);
  // o caminho do Avançado continua igual
  assert.match(wf, /posts_agendados\?id=eq\.\$\{\{ inputs\.post_id \}\}/);
});
