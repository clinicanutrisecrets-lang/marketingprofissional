import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDeadlineAproximando, emailSemanaProntaAprovacao } from "./templates.ts";

// Aline, 06/11/2026: o app não publica nada por ninguém (não tem a permissão
// da Meta). A nutri aprova, baixa a arte, copia a legenda e posta ela mesma.
const PROMESSA = /publicamos|public(a|ado|ados)? (automaticamente|sozinh|do jeito que est)|publicação automática|sai(em)? mesmo sem|sai logo em seguida|depois do prazo,? public/i;

for (const [nome, tpl] of [
  ["semana pronta", emailSemanaProntaAprovacao("Marina", 8, "https://x/aprovar", "domingo, 22h")],
  ["prazo chegando", emailDeadlineAproximando("Marina", 5, "https://x/aprovar")],
] as const) {
  test(`e-mail ${nome}: não promete publicar sem aprovação`, () => {
    for (const parte of [tpl.html, tpl.texto, tpl.assunto]) {
      assert.doesNotMatch(parte, PROMESSA);
      assert.doesNotMatch(parte, /—|\bIA\b/);
    }
    assert.match(tpl.html, /baix(e|ar) as artes/);
    assert.match(tpl.html, /post(e|ar) no seu Instagram/);
  });
}
