import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { casaPalavraChave } from "../src/lib/automacao/regras.ts";
import {
  PALAVRAS_ACUSACAO, TAG_ACUSACAO, contatoJaAcusou, decidirAposAcusacao,
  suspeitaDeAcusacao, acaoParaLeitura,
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

/* ── A peneira de duas etapas ──────────────────────────────────────────── */

const suspeita = (t: string) => suspeitaDeAcusacao(t, casaPalavraChave);

test("etapa 1 é LARGA: pega acusação escrita sem a palavra 'charlatanismo'", () => {
  // Era o buraco que a Aline apontou: a lista estreita não pegava nenhuma
  // destas, e todas são ataque.
  for (const t of [
    "isso é enganação pura",
    "está enganando as pessoas",
    "vender ilusão pra quem está desesperado",
    "isso não tem base científica nenhuma",
    "é só marketing",
    "que farsa",
    "isso é golpe",
    "mais uma modinha",
  ]) {
    assert.equal(suspeita(t), true, t);
  }
});

test("etapa 1 deixa passar o que não tem nada a ver, pra não gastar leitura", () => {
  for (const t of [
    "Que maravilha Dra Aline!",
    "quero o material do GLP1",
    "onde faço o teste?",
    "amei esse conteúdo",
  ]) {
    assert.equal(suspeita(t), false, t);
  }
});

test("🔴 dúvida legítima NUNCA recebe a defesa: vai pra ela", () => {
  const r = acaoParaLeitura("duvida");
  assert.equal(r.acao, "mandar_pra_ela");
  assert.notEqual(r.acao, "responder_acusacao");
});

test("🔴 leitura que falhou também vai pra ela, nunca responde no escuro", () => {
  // Responder por engano é irreversível; esperar não é.
  assert.equal(acaoParaLeitura(null).acao, "mandar_pra_ela");
});

test("só acusação lida como acusação dispara a resposta", () => {
  assert.equal(acaoParaLeitura("acusacao").acao, "responder_acusacao");
  assert.equal(acaoParaLeitura("nenhum").acao, "seguir");
});

test("🔴 a etapa 1 sozinha NUNCA decide: ambíguo passa, e quem julga é a leitura", () => {
  // "caí num golpe de outra clínica" passa na peneira de propósito. Se a
  // etapa 1 decidisse, essa pessoa levaria a defesa da Aline na cara.
  assert.equal(suspeita("caí num golpe de outra clínica"), true);
  assert.equal(acaoParaLeitura("nenhum").acao, "seguir");
});

/* ── O simulador conta a mesma verdade ─────────────────────────────────── */

test("🔴 o simulador roda a peneira da crítica, e a regra sai das vias normais", () => {
  const src = readFileSync(
    new URL("../src/lib/automacao/simulador.ts", import.meta.url), "utf8");
  assert.match(src, /suspeitaDeAcusacao\(params\.texto/);
  assert.match(src, /lerTomDaCritica\(params\.texto\)/);
  // Não pode passar a lista INTEIRA pras vias normais, senão a regra de
  // acusação dispararia por palavra-chave crua também no simulador.
  assert.match(src, /const regrasComuns = regras\.filter/);
  assert.doesNotMatch(src, /selecionarRegra\([^)]*\},\s*regras\s*\)/);
});

test("🔴 o caminho real também tira a regra de acusação das vias normais", () => {
  const src = readFileSync(
    new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
  assert.match(src, /const regrasComuns = regras\.filter\(\(r\) => !contatoJaAcusou/);
  assert.match(src, /selecionarRegra\(\{ gatilho, texto: ev\.texto, mediaId: ev\.mediaId \}, regrasComuns, jaAplicadas\)/);
  assert.match(src, /candidatasPorIntencao\(\{ gatilho, texto: ev\.texto, mediaId: ev\.mediaId \}, regrasComuns, jaAplicadas\)/);
  // A leitura roda antes de escolher regra.
  assert.ok(src.indexOf("lerTomDaCritica(ev.texto)") < src.indexOf("let regra = selecionarRegra"));
});
