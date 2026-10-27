import { test } from "node:test";
import assert from "node:assert/strict";
import { enderecoDeDownload, nomeArquivoSeguro, urlArtePermitida } from "./arte-download.ts";

// 27/10/2026: dentro do Scanner (iframe) o download por blob morria calado.
// O botão passa a apontar pra rota do próprio Marketing, que só pode buscar
// arte do Storage do Marketing (senão vira proxy aberto).

const SUPA = "https://mfldshdxulqxskwcoxrl.supabase.co";
const ARTE = `${SUPA}/storage/v1/object/sign/franqueadas-assets/x/slide-1.png?token=abc`;

test("aceita só arte do Storage do Marketing", () => {
  assert.equal(urlArtePermitida(ARTE, SUPA), true);
  assert.equal(urlArtePermitida(`${SUPA}/storage/v1/object/public/nutri-assets/l.jpg`, SUPA), true);
  assert.equal(urlArtePermitida("https://evil.com/storage/v1/object/x.png", SUPA), false);
  assert.equal(urlArtePermitida(`${SUPA}/rest/v1/franqueadas`, SUPA), false);
  assert.equal(urlArtePermitida(`http://mfldshdxulqxskwcoxrl.supabase.co/storage/v1/object/x.png`, SUPA), false);
  assert.equal(urlArtePermitida("lixo", SUPA), false);
  assert.equal(urlArtePermitida(ARTE, undefined), false);
});

test("o botão aponta pra rota do próprio domínio, com o link e o nome", () => {
  const e = enderecoDeDownload(ARTE, "feed-carrossel-2026-10-27-slide-01.png");
  assert.match(e, /^\/api\/arte\/baixar\?u=/);
  assert.equal(new URLSearchParams(e.split("?")[1]).get("u"), ARTE);
  assert.equal(new URLSearchParams(e.split("?")[1]).get("n"), "feed-carrossel-2026-10-27-slide-01.png");
});

test("arte guardada no próprio app baixa direto", () => {
  assert.equal(enderecoDeDownload("/videos-marca/fut2.jpg", "x.jpg"), "/videos-marca/fut2.jpg");
  assert.match(enderecoDeDownload("//evil.com/x.png", "x.png"), /^\/api\/arte\/baixar/);
});

test("nome de arquivo seguro pro cabeçalho", () => {
  assert.equal(nomeArquivoSeguro('stôry "03"/../x.jpg'), "story-03-..-x.jpg");
  assert.equal(nomeArquivoSeguro(""), "arte.png");
  assert.equal(nomeArquivoSeguro(null), "arte.png");
});
