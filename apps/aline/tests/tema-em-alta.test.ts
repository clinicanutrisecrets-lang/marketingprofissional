import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  agendamentoDoDia, gravarTemaEmAlta, legendaProvisoria, segundaDaSemana,
  temaEmAltaDoPost, validarPauta, validarTemaDigitado, MOLDE_TEMA_EM_ALTA,
} from "../src/lib/arte-post/tema-em-alta.ts";
import { capaDoPost, legendaEhEsqueleto } from "../src/lib/arte-post/molde.ts";

const ler = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const TEMA = "A Netflix lançou um documentário sobre intestino e todo mundo está comentando.";

test("o tema em alta vai e volta pela coluna prompt_usado", () => {
  assert.equal(temaEmAltaDoPost(gravarTemaEmAlta(TEMA)), TEMA);
  assert.equal(temaEmAltaDoPost("outro prompt qualquer"), null);
  assert.equal(temaEmAltaDoPost(null), null);
});

test("a legenda provisória tem a capa na 1ª linha e é esqueleto (a montagem troca)", () => {
  const l = legendaProvisoria("Viu o documentário do intestino?", TEMA);
  assert.equal(capaDoPost(l), "Viu o documentário do intestino?");
  assert.equal(legendaEhEsqueleto(l), true);
});

test("tema digitado: curto recusa, normal passa", () => {
  assert.equal(validarTemaDigitado("netflix").ok, false);
  assert.equal(validarTemaDigitado(TEMA).ok, true);
});

test("pauta: recusa travessão, IA e capa longa", () => {
  assert.equal(validarPauta({ capa: "Viu o documentário? — leia", assunto: "microbiota" }).ok, false);
  assert.equal(validarPauta({ capa: "A IA do intestino", assunto: "microbiota" }).ok, false);
  assert.equal(validarPauta({ capa: "x".repeat(91), assunto: "microbiota" }).ok, false);
  assert.equal(validarPauta({ capa: "Viu o documentário do intestino?", assunto: "microbiota intestinal" }).ok, true);
});

test("dia vira 18h30 de Brasília e a semana é a segunda", () => {
  assert.equal(agendamentoDoDia("2026-10-20"), "2026-10-20T21:30:00.000Z");
  assert.equal(agendamentoDoDia("20/10"), null);
  assert.equal(segundaDaSemana("2026-10-22"), "2026-10-19");
  assert.equal(segundaDaSemana("2026-10-19"), "2026-10-19");
  assert.equal(segundaDaSemana("2026-10-25"), "2026-10-19");
});

test("o molde trata o tema como gancho, nunca como fonte", () => {
  assert.match(MOLDE_TEMA_EM_ALTA, /gancho, não fonte/);
  assert.match(MOLDE_TEMA_EM_ALTA, /Não diga que assistiu/);
  assert.doesNotMatch(MOLDE_TEMA_EM_ALTA, /[—–]/);
});

test("a montagem da arte usa o molde do tema em alta e não busca receita", () => {
  const a = ler("../src/lib/arte-post/actions.ts");
  assert.match(a, /temaEmAlta \? MOLDE_TEMA_EM_ALTA : MOLDE_SETE_PASSOS/);
  assert.match(a, /const ehReceita = !temaEmAlta &&/);
  assert.match(a, /prompt_usado: gravarTemaEmAlta\(/);
  assert.match(a, /export async function criarPostTemaEmAlta/);
});

test("o feed tem o formulário do tema em alta", () => {
  const p = ler("../src/app/perfis/[slug]/feed/page.tsx");
  assert.match(p, /<TemaEmAltaForm /);
});
