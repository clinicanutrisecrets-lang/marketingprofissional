import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { caminhoDaGaleriaValido, nomeDoSlide, MAX_SLIDES_GALERIA } from "./galeria-scanner-regras.ts";

const F = "11111111-2222-3333-4444-555555555555";
const ler = (p: string) => readFileSync(join(import.meta.dirname, p), "utf8");

test("carrossel do Scanner: o caminho do slide é da conta e ordenável", () => {
  assert.equal(nomeDoSlide(F, 1794000000000, 0), `${F}/carrossel/1794000000000_slide01.png`);
  assert.equal(nomeDoSlide(F, 1794000000000, 9), `${F}/carrossel/1794000000000_slide10.png`);
});

test("só confirma caminho que este app deu para ESTA conta", () => {
  assert.ok(caminhoDaGaleriaValido(F, nomeDoSlide(F, 1794000000000, 2)));
  assert.ok(!caminhoDaGaleriaValido("99999999-2222-3333-4444-555555555555", nomeDoSlide(F, 1794000000000, 2)), "outra conta");
  assert.ok(!caminhoDaGaleriaValido(F, `${F}/editor/1794000000000_slide01.png`), "outra pasta");
  assert.ok(!caminhoDaGaleriaValido(F, `${F}/carrossel/../x/1794000000000_slide01.png`), "subindo pasta");
  assert.ok(MAX_SLIDES_GALERIA >= 10);
});

test("rota: assinatura antes de tudo, mesmo segredo do conteudo-pronto, sem conta não é erro", () => {
  const rota = ler("../../app/api/integrations/scanner/galeria/route.ts");
  assert.ok(rota.indexOf("assinaturaConfere(") < rota.indexOf("JSON.parse("));
  assert.match(rota, /SCANNER_WEBHOOK_SECRET/);
  assert.match(rota, /semConta: true/);
});

test("galeria: grava com error checado e confere que os slides chegaram", () => {
  const lib = ler("galeria-scanner.ts");
  assert.match(lib, /caminhoDaGaleriaValido\(franqueadaId, p\)/);
  assert.match(lib, /slide\(s\) não chegaram/);
  assert.match(lib, /const \{ error \} = await admin\.from\("artes_geradas"\)\.insert/);
});
