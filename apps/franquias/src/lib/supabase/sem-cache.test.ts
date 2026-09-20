/**
 * Trava do "Marketing fora do ar" de 11/09/2026: nenhuma chamada à Supabase
 * pode passar pelo Data Cache do Next 14. `force-dynamic` não desliga esse
 * cache, e o magic link do SSO cacheado fazia a segunda entrada de toda nutri
 * falhar com "Email link is invalid or has expired" (47 falhas, 4 pessoas).
 *
 * É teste de FONTE, de propósito: o defeito é uma opção de fetch que nenhum
 * teste de unidade de função pura enxerga.
 *
 * Roda sem instalar nada: `node --experimental-strip-types --test src/lib/supabase/sem-cache.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "..", "..");
const server = readFileSync(join(raiz, "lib/supabase/server.ts"), "utf8");
const sso = readFileSync(join(raiz, "app/sso/route.ts"), "utf8");

test("os dois clients da Supabase saem com fetch sem cache", () => {
  assert.match(server, /cache:\s*"no-store"/, "o wrapper de fetch precisa forçar no-store");
  const clients = server.match(/createServerClient<Database>\(/g) ?? [];
  const comWrapper = server.match(/global:\s*\{\s*fetch:\s*fetchSemCache\s*\}/g) ?? [];
  assert.equal(clients.length, 2, "esperava exatamente os dois clients (sessão e admin)");
  assert.equal(comWrapper.length, clients.length, "todo client precisa passar o fetch sem cache");
});

test("🔴 /sso declara fetchCache = force-no-store (force-dynamic sozinho não basta)", () => {
  assert.match(sso, /export const dynamic = "force-dynamic"/);
  assert.match(sso, /export const fetchCache = "force-no-store"/);
});

test("/sso tenta um hash novo antes de trancar a nutri do lado de fora", () => {
  const geracoes = sso.match(/admin\.auth\.admin\.generateLink\(/g) ?? [];
  const verificacoes = sso.match(/supabase\.auth\.verifyOtp\(/g) ?? [];
  assert.equal(geracoes.length, 2, "generateLink: a de sempre + a segunda chance");
  assert.equal(verificacoes.length, 2, "verifyOtp: a de sempre + a segunda chance");
  assert.ok(sso.indexOf("generateLink(") < sso.indexOf("verifyOtp("), "gera antes de verificar");
});
