import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  lerMencaoDeTerceiro,
  blocoRespeitoAoProfissional,
} from "../src/lib/automacao/conduta-de-terceiro.ts";

test("pega a conduta do profissional de quem comenta", () => {
  for (const t of [
    "minha nutri mandou cortar o glúten e eu não tenho celíaca",
    "meu médico passou metformina, isso serve?",
    "a minha endocrinologista tirou o carboidrato da janta",
    "o nutri dela receitou creatina",
    "Minha Nutricionista Disse Que Eu Não Posso Comer Fruta À Noite",
  ]) {
    const m = lerMencaoDeTerceiro(t);
    assert.ok(m.mencionaProfissional, `profissional: ${t}`);
    assert.ok(m.citaConduta, `conduta: ${t}`);
    assert.match(blocoRespeitoAoProfissional(t), /não contestar/i);
  }
});

test("posse sem conduta ainda protege, mas sem o bloco duro", () => {
  const m = lerMencaoDeTerceiro("vou levar isso pra minha nutri na consulta");
  assert.ok(m.mencionaProfissional);
  assert.ok(!m.citaConduta);
  const b = blocoRespeitoAoProfissional("vou levar isso pra minha nutri na consulta");
  assert.match(b, /não contestar/i);
  assert.doesNotMatch(b, /CONDUTA desse profissional/);
});

test("comentário comum não dispara nada", () => {
  for (const t of [
    "amei esse conteúdo, salvei aqui",
    "o nutricionista investiga a raiz, é isso mesmo",
    "quero saber mais sobre a microbiota",
    "minha barriga incha todo dia",
    "sou nutricionista e adorei a explicação",
  ]) {
    assert.equal(blocoRespeitoAoProfissional(t), "", `não devia disparar: ${t}`);
  }
});

test("posse e profissão têm que estar na MESMA frase", () => {
  // sem isso, falar do próprio corpo numa frase e do profissional na outra
  // faria toda resposta sair desviando pra consulta.
  const m = lerMencaoDeTerceiro("minha barriga incha. O nutricionista investiga isso.");
  assert.ok(!m.mencionaProfissional);
});

test("acento não escapa da fronteira de palavra", () => {
  // 🔴 `\b` do JS não casa antes de vogal acentuada. Se a fronteira estiver
  // errada, "médico" e "médica" passam batido e a regra não vale pra metade
  // dos comentários.
  assert.ok(lerMencaoDeTerceiro("meu médico falou pra eu parar").citaConduta);
  assert.ok(lerMencaoDeTerceiro("minha médica indicou ômega").citaConduta);
  assert.ok(lerMencaoDeTerceiro("meu nutrólogo prescreveu").citaConduta);
});

test("o bloco proíbe as palavras que leem como contestação", () => {
  const b = blocoRespeitoAoProfissional("minha nutri mandou tirar o glúten");
  for (const p of ["na verdade", "o correto é", "não é bem assim"]) {
    assert.ok(b.includes(p), `o bloco precisa proibir "${p}"`);
  }
  assert.match(b, /individualidade/i);
});

test("as duas respostas geradas passam o texto da pessoa pelo bloco", () => {
  // Só o prompt não basta: se alguém tirar a chamada, a regra vira decoração.
  const src = fs.readFileSync(new URL("../src/lib/automacao/ia.ts", import.meta.url), "utf8");
  assert.ok(src.includes("blocoRespeitoAoProfissional(params.comentario)"), "falta no comentário");
  assert.ok(src.includes("blocoRespeitoAoProfissional(params.pergunta)"), "falta na DM");
});
