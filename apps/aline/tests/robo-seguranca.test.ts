/**
 * Travas da auditoria de 06/11/2026, feita antes de desligar o ManyChat.
 * A Aline: "na comunicação das respostas do direct, não pode ter erro".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  situacaoDeRisco, TEXTO_CRISE, TEXTO_AGUDO, motivoParaNaoEnviar, opcoesAindaValidas,
  proximoHorarioComercial, motivoParaCancelarPasso, alineJaEscreveu,
} from "../src/lib/automacao/seguranca.ts";
import { pareceClinico } from "../src/lib/automacao/regras.ts";

const processar = readFileSync(new URL("../src/lib/automacao/processar.ts", import.meta.url), "utf8");
const fila = readFileSync(new URL("../src/lib/automacao/fila.ts", import.meta.url), "utf8");
const ia = readFileSync(new URL("../src/lib/automacao/ia.ts", import.meta.url), "utf8");

/* ── crise e evento agudo ── */

test("frase de crise é crise", () => {
  assert.equal(situacaoDeRisco("não aguento mais, quero sumir"), "crise");
  assert.equal(situacaoDeRisco("Às vezes penso em me matar"), "crise");
  assert.equal(situacaoDeRisco("tô provocando o vômito depois de comer"), "crise");
  assert.equal(situacaoDeRisco("eu fico tentando provocar o vomito"), "crise");
});

test("evento agudo é agudo; condição não é", () => {
  assert.equal(situacaoDeRisco("estou com dor no peito agora"), "agudo");
  assert.equal(situacaoDeRisco("não consigo respirar direito"), "agudo");
  assert.equal(situacaoDeRisco("sou ansiosa e tenho intestino preso, serve pra mim?"), null);
  assert.equal(situacaoDeRisco("Estou grávida, posso comer isso?"), null);
});

test("figura de linguagem não é crise", () => {
  assert.equal(situacaoDeRisco("kkkk morri de rir com esse post"), null);
  assert.equal(situacaoDeRisco("tô morrendo de fome"), null);
  assert.equal(situacaoDeRisco("GLP1"), null);
});

test("textos de risco: sem travessão, sem hipótese, com o serviço certo", () => {
  for (const t of [TEXTO_CRISE, TEXTO_AGUDO]) {
    assert.ok(!/[—–]/.test(t));
    assert.ok(!/urgente|corre|grave/i.test(t));
    assert.equal(motivoParaNaoEnviar(t), null);
  }
  assert.ok(TEXTO_CRISE.includes("188"));
  assert.ok(TEXTO_AGUDO.includes("192"));
});

test("o risco vem antes dos botões e das regras no processamento", () => {
  const iRisco = processar.indexOf("situacaoDeRisco(ev.texto)");
  const iBotao = processar.indexOf("casarOpcao(ev, ultimas)");
  const iRegra = processar.indexOf("selecionarRegra({ gatilho");
  assert.ok(iRisco > 0 && iRisco < iBotao && iRisco < iRegra);
});

/* ── texto gerado que não sai ── */

test("JSON cru não sai", () => {
  assert.ok(motivoParaNaoEnviar('{"resposta": "oi", "encaminhar": true, "motivo": "caso individual"}'));
  assert.ok(motivoParaNaoEnviar('Oi! "encaminhar": true'));
});

test("IA e robô não saem; o verbo 'ia' sai", () => {
  assert.ok(motivoParaNaoEnviar("Eu sou uma IA treinada pela Aline"));
  assert.ok(motivoParaNaoEnviar("Aqui é o robô da Aline"));
  assert.ok(motivoParaNaoEnviar("Uso inteligência artificial pra responder"));
  assert.equal(motivoParaNaoEnviar("Eu ia te mandar o link agora mesmo 💛"), null);
});

test("diagnóstico e dose não saem", () => {
  assert.ok(motivoParaNaoEnviar("Pelo que você contou, você tem SII."));
  assert.ok(motivoParaNaoEnviar("Você está com candidíase, com certeza."));
  assert.ok(motivoParaNaoEnviar("Toma 500 mg de magnésio à noite."));
  assert.ok(motivoParaNaoEnviar("Vitamina D 10.000 UI resolve."));
  assert.ok(motivoParaNaoEnviar("Isso garanto que vai sumir em 30 dias."));
});

test("resposta comum sai", () => {
  assert.equal(motivoParaNaoEnviar("Que bom que você gostou! O intestino conversa com o cérebro o tempo todo, por isso o humor muda junto 💛"), null);
  assert.equal(motivoParaNaoEnviar("Isso depende do seu caso, e quem olha isso com calma é a consulta."), null);
});

test("resposta gerada passa pelo veto antes de sair, e o JSON quebrado não vira prosa", () => {
  assert.ok(processar.includes("motivoParaNaoEnviar(resp.texto)"));
  assert.ok(!ia.includes("Modelo escreveu prosa em vez de JSON: usa a prosa"));
});

/* ── botões vencem ── */

test("pergunta com botões vale 24 h", () => {
  const agora = Date.parse("2026-11-06T12:00:00Z");
  assert.equal(opcoesAindaValidas("2026-11-06T00:00:00Z", agora), true);
  assert.equal(opcoesAindaValidas("2026-11-05T11:00:00Z", agora), false);
  assert.equal(opcoesAindaValidas(undefined, agora), false); // gravada antes de 06/11
});

test("processar só usa as opções se ainda valem", () => {
  assert.ok(processar.includes("opcoesAindaValidas(contato.ultimas_opcoes.em)"));
});

/* ── horário comercial ── */

test("passo de sequência espera as 9h de Brasília", () => {
  // 03:00 de Brasília = 06:00 UTC → 09:00 de Brasília = 12:00 UTC do mesmo dia
  assert.equal(proximoHorarioComercial(new Date("2026-11-06T06:00:00Z")).toISOString(), "2026-11-06T12:00:00.000Z");
  // 22:00 de Brasília = 01:00 UTC do dia seguinte → 09:00 do dia seguinte
  assert.equal(proximoHorarioComercial(new Date("2026-11-07T01:00:00Z")).toISOString(), "2026-11-07T12:00:00.000Z");
  // 15:00 de Brasília sai na hora
  const tarde = new Date("2026-11-06T18:00:00Z");
  assert.equal(proximoHorarioComercial(tarde).getTime(), tarde.getTime());
});

/* ── fila ── */

test("passo não sai se a Aline entrou ou se espera uma pessoa", () => {
  assert.ok(motivoParaCancelarPasso({ aline_falou_em: "2026-11-01T00:00:00Z" }));
  assert.ok(motivoParaCancelarPasso({ precisa_humano: true }));
  assert.ok(motivoParaCancelarPasso({ silenciado: true }));
  assert.ok(motivoParaCancelarPasso(null));
  assert.equal(motivoParaCancelarPasso({}), null);
});

test("a fila reserva a linha antes de mandar", () => {
  assert.ok(fila.includes('.eq("tentativas", item.tentativas ?? 0)'));
  assert.ok(fila.includes("motivoParaCancelarPasso(c)"));
});

/* ── conversa antiga da Aline ── */

test("mensagem da conta que não é do robô = a Aline já escrevia", () => {
  const msgs = [
    { id: "m1", message: "meu sonho", from: { id: "pessoa" } },
    { id: "m2", message: "te amo amiga", from: { id: "conta" } },
  ];
  assert.equal(alineJaEscreveu(msgs, "pessoa", new Set()), true);
  assert.equal(alineJaEscreveu(msgs, "pessoa", new Set(["m2"])), false);
  assert.equal(alineJaEscreveu(msgs, "pessoa", new Set(), new Set(["te amo amiga"])), false);
  assert.equal(alineJaEscreveu([{ id: "m1", from: { id: "pessoa" } }], "pessoa", new Set()), false);
});

test("eco pra contato desconhecido cria o contato já travado", () => {
  const i = processar.indexOf("async function marcarSeFoiAline");
  const trecho = processar.slice(i, i + 1500);
  assert.ok(trecho.includes("aline_falou_em: agora"));
  assert.ok(!trecho.includes("if (!data) return; // ela escreveu"));
});

/* ── falso positivo do convite público ── */

test("'ui que lindo' não é pergunta clínica; '500 mg' é", () => {
  assert.equal(pareceClinico("ui que lindo esse post"), false);
  assert.equal(pareceClinico("posso tomar 500mg?"), true);
  assert.equal(pareceClinico("quanto de magnésio?"), true);
});
