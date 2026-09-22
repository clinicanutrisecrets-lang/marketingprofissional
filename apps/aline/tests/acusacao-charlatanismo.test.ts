import { test } from "node:test";
import assert from "node:assert/strict";
import { casaPalavraChave } from "../src/lib/automacao/regras.ts";
import {
  PALAVRAS_ACUSACAO, TAG_ACUSACAO, contatoJaAcusou, decidirAposAcusacao,
} from "../src/lib/automacao/acusacao.ts";

/** O comentário REAL, do anúncio da aula de nutrigenética (22/09/2026). */
const REAL = "Charlatanismo, é o nome disso.";

test("o comentário real casa, com e sem acento, em qualquer caixa", () => {
  assert.equal(casaPalavraChave(REAL, PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("isso é CHARLATANISMO puro", PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("voce e uma charlata", PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("que charlatão", PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("isso é pseudociência", PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("pseudo-ciência disfarçada", PALAVRAS_ACUSACAO), true);
  assert.equal(casaPalavraChave("só charlatanismos por aqui", PALAVRAS_ACUSACAO), true);
});

test("🔴 palavra ambígua fica de fora: quem fala de OUTRA clínica não leva a defesa dela", () => {
  // Esses NÃO podem disparar a resposta de acusação.
  for (const t of [
    "caí num golpe de outra clínica",
    "achei que fosse mentira mas funcionou",
    "essa dieta foi uma furada pra mim",
    "achei caro demais",
    "comigo não funcionou",
  ]) {
    assert.equal(casaPalavraChave(t, PALAVRAS_ACUSACAO), false, t);
  }
});

test("elogio e pedido de material nunca disparam", () => {
  assert.equal(casaPalavraChave("Que maravilha Dra Aline!", PALAVRAS_ACUSACAO), false);
  assert.equal(casaPalavraChave("quero o material do GLP1", PALAVRAS_ACUSACAO), false);
});

test("quem já foi respondido e volta: o robô cala e avisa", () => {
  assert.deepEqual(
    decidirAposAcusacao({ tags: [TAG_ACUSACAO], regraDisparou: false }),
    { acao: "calar_e_avisar", motivo: "já recebeu a resposta sobre a acusação e escreveu de novo" },
  );
});

test("🔴 mas pedido de material com palavra-chave continua valendo", () => {
  // Quem acusou ontem pode querer o material hoje. Material é texto fixo,
  // não é discussão.
  assert.deepEqual(
    decidirAposAcusacao({ tags: [TAG_ACUSACAO], regraDisparou: true }),
    { acao: "seguir" },
  );
});

test("quem nunca acusou segue o caminho normal", () => {
  assert.deepEqual(decidirAposAcusacao({ tags: [], regraDisparou: false }), { acao: "seguir" });
  assert.deepEqual(decidirAposAcusacao({ tags: null, regraDisparou: false }), { acao: "seguir" });
  assert.deepEqual(decidirAposAcusacao({ tags: ["paciente"], regraDisparou: false }), { acao: "seguir" });
});

test("a tag é reconhecida com espaço e caixa diferente", () => {
  assert.equal(contatoJaAcusou([" Acusacao "]), true);
  assert.equal(contatoJaAcusou(["acusacoes"]), false);
});
