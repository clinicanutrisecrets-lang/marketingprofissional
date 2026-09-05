import { test } from "node:test";
import assert from "node:assert/strict";
import {
  blocoOrientacoesDaDona,
  direcionamentosParaTexto,
  lerConfig,
  lerDirecionamentos,
  normalizarUsername,
} from "../src/lib/automacao/config.ts";

test("lista de quem não responder é normalizada (sem @, minúscula)", () => {
  const c = lerConfig({ nao_responder_usernames: ["@Pai.Da.Aline", " julimendesnutri ", ""] });
  assert.deepEqual(c.nao_responder_usernames, ["pai.da.aline", "julimendesnutri"]);
  assert.equal(normalizarUsername("@Nutri_Secrets"), "nutri_secrets");
});

test("direcionamentos: uma linha por caso, separador -> | =>; linha sem separador é ignorada", () => {
  const lista = lerDirecionamentos("quer consulta -> mandar link X\npergunta preço | dizer que começa pela avaliação\nlinha solta\nteste => y");
  assert.deepEqual(lista, [
    { quando: "quer consulta", fazer: "mandar link X" },
    { quando: "pergunta preço", fazer: "dizer que começa pela avaliação" },
    { quando: "teste", fazer: "y" },
  ]);
  assert.equal(direcionamentosParaTexto(lista).split("\n").length, 3);
});

test("config antiga sem os campos novos continua válida e o bloco sai vazio", () => {
  const c = lerConfig({ agradecer_comentarios: true });
  assert.equal(c.agradecer_comentarios, true);
  assert.deepEqual(c.direcionamentos, []);
  assert.equal(blocoOrientacoesDaDona(c), "");
});

test("bloco de orientações leva voz, ética e direcionamentos", () => {
  const c = lerConfig({ voz: "fala como amiga", instrucoes_etica: "orientação só em consulta", direcionamentos: [{ quando: "quer consulta", fazer: "link" }] });
  const b = blocoOrientacoesDaDona(c);
  assert.match(b, /COMO A DONA DO PERFIL FALA/);
  assert.match(b, /fala como amiga/);
  assert.match(b, /orientação só em consulta/);
  assert.match(b, /Quando quer consulta: link/);
});
