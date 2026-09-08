import { test } from "node:test";
import assert from "node:assert/strict";
import { codigoDoLink } from "../src/lib/automacao/checar-post-link.ts";

test("lê post, reel e tv, com e sem barra final", () => {
  assert.equal(codigoDoLink("https://www.instagram.com/p/C8xYz_1aBcD/"), "C8xYz_1aBcD");
  assert.equal(codigoDoLink("https://instagram.com/reel/DAbC-123xyz"), "DAbC-123xyz");
  assert.equal(codigoDoLink("https://www.instagram.com/reels/DAbC123xyz/"), "DAbC123xyz");
  assert.equal(codigoDoLink("https://www.instagram.com/tv/CAbC123xyz/"), "CAbC123xyz");
});

test("lê link com o perfil no meio, que é como o app copia", () => {
  assert.equal(codigoDoLink("https://www.instagram.com/nutri_secrets/p/C8xYz_1aBcD/"), "C8xYz_1aBcD");
});

test("ignora o rastreamento que o Instagram cola no fim", () => {
  assert.equal(codigoDoLink("https://www.instagram.com/p/C8xYz_1aBcD/?igsh=MXY4bTk&img_index=1"), "C8xYz_1aBcD");
});

test("aceita o código sozinho", () => {
  assert.equal(codigoDoLink("C8xYz_1aBcD"), "C8xYz_1aBcD");
});

test("devolve null pro que não é link de post", () => {
  assert.equal(codigoDoLink("https://www.instagram.com/nutri_secrets/"), null);
  assert.equal(codigoDoLink(""), null);
  assert.equal(codigoDoLink("me manda o post"), null);
});
