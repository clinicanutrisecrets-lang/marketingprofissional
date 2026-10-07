import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aplicarTemaEmAlta, escolherTemaEmAlta, indiceDoSlotTemaEmAlta } from "./tema-em-alta.ts";

// Temas reais de saude_feminina, 07/10/2026 (ordem de relevância).
const TENDENCIAS = [
  { tema: "DIU hormonal agora coberto por planos: o que muda para quem trata endometriose", resumo: null },
  { tema: "Terapia hormonal na menopausa: além dos fogachos, proteção óssea real", resumo: "x" },
];

const SLOTS = [
  { tipo: "feed_imagem", angulo: "dor_do_paciente", consciencia: "inconsciente", papel: "Reconhecer.", instrucao: "MATERIAL A" },
  { tipo: "feed_carrossel", angulo: "educativo_ciencia", consciencia: "consciente_problema", papel: "Mecanismo.", instrucao: "MATERIAL B" },
  { tipo: "feed_imagem", angulo: "divulgacao_produto", consciencia: "consciente_produto", papel: "Teste.", instrucao: "MATERIAL C" },
  { tipo: "stories", angulo: "bastidor_da_nutri", consciencia: "inconsciente", papel: "Stories.", instrucao: "S" },
];

test("o tema em alta vira o assunto obrigatório de UM post de conteúdo", () => {
  const tema = escolherTemaEmAlta(TENDENCIAS, null);
  const { slots, usado } = aplicarTemaEmAlta(SLOTS, tema);
  assert.equal(usado?.tema, TENDENCIAS[0]!.tema);
  assert.match(slots[0]!.instrucao, /ASSUNTO OBRIGATÓRIO/);
  assert.match(slots[0]!.instrucao, /MATERIAL A/);
  assert.match(slots[0]!.papel, /^Tema em alta: DIU/);
  // só um post muda, e nunca a oferta nem o stories
  assert.equal(slots.filter((s) => /Tema em alta/.test(s.papel)).length, 1);
  assert.equal(slots[2]!.instrucao, "MATERIAL C");
  assert.equal(slots[3]!.instrucao, "S");
  assert.equal(SLOTS[0]!.instrucao, "MATERIAL A"); // não muta a lista de quem chamou
});

test("tema que bate no 'não atende' é pulado; sem tema, nada muda", () => {
  const tema = escolherTemaEmAlta(TENDENCIAS, "endometriose, gestantes");
  assert.match(tema!.tema, /^Terapia hormonal/);
  assert.equal(escolherTemaEmAlta(TENDENCIAS, "endometriose, menopausa"), null);
  const { slots, usado } = aplicarTemaEmAlta(SLOTS, null);
  assert.equal(usado, null);
  assert.equal(slots, SLOTS);
});

test("só oferta e stories: nenhum post recebe o tema", () => {
  assert.equal(indiceDoSlotTemaEmAlta([SLOTS[2]!, SLOTS[3]!]), -1);
});

test("a geração semanal aplica o tema e o prompt geral não manda mais 'não force'", () => {
  const src = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.match(src, /aplicarTemaEmAlta\(/);
  assert.match(src, /escolherTemaEmAlta\(/);
  assert.doesNotMatch(src, /TEMAS EM ALTA HOJE NO NICHO/);
});
