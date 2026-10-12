/** Relatório da manhã do robô: o que precisa da Aline aparece, com os dados reais de 12/10. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { montarRelatorio, semRegra } from "../src/lib/automacao/relatorio.ts";
import { casaPalavraChave as casa } from "../src/lib/automacao/regras.ts";

const regras = [
  { nome: "GLP1", ativa: false, palavras: ["glp1", "glp-1", "glp 1"] },
  { nome: "SOMP", ativa: false, palavras: ["somp", "somo"] },
];

test("comentário sem regra aparece, o que tem regra e o emoji não", () => {
  const r = semRegra([
    { quem: "@doria_reis", texto: "Mc4r" },
    { quem: "@cintia", texto: "GLP 1" },
    { quem: "@x", texto: "👏👏👏" },
    { quem: "@y", texto: "@ana_poell" },
  ], regras, casa);
  assert.deepEqual(r.map((c) => c.texto), ["Mc4r"]);
});

test("convite esperando a Aline vira o assunto do e-mail", () => {
  const r = montarRelatorio({
    perfil: "nutri_secrets", entradas: { dm: 3 }, saidas: {},
    esperando: [{ quem: "@erikawandembruck", motivo: "convite ou imprensa: leia você" }],
    comentariosCurtos: [{ quem: "@grazi", texto: "SOMP" }], regras, tokenVenceEm: "2026-11-04T11:30:00Z", casa,
    agora: new Date("2026-10-12T11:00:00Z"),
  });
  assert.match(r.assunto, /1 coisa precisa de você/);
  assert.match(r.texto, /erikawandembruck/);
  assert.match(r.texto, /1x SOMP/); // regra desligada: quem respondeu foi o ManyChat
  assert.doesNotMatch(r.texto, /Conexão do Instagram/); // faltam 23 dias
});

test("token perto de vencer aparece", () => {
  const r = montarRelatorio({ perfil: "x", entradas: {}, saidas: {}, esperando: [], comentariosCurtos: [], regras, tokenVenceEm: "2026-11-04T11:30:00Z", casa, agora: new Date("2026-11-01T11:00:00Z") });
  assert.match(r.texto, /vence em 3 dia/);
});

test("dia sem pendência diz que nada precisa dela", () => {
  const r = montarRelatorio({ perfil: "x", entradas: { comentario: 2 }, saidas: { regra: 2 }, esperando: [], comentariosCurtos: [], regras, tokenVenceEm: null, casa });
  assert.match(r.assunto, /nada precisa de você/);
});
