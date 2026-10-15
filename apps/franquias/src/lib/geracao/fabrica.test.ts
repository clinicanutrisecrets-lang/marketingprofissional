import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  sintomasDoNicho,
  genesDoNicho,
  tituloDetetive,
  personalizacaoFabrica,
  LEGENDA_FABRICA,
  LEMBRETE_FABRICA,
  SINTOMAS_DO_MOLDE,
} from "./fabrica.ts";

// Queixas reais do questionário (franqueadas.publico_briefing, 15/10/2026).
const VIVIANE = ["Composição corporal e peso", "Modulação hormonal feminina", "Cuidado intestinal e microbiota", "Energia, sono e fadiga"];
const GLERYSTON = ["Composição corporal e peso", "Energia, sono e fadiga", "Inflamação e dor", "Longevidade e prevenção", "Cuidado neuroendócrino (ansiedade, foco, humor)"];

test("fábrica: os genes saem do nicho dela, na ordem do questionário", () => {
  assert.deepEqual(genesDoNicho(VIVIANE).map((g) => g.gene), ["FTO", "CYP1B1", "FUT2"]);
  assert.deepEqual(genesDoNicho(GLERYSTON).map((g) => g.gene), ["FTO", "CLOCK", "IL6"]);
});

test("fábrica: gene nunca repete, e sem questionário vem o padrão", () => {
  const g = genesDoNicho(["Energia, sono e fadiga", "insônia", "Fase reprodutiva", "Gestação e pós-parto"]);
  assert.deepEqual(g.map((x) => x.gene), ["CLOCK", "MTHFR", "FTO"]);
  assert.equal(genesDoNicho([]).length, 3);
});

test("fábrica: o slide do gene fala só da função, nunca de letra de risco", () => {
  const todos = [...genesDoNicho(VIVIANE), ...genesDoNicho(GLERYSTON), ...genesDoNicho(["tireoide", "colesterol", "treino", "pele"])];
  for (const g of todos) assert.doesNotMatch(g.funcao, /\b[ACGT]{1,2}\b|risco|alelo/);
});

test("fábrica: 5 sintomas, os do nicho primeiro e completados pelo molde", () => {
  const s = sintomasDoNicho(VIVIANE);
  assert.equal(s.length, 5);
  assert.equal(s[0], "peso que não sai do lugar");
  assert.ok(s.includes("TPM e ciclo desregulado"));
  assert.deepEqual(sintomasDoNicho([]), [...SINTOMAS_DO_MOLDE]);
  // Não repete "peso" com a versão do molde.
  assert.equal(sintomasDoNicho(["peso"]).filter((x) => x.startsWith("peso")).length, 1);
});

test("fábrica: 'a sua Detetive' só com nome claramente feminino; nunca adivinha o masculino", () => {
  assert.equal(tituloDetetive("Viviane Tavares"), "a sua Detetive da Saúde");
  assert.equal(tituloDetetive("Juliana Mendes"), "a sua Detetive da Saúde");
  assert.equal(tituloDetetive("Dra. Aline Quissak"), "a sua Detetive da Saúde");
  assert.equal(tituloDetetive("Gleryston Agra de Mello"), "Detetive da Saúde");
  assert.equal(tituloDetetive(null), "Detetive da Saúde");
  assert.doesNotMatch(tituloDetetive("Gleryston"), /\bo seu\b/);
});

test("fábrica: personalização valida cor e só aceita imagem https", () => {
  const p = personalizacaoFabrica({
    nome: "Viviane", handle: "@@vivi.nutri", corPrimaria: "#893444", corSecundaria: "lixo",
    textosDoPublico: VIVIANE, logo: "http://x/logo.png", foto: "https://x/foto.jpg",
  });
  assert.equal(p.handle, "@vivi.nutri");
  assert.equal(p.secundaria, "#893444");
  assert.equal(p.logo, null);
  assert.equal(p.foto, "https://x/foto.jpg");
});

test("fábrica: textos sem travessão nem IA, e o lembrete explica a 2ª sugestão de fixar", () => {
  for (const t of [LEGENDA_FABRICA, LEMBRETE_FABRICA]) {
    assert.doesNotMatch(t, /—|\bIA\b/);
  }
  assert.match(LEMBRETE_FABRICA, /semana passada/i);
  assert.match(LEMBRETE_FABRICA, /Fixar no perfil/);
});

test("fábrica: entra só depois do 1º post fixo, uma vez, e ligada no pacote da semana", () => {
  const mont = readFileSync(new URL("./fabrica-da-semana.ts", import.meta.url), "utf8");
  assert.match(mont, /\.eq\("papel_estrategia", PAPEL_POST_FIXO\)\s*\n\s*\.lt\("semana_ref", semanaRef\)/);
  assert.match(mont, /\.eq\("papel_estrategia", PAPEL_FABRICA\)\s*\n\s*\.not\("status", "in", "\(erro,cancelado\)"\)/);
  const semanal = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.ok(semanal.indexOf("montarFabricaDaSemana(") > semanal.indexOf("montarPostFixoDaSemana({"));
  assert.ok(existsSync(new URL("../../../public/fabrica/carrossel.html", import.meta.url)));
  assert.ok(existsSync(new URL("../../../../../.github/workflows/render-carrossel-fabrica.yml", import.meta.url)));
});

test("fábrica: o molde ainda tem os textos que o desenhador troca", () => {
  const molde = readFileSync(new URL("../../../public/fabrica/carrossel.html", import.meta.url), "utf8");
  for (const s of SINTOMAS_DO_MOLDE) assert.ok(molde.includes(s), s);
  assert.ok(molde.includes("a sua Detetive da Saúde"));
  assert.ok(molde.includes("@seuperfil"));
  assert.ok(molde.includes("carrossel-foto-profissional"));
});
