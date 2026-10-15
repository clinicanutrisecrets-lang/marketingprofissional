/**
 * Slides do Carrossel por tema (Scanner) na Minha galeria daqui.
 * `node --experimental-strip-types --test src/lib/galeria/scanner.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  caminhoSlide,
  caminhoPertence,
  arquivoServe,
  tituloDoSlide,
  pastaENome,
  PASTA_CARROSSEL,
} from "./scanner.ts";

const F = "09b807b9-e3cf-418b-85cc-14967bdec06b";
const OUTRA = "11111111-2222-3333-4444-555555555555";

test("o caminho do slide fica dentro da pasta da franqueada", () => {
  const p = caminhoSlide(F, 3, 1760000000000);
  assert.equal(p, `${F}/${PASTA_CARROSSEL}/1760000000000_slide03.png`);
  assert.equal(caminhoPertence(F, p), true);
  assert.deepEqual(pastaENome(p), { pasta: `${F}/${PASTA_CARROSSEL}`, nome: "1760000000000_slide03.png" });
});

test("🔴 caminho de outra conta, fora da pasta ou com truque não passa", () => {
  const deOutra = caminhoSlide(OUTRA, 1, 1760000000000);
  assert.equal(caminhoPertence(F, deOutra), false);
  for (const ruim of [
    `${F}/editor/1760000000000.png`,
    `${F}/${PASTA_CARROSSEL}/../${OUTRA}/x.png`,
    `${F}/${PASTA_CARROSSEL}/1760000000000_slide01.png.exe`,
    `/${F}/${PASTA_CARROSSEL}/1760000000000_slide01.png`,
    "",
  ]) assert.equal(caminhoPertence(F, ruim), false, ruim);
});

test("🔴 confirmação recusa arquivo que não chegou, vazio, grande ou que não é imagem", () => {
  assert.ok(arquivoServe(null));
  assert.ok(arquivoServe({ size: 0, mimetype: "image/png" }));
  assert.ok(arquivoServe({ size: 50 * 1024 * 1024, mimetype: "image/png" }));
  assert.ok(arquivoServe({ size: 1000, mimetype: "application/pdf" }));
  assert.equal(arquivoServe({ size: 900_000, mimetype: "image/png" }), null);
});

test("título do card da galeria", () => {
  assert.equal(tituloDoSlide("  Por que o inchaço piora  ", 2, 10), "Por que o inchaço piora (slide 2/10)");
  assert.equal(tituloDoSlide("", 1, 1), "Carrossel por tema (slide 1/1)");
});

test("🔴 a rota lê o erro do insert e confere dono e arquivo antes de gravar", () => {
  const rota = readFileSync(new URL("../../app/api/integrations/scanner/galeria/route.ts", import.meta.url), "utf8");
  assert.match(rota, /assinaturaConfere/);
  assert.match(rota, /caminhoPertence\(/);
  assert.match(rota, /arquivoServe\(/);
  assert.match(rota, /error: erroInsert \}[\s\S]*if \(erroInsert/);
  assert.match(rota, /createSignedUploadUrl/);
});

test("🔴 o Carrossel por tema abre DENTRO do Posts e Conteúdo, não na página solta", () => {
  const url = readFileSync(new URL("../scanner-url.ts", import.meta.url), "utf8");
  assert.match(url, /\/nutri\/marketing\/posts\?abrir=carrossel/);
  assert.doesNotMatch(url, /\/nutri\/conteudo\/carrossel/);
  const menu = readFileSync(new URL("../../app/dashboard/SidebarNav.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(menu, /\/nutri\/conteudo\/carrossel/);
});
