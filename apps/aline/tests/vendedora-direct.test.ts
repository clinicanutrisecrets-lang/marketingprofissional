/**
 * A vendedora do direct (Aline, 06/11/2026): conversa como a Sofia, com os
 * fatos SÓ do catálogo que o Scanner monta da loja.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ia = readFileSync(new URL("../src/lib/automacao/ia.ts", import.meta.url), "utf8");
const proc = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
const sim = readFileSync(new URL("../src/lib/automacao/simulador.ts", import.meta.url), "utf8");
const cat = readFileSync(new URL("../src/lib/automacao/scanner-conhecimento.ts", import.meta.url), "utf8");

test("sem catálogo ela não fala preço nem link de compra, manda pra Helô", () => {
  const i = ia.indexOf("export function blocoVendedora");
  const trecho = ia.slice(i, i + 900);
  assert.match(trecho, /NÃO diga preço, condição nem link de compra de cabeça/);
  assert.match(trecho, /wa\.me\/5541998702966/);
});

test("com catálogo: descobre antes de oferecer, nunca inventa desconto, copia o link", () => {
  assert.match(ia, /Descubra antes de oferecer/);
  assert.match(ia, /NUNCA invente desconto, bônus, brinde, prazo, vaga ou escassez/);
  assert.match(ia, /Copie o link exatamente do catálogo/);
  assert.match(ia, /Nunca fale do Básico/);
});

test("o catálogo entra no prompt do direct e no simulador", () => {
  assert.match(proc, /buscarCatalogoScanner\(\)/);
  assert.match(proc, /catalogo, textoEncaminharHumano/);
  assert.match(sim, /buscarCatalogoScanner\(\)/);
  assert.match(sim, /catalogo, textoEncaminharHumano/);
});

test("o simulador testa a vendedora mesmo com a chave desligada, e avisa", () => {
  assert.ok(!sim.includes("Nada: nenhuma regra casou e a chave 'responder direct' está desligada."));
  assert.match(sim, /no ar, esta resposta NÃO sairia/);
});

test("o preço vem do Scanner, não de lista guardada no Estúdio", () => {
  assert.match(cat, /\/api\/integrations\/marketing\/catalogo/);
  assert.ok(!/R\$ ?3\.500|R\$ ?960|R\$ ?2\.497/.test(ia), "preço escrito no prompt envelhece calado");
});
