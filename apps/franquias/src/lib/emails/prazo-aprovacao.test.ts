import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDeadlineAproximando, emailSemanaProntaAprovacao } from "./templates.ts";

// Aline, 06/11/2026: o e-mail prometia publicar sozinho depois do prazo, e o
// sistema não faz isso. Post só vai pra publicação depois que ela aprova; se o
// prazo passa, ele continua esperando em Aprovar semana.
const PROMESSA = /public(amos|a|ado|ados)? (automaticamente|do jeito que est)|sai(em)? mesmo sem|depois do prazo,? public/i;

for (const [nome, tpl] of [
  ["semana pronta", emailSemanaProntaAprovacao("Marina", 8, "https://x/aprovar", "domingo, 22h")],
  ["prazo chegando", emailDeadlineAproximando("Marina", 5, "https://x/aprovar")],
] as const) {
  test(`e-mail ${nome}: não promete publicar sem aprovação`, () => {
    for (const parte of [tpl.html, tpl.texto, tpl.assunto]) {
      assert.doesNotMatch(parte, PROMESSA);
      assert.doesNotMatch(parte, /—|\bIA\b/);
    }
    assert.match(tpl.html, /Nada é publicado sem a sua aprovação|Nada é publicado sem ela/);
  });
}
