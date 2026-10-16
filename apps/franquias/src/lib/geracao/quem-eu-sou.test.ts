import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  materialQuemEuSou,
  conferirQuemEuSou,
  slidesQuemEuSou,
  vezDoQuemEuSou,
  numerosDoTexto,
  textoOndeAtendo,
  pedidoQuemEuSou,
} from "./quem-eu-sou.ts";

// Respostas reais (Mariana, 16/10), resumidas.
const MARIANA = {
  nome_completo: "Mariana Uchoa",
  nome_comercial: "Mariana Uchoa",
  historia_pessoal:
    "Eu sempre gostei de me cuidar, ter um físico legal e saúde acima de tudo. Meu amor pelo cuidado do intestino também nasceu de mim mesma, que tinha algumas questões intestinais e precisava tratar.",
  resultado_transformacao:
    "Tenho uma paciente que tinha muito medo de comer, ela não conseguia ir a restaurantes porque tinha urgência de ir ao banheiro.",
  diferenciais: "Eu gosto de olhar para a paciente como um todo, e não apenas para o que ela come.",
  numero_pacientes_atendidos: 2000,
  cidade: "Salvador",
  estado: "BA",
  modalidade_atendimento: "hibrido",
};

const BOM = {
  capa_titulo: "O meu cuidado com o intestino começou em mim",
  porque_titulo: "Eu também precisei tratar",
  porque_texto: "Eu tinha questões intestinais e precisei cuidar. Foi aí que nasceu o meu amor por esse cuidado.",
  historia_titulo: "Ela voltou a comer fora",
  historia_texto: "Uma paciente tinha medo de comer e não ia a restaurantes. Hoje ela come fora sem medo.",
  como_titulo: "Olho para você inteira",
  como_linhas: [
    { rotulo: "Escuta", texto: "Começo pela sua história." },
    { rotulo: "Intestino", texto: "Entendo como ele funciona." },
    { rotulo: "Plano", texto: "Feito para a sua rotina." },
  ],
  fecho_titulo: "Vamos conversar?",
  fecho_chamada: "Se você se viu aqui, agende pelo link da bio.",
  legenda: "Eu também precisei cuidar do meu intestino. Agende pelo link da bio.",
};

test("sem história respondida não existe post (nunca inventado)", () => {
  assert.equal(materialQuemEuSou({ nome_completo: "X" }), null);
  assert.equal(materialQuemEuSou({ historia_pessoal: "Gosto de gente." }), null);
  assert.ok(materialQuemEuSou(MARIANA));
});

test("o pedido ao modelo leva só as respostas dela", () => {
  const p = JSON.parse(pedidoQuemEuSou(materialQuemEuSou(MARIANA)!));
  assert.deepEqual(Object.keys(p).sort(), ["como_eu_trabalho", "nome", "por_que_escolhi", "transformacao_que_marcou"]);
});

test("a resposta boa passa", () => {
  const c = conferirQuemEuSou(BOM, materialQuemEuSou(MARIANA)!);
  assert.equal(c.ok, true, c.ok ? "" : c.motivo);
});

test("número que ela não escreveu é recusado", () => {
  const c = conferirQuemEuSou({ ...BOM, porque_texto: "Há 15 anos eu cuido de intestino." }, materialQuemEuSou(MARIANA)!);
  assert.equal(c.ok, false);
  assert.match(c.ok ? "" : c.motivo, /15/);
});

test("promessa de cura é recusada pelo revisor", () => {
  const c = conferirQuemEuSou({ ...BOM, historia_texto: "Eu curei o intestino dela de vez." }, materialQuemEuSou(MARIANA)!);
  assert.equal(c.ok, false);
});

test("sem a transformação escrita, o slide da história some", () => {
  const m = materialQuemEuSou({ ...MARIANA, resultado_transformacao: null })!;
  const c = conferirQuemEuSou(BOM, m);
  assert.ok(c.ok);
  const s = slidesQuemEuSou(m, c.ok ? c.textos : BOM);
  assert.ok(!s.some((x) => "rotulo" in x && x.rotulo === "Uma história que me marcou"));
});

test("os slides: capa, por que, história, como, onde e fecho", () => {
  const m = materialQuemEuSou(MARIANA)!;
  const s = slidesQuemEuSou(m, BOM);
  assert.deepEqual(s.map((x) => x.tipo), ["capa", "meio", "meio", "meio", "meio", "fecho"]);
  assert.equal(s[0]!.tipo === "capa" && s[0]!.kicker, "Prazer, Mariana");
  assert.deepEqual(textoOndeAtendo(m), {
    titulo: "Atendimento presencial e online em Salvador, BA",
    corpo: "Mais de 2.000 pacientes atendidos.",
  });
});

test("números com separador de milhar contam como o mesmo", () => {
  assert.deepEqual(numerosDoTexto("mais de 2.000 e 2000, e 15."), ["2000", "2000", "15"]);
});

test("a vez dele: depois da consulta e da Fábrica, uma vez só", () => {
  const base = { jaTem: false, semanasConsulta: ["2026-10-19"], semanasFabrica: ["2026-10-26"] };
  assert.equal(vezDoQuemEuSou({ ...base, semanaRef: "2026-10-26" }), false); // semana da Fábrica
  assert.equal(vezDoQuemEuSou({ ...base, semanaRef: "2026-11-02" }), true);
  assert.equal(vezDoQuemEuSou({ ...base, jaTem: true, semanaRef: "2026-11-02" }), false);
  // Fábrica nunca saiu: a consulta há duas semanas basta.
  assert.equal(vezDoQuemEuSou({ ...base, semanasFabrica: [], semanaRef: "2026-10-26" }), false);
  assert.equal(vezDoQuemEuSou({ ...base, semanasFabrica: [], semanaRef: "2026-11-02" }), true);
  assert.equal(vezDoQuemEuSou({ ...base, semanasConsulta: [], semanaRef: "2026-11-02" }), false);
});

test("o pacote de domingo chama o Quem eu sou depois da Fábrica", () => {
  const sem = readFileSync(join(import.meta.dirname, "semanal.ts"), "utf8");
  const fab = sem.indexOf("montarFabricaDaSemana({");
  const quem = sem.indexOf("montarQuemEuSouDaSemana({");
  assert.ok(fab > 0 && quem > fab);
});
