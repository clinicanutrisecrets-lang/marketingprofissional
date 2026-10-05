import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { diaDoReelAnimado, temaDoReelAnimado } from "./reel-animado-semanal.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("tema do reel animado sai da queixa da semana; sem queixa, o nicho", () => {
  assert.match(temaDoReelAnimado(["endometriose", "TPM"], "saude_mulher"), /^endometriose: o mecanismo/);
  assert.match(temaDoReelAnimado([], "saude_integrativa"), /^saude integrativa: o mecanismo/);
});

test("o reel animado não cai no mesmo dia do reel de b-roll", () => {
  assert.equal(diaDoReelAnimado([1, 3, 5]), 3);
  assert.equal(diaDoReelAnimado([2]), 2);
});

test("ligação: o domingo pede o reel animado JUNTO com o de b-roll, com legenda e post", () => {
  const s = fonte("./semanal.ts");
  assert.match(s, /enfileirarVideoDoReel\(/);
  assert.match(s, /produzirReelAnimado\(admin,[\s\S]*?postId,[\s\S]*?comLegenda: true/);
});

test("teto de 1 minuto no reel animado: agente, motor e botão manual", () => {
  const lib = fonte("../conteudo/reel-animado.ts");
  assert.match(lib, /const DUR_MAX_TOTAL_S = 60;/);
  assert.match(lib, /TETO DE 60 SEGUNDOS/);
  assert.doesNotMatch(lib, /"90s"/);
  const motor = fonte("../../../../../packages/reel-engine/engine/build.py");
  assert.match(motor, /DUR_MAX_TOTAL = 60\.0/);
  const tela = fonte("../../app/dashboard/conteudo/ReelAnimadoSection.tsx");
  assert.doesNotMatch(tela, /value="90s"/);
  const wf = fonte("../../../../../.github/workflows/render-reel.yml");
  assert.match(wf, /post_id:/);
  assert.match(wf, /posts_agendados\?id=eq\.\$\{\{ inputs\.post_id \}\}/);
});
