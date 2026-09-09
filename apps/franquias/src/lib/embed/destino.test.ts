/**
 * Trava do `?next=` do SSO: só destino interno das áreas logadas passa.
 * Redirect aberto num receptor de SSO vira phishing com cara de oficial —
 * por isso qualquer forma de sair do domínio é descartada, e cai no padrão.
 *
 * Roda sem instalar nada: `node --experimental-strip-types --test src/lib/embed/destino.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoSeguro, pediuEmbed } from "./destino.ts";

test("aceita caminho interno das áreas logadas, com query e hash", () => {
  assert.equal(destinoSeguro("/dashboard"), "/dashboard");
  assert.equal(destinoSeguro("/dashboard/conteudo"), "/dashboard/conteudo");
  assert.equal(
    destinoSeguro("/dashboard/posts-venda?produto=teste_genetico"),
    "/dashboard/posts-venda?produto=teste_genetico",
  );
  assert.equal(destinoSeguro("/onboarding"), "/onboarding");
  assert.equal(destinoSeguro("  /dashboard/aprovar#topo "), "/dashboard/aprovar#topo");
});

test("🔴 recusa tudo que poderia sair do domínio ou trocar de esquema", () => {
  for (const ruim of [
    "//evil.com/dashboard",
    "https://evil.com",
    "http://app.scannerdasaude.com/dashboard",
    "/\\evil.com",
    "/javascript:alert(1)",
    "dashboard",
    "/admin",
    "/dashboardx",
    "/login",
    "",
    null,
    undefined,
  ]) {
    assert.equal(destinoSeguro(ruim), null, `"${ruim}" deveria ser recusado`);
  }
});

test("embed só liga com 1/true", () => {
  assert.equal(pediuEmbed("1"), true);
  assert.equal(pediuEmbed("true"), true);
  assert.equal(pediuEmbed("TRUE"), true);
  for (const v of ["0", "false", "", null, undefined, "sim"]) assert.equal(pediuEmbed(v), false);
}
);
