import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  nomeDaConsulta,
  regraConsultaInclui,
  slidesDaConsulta,
  tituloECorpo,
  FOTOS_COLETA,
  FOTOS_CONSULTA,
} from "./consulta-teste.ts";
import { planoDaJornada, semanaDaJornada } from "./jornada.ts";
import { revisarCopy } from "../claude/revisor-copy.ts";

// Linhas REAIS de produtos_scanner (14/10/2026).
const DAIANE = {
  nome: "DNA 360",
  scanner_produto_id: "teste_genetico",
  checkout_url: "https://tratamentos.scannerdasaude.com/daiane-pianura/daiane-pianura-consulta-nutrigenetica/checkout",
};
const MARIANA = {
  nome: "DNA 360",
  scanner_produto_id: "teste_genetico",
  checkout_url: "https://tratamentos.scannerdasaude.com/mariana/mariana-dna-360/checkout",
};
const EPI = {
  nome: "Teste Epigenético",
  scanner_produto_id: "teste_epigenetico",
  checkout_url: "https://tratamentos.scannerdasaude.com/mariana/mariana-epigenetico/checkout",
};

test("o nome do post é o da CONSULTA, e o link decide quando o catálogo guardou o nome do produto", () => {
  assert.equal(nomeDaConsulta(DAIANE), "Consulta Nutrigenética");
  assert.equal(nomeDaConsulta(MARIANA), "DNA 360");
  assert.equal(nomeDaConsulta(EPI), "Consulta Epigenética");
});

test("a regra: consulta, palavra INCLUI, correlação e as duas formas de coleta", () => {
  for (const p of [DAIANE, MARIANA, EPI]) {
    const r = regraConsultaInclui(p);
    assert.match(r, /nunca o teste/);
    assert.match(r, /inclui/);
    assert.match(r, /correla/i);
    assert.match(r, /presencial/);
    assert.match(r, /online/);
    assert.match(r, /Brasil/);
    assert.ok(!/—/.test(r), "sem travessão");
  }
  assert.match(regraConsultaInclui(MARIANA), /acompanhamento que começa pela consulta nutrigenética/);
});

test("título e corpo: quebra de linha manda, senão a 1ª frase curta", () => {
  assert.deepEqual(tituloECorpo("Gene, exame e sintoma na mesma mesa.\nEu leio cada variante junto dos seus exames."), {
    titulo: "Gene, exame e sintoma na mesma mesa.",
    corpo: "Eu leio cada variante junto dos seus exames.",
  });
  assert.deepEqual(tituloECorpo("Um gene alterado não diz o que fazer. Quem decide é a correlação."), {
    titulo: "Um gene alterado não diz o que fazer.",
    corpo: "Quem decide é a correlação.",
  });
});

const TEXTOS = [
  "O seu DNA não é a resposta. A leitura dele é.\nUma consulta para cruzar o teste com os seus exames.",
  "Um gene alterado, sozinho, não diz o que fazer.\nO mesmo resultado pede condutas diferentes.",
  "Gene, exame e sintoma na mesma mesa.\nEu leio cada variante junto dos seus exames.",
  "A coleta é simples.\nNa consulta presencial a coleta é feita ali; na online o kit vai pra sua casa.",
  "O que você leva.\nA leitura, a correlação, as prioridades e o plano.",
  "A consulta inclui o teste nutrigenético.\nO link está na bio.",
];

test("capa com foto de CONSULTA; slide da coleta com foto de coleta só no genético", () => {
  const g = slidesDaConsulta(TEXTOS, DAIANE);
  assert.equal(g[0]!.tipo, "capa");
  assert.ok((FOTOS_CONSULTA as readonly string[]).includes(g[0]!.fotoNome!));
  assert.equal(g.at(-1)!.tipo, "fecho");
  assert.ok((FOTOS_COLETA as readonly string[]).includes(g[3]!.fotoNome!), "o slide da coleta mostra a coleta");
  assert.match((g[3] as { rotulo: string }).rotulo, /inclui o teste/);
  assert.equal(typeof (g[3] as { fotoFocoY?: number }).fotoFocoY, "number", "toda foto do meio tem o ponto do rosto");
  // Epigenético: o kit é outro, então nunca foto de coleta do genético.
  const e = slidesDaConsulta(TEXTOS, EPI);
  assert.ok(e.every((x) => !x.fotoNome || (FOTOS_CONSULTA as readonly string[]).includes(x.fotoNome)));
});

test("jornada: o post de venda é SEMPRE carrossel e leva a regra e a estrutura", () => {
  const produtos = [DAIANE, EPI];
  for (const seg of ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"]) {
    const { slots } = planoDaJornada({ semanaRef: seg, diasPostSemana: [1, 3, 5], produtos, queixas: ["cansaço"] });
    const venda = slots.find((s) => s.angulo === "divulgacao_produto");
    assert.ok(venda, `semana ${semanaDaJornada(seg)} tem venda`);
    assert.equal(venda!.tipo, "feed_carrossel");
    assert.match(venda!.instrucao, /REGRA DE VENDA/);
    assert.match(venda!.instrucao, /CARROSSEL DE 6 SLIDES/);
    assert.match(venda!.instrucao, /inclui/);
    assert.match(venda!.instrucao, /cansaço/, "ligado à queixa do público dela");
    assert.ok(!/—/.test(venda!.instrucao), "sem travessão");
  }
});

test("revisor: vender o teste é erro; 'a consulta inclui o teste' passa", () => {
  const ruim = revisarCopy("Compre o seu teste genético hoje. Teste genético por R$ 3.500.");
  assert.ok(ruim.some((a) => a.regra === "vende_teste" && a.gravidade === "erro"));
  const bom = revisarCopy("A Consulta Nutrigenética inclui o teste nutrigenético, com a leitura cruzada com os seus exames.");
  assert.ok(!bom.some((a) => a.regra === "vende_teste"));
});

test("ligação: a semana desenha a venda no carrossel editorial com fotos, e posts de venda leva a regra", () => {
  const sem = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.match(sem, /slidesDaConsulta\(/);
  assert.match(sem, /gerarCarrosselEditorialEUpload\(/);
  const pr = readFileSync(new URL("../claude/prompts.ts", import.meta.url), "utf8");
  assert.match(pr, /regraConsultaInclui\(produto\)/);
});

test("sempre 'teste nutrigenético': a geração troca e o revisor acusa", async () => {
  const { semAbreviacao } = await import("../texto/sem-abreviacao.ts");
  assert.equal(semAbreviacao("A consulta inclui o teste genético."), "A consulta inclui o teste nutrigenético.");
  assert.equal(semAbreviacao("Testes genéticos e TESTE GENÉTICO"), "Testes nutrigenéticos e TESTE NUTRIGENÉTICO");
  assert.equal(semAbreviacao("o teste epigenético"), "o teste epigenético", "epigenético não muda");
  assert.ok(revisarCopy("Faça um teste genético.").some((a) => a.regra === "teste_genetico"));
  assert.ok(!revisarCopy("A consulta inclui o teste nutrigenético.").some((a) => a.regra === "teste_genetico"));
  assert.match(regraConsultaInclui(DAIANE), /teste nutrigenético/);
});
