/**
 * Travas do revisor da arte (Aline, 19/10/2026). O caso que originou: o
 * pacote de 18/10 com a foto cortada (o braço do sofá, a cerca, só o cabelo).
 *
 *   node --experimental-strip-types --test apps/franquias/src/lib/revisor-arte/regras.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { achadosDoOlhar, achadosMecanicos, decidirAcao, validarOlhar, type OlharArte } from "./regras.ts";

const BOA: OlharArte = {
  pessoa_cortada: false,
  parte_sem_sentido: false,
  texto_legivel: true,
  texto_cortado: false,
  foto_combina: true,
  o_que_a_foto_mostra: "nutricionista na cozinha",
  erros_portugues: [],
  nota: 5,
  problema_principal: "",
};

test("arte boa: nada a fazer", () => {
  const a = achadosDoOlhar(BOA);
  assert.deepEqual(a, []);
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: true }), "ok");
});

test("o braço do sofá (recorte sem sentido) manda refazer sem foto", () => {
  const a = achadosDoOlhar({ ...BOA, parte_sem_sentido: true, o_que_a_foto_mostra: "braço de um sofá" });
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: true }), "refazer_sem_foto");
});

test("só o cabelo (pessoa cortada) manda refazer sem foto", () => {
  const a = achadosDoOlhar({ ...BOA, pessoa_cortada: true });
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: true }), "refazer_sem_foto");
});

test("texto cortado ou ilegível também é grave", () => {
  assert.equal(decidirAcao(achadosDoOlhar({ ...BOA, texto_cortado: true }), { temFoto: true, podeRefazer: true }), "refazer_sem_foto");
  assert.equal(decidirAcao(achadosDoOlhar({ ...BOA, texto_legivel: false }), { temFoto: true, podeRefazer: true }), "refazer_sem_foto");
});

test("sem o texto da arte não refaz: vira aviso", () => {
  const a = achadosDoOlhar({ ...BOA, pessoa_cortada: true });
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: false }), "sinalizar");
});

test("arte sem foto nunca é refeita (não tem o que cortar)", () => {
  const a = achadosDoOlhar({ ...BOA, texto_legivel: false });
  assert.equal(decidirAcao(a, { temFoto: false, podeRefazer: true }), "sinalizar");
});

test("o kit que não parece teste de DNA é aviso, não refação", () => {
  const a = achadosDoOlhar({ ...BOA, foto_combina: false, o_que_a_foto_mostra: "caixa fechada" });
  assert.equal(a[0]?.regra, "foto_nao_combina");
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: true }), "sinalizar");
});

test("o texto DA ARTE passa pelo revisor da copy", () => {
  const a = achadosMecanicos({ pecas: [{ headline: "Esse protocolo cura a inflamação", subtitle: "feito com IA" }] });
  const regras = a.map((x) => x.regra);
  assert.ok(regras.includes("arte_cura"), regras.join(","));
  assert.ok(regras.includes("arte_ia"), regras.join(","));
});

test("desenho de reserva vira aviso pro time", () => {
  const a = achadosMecanicos({ pecas: [{ headline: "Seu corpo é uma fábrica" }], desenhoReserva: true });
  assert.deepEqual(a.map((x) => x.regra), ["desenho_reserva"]);
  assert.equal(decidirAcao(a, { temFoto: true, podeRefazer: true }), "sinalizar");
});

test("leitura torta do modelo é descartada", () => {
  assert.equal(validarOlhar({ pessoa_cortada: "sim" }), null);
  assert.equal(validarOlhar(null), null);
  const ok = validarOlhar({ ...BOA, nota: 9, erros_portugues: [{ escrito: "voce", correto: "você" }] });
  assert.equal(ok?.nota, 5);
  assert.deepEqual(ok?.erros_portugues, ["voce → você"]);
});

test("erro de português sem correção diferente é descartado (o caso 'cansaço')", () => {
  const ok = validarOlhar({
    ...BOA,
    erros_portugues: [{ escrito: "cansaço", correto: "cansaço" }, "cansaço", { escrito: "saude" }],
  });
  assert.deepEqual(ok?.erros_portugues, []);
});
