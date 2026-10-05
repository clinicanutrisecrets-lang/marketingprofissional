/**
 * O incidente de 29/09/2026: a Meta devolveu 500 e ENTREGOU a mensagem.
 * O robô acreditou no erro, repetiu, e o registro de saída nunca foi escrito —
 * daí vieram a mensagem em dobro, o "uma vez por contato" cego, as opções que
 * não casavam com nada e 23 contatos travados como se a Aline tivesse falado.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { desfechoDaFalha, registroDoDesfecho, statusNaFila, ehStatusDeFila, STATUS_FILA } from "../src/lib/automacao/envio.ts";
import { abrePortaUnica } from "../src/lib/automacao/regras.ts";

const processar = readFileSync("src/lib/automacao/processar.ts", "utf8");
const fila = readFileSync("src/lib/automacao/fila.ts", "utf8");
const regras = readFileSync("src/lib/automacao/regras.ts", "utf8");

/* ── O erro REAL daquele dia ──────────────────────────────────────────── */

const ERRO_REAL =
  'Instagram API POST /me/messages: 500 {"error":{"message":"An unknown error has occurred.","type":"OAuthException","code":1,"fbtrace_id":"A1b2C3"}}';

test("o 500 com code 1 da Meta é 'pode ter entregue', nunca 'falhou'", () => {
  assert.equal(desfechoDaFalha(ERRO_REAL), "sem_confirmacao");
});

test("code 1 vale como 'não sei' mesmo quando vem em 400", () => {
  const erro = 'Instagram API POST /me/messages: 400 {"error":{"message":"An unknown error has occurred.","type":"OAuthException","code":1}}';
  assert.equal(desfechoDaFalha(erro), "sem_confirmacao");
});

test("erro sem status (rede, timeout) também é 'pode ter entregue'", () => {
  assert.equal(desfechoDaFalha("fetch failed"), "sem_confirmacao");
  assert.equal(desfechoDaFalha("ETIMEDOUT"), "sem_confirmacao");
});

test("recusa de verdade da Meta é recusa: não saiu nada", () => {
  const janela =
    'Instagram API POST /me/messages: 400 {"error":{"message":"This message is sent outside of allowed window.","code":10}}';
  assert.equal(desfechoDaFalha(janela), "recusado");
  const permissao =
    'Instagram API POST /me/messages: 403 {"error":{"message":"Application does not have permission","code":200}}';
  assert.equal(desfechoDaFalha(permissao), "recusado");
  const cota = 'Instagram API POST /me/messages: 429 {"error":{"message":"rate limit","code":4}}';
  assert.equal(desfechoDaFalha(cota), "recusado");
});

/* ── O registro: é ele que trava a repetição e solta o eco ────────────── */

test("sem confirmação GUARDA o regra_id — repetir é o defeito que a pessoa vê", () => {
  const r = registroDoDesfecho("sem_confirmacao", "regra", "glp1");
  assert.equal(r.regraId, "glp1", "com regra_id, uma_vez_por_contato impede a mensagem em dobro");
  assert.match(r.origem, /sem_confirmacao/, "a origem tem que deixar o estado visível no painel");
  assert.equal(r.precisaConferir, true, "ela precisa saber que a entrega não foi confirmada");
});

test("recusado SOLTA o regra_id — a pessoa tem direito de receber depois", () => {
  const r = registroDoDesfecho("recusado", "regra", "glp1");
  assert.equal(r.regraId, undefined);
  assert.equal(r.precisaConferir, true);
});

test("entregue registra limpo, sem pendência pra ela", () => {
  const r = registroDoDesfecho("entregue", "regra", "glp1");
  assert.deepEqual(r, { origem: "regra", regraId: "glp1", precisaConferir: false });
});

/* ── As três regressões, travadas no fonte ────────────────────────────── */

test("não existe mais lista numerada: 'Responda com o número' saiu do robô", () => {
  for (const [nome, fonte] of [["processar", processar], ["fila", fila], ["regras", regras]] as const) {
    assert.ok(
      !/Responda com o n[úu]mero`/.test(fonte),
      `${nome}.ts voltou a montar a lista numerada — a Aline pediu conversa (01/10/2026)`,
    );
  }
  assert.ok(!/export function opcoesComoTexto/.test(regras), "opcoesComoTexto voltou a existir");
});

test("tentativa ÚNICA: nenhum envio dentro de catch de envio", () => {
  // O defeito era literalmente este: catch { enviar de novo }.
  const catchComEnvio = /catch\s*\([^)]*\)\s*\{[^}]*await\s+(enviarDm|respostaPrivadaComentario|responderComentario)\(/s;
  assert.ok(!catchComEnvio.test(processar), "processar.ts voltou a reenviar depois do erro");
  assert.ok(!catchComEnvio.test(fila), "fila.ts voltou a reenviar depois do erro");
});

test("as opções são gravadas ANTES do envio, nos dois caminhos", () => {
  // Comparado DENTRO do bloco que manda a mensagem: o arquivo tem outros
  // envios depois, e procurar no arquivo todo deixa a troca de ordem passar.
  const blocos = [
    ["processar", trecho(processar, "if (regra.resposta_privada) {", "if (!regra.resposta_publica")],
    ["fila", trecho(fila, "const opcoes = (item.opcoes ?? [])", "await marcar(item.id, statusNaFila(")],
  ] as const;
  for (const [nome, bloco] of blocos) {
    const grava = bloco.indexOf("ultimas_opcoes: ultimas");
    const envia = bloco.search(/await\s+(entregar|enviarDm|respostaPrivadaComentario)\(/);
    assert.ok(grava >= 0, `${nome}.ts não grava mais ultimas_opcoes no bloco de envio`);
    assert.ok(envia >= 0, `${nome}.ts não manda mais nada no bloco de envio`);
    assert.ok(
      grava < envia,
      `${nome}.ts grava as opções DEPOIS do envio — foi isso que deixou a resposta da Nara sem destino`,
    );
  }
});

function trecho(fonte: string, de: string, ate: string): string {
  const i = fonte.indexOf(de);
  assert.ok(i >= 0, `não achei o início do bloco: ${de}`);
  const j = fonte.indexOf(ate, i);
  assert.ok(j > i, `não achei o fim do bloco: ${ate}`);
  return fonte.slice(i, j);
}

test("todo texto de regra sai por entregar(), a saída única", () => {
  // Fora de entregar(), processar.ts só pode mandar comentário PÚBLICO,
  // reação de coração e a leitura de perfil.
  const diretos = processar.match(/await\s+(enviarDm|respostaPrivadaComentario)\(/g) ?? [];
  assert.equal(
    diretos.length,
    2,
    "envio direto de DM fora de entregar() nasce sem registro e sem a régua do 500",
  );
});

/* ── Porta única: "Me envie o link" não é uma escolha, é continuar ────── */

const REGRAS_FAKE = [
  { id: "bebe", palavras_chave: ["bebe", "bebê"] },
  { id: "glp1", palavras_chave: ["glp1", "glp-1"] },
  { id: "sem-palavra", palavras_chave: [] },
];
const PORTA_BEBE = { regra_id: "bebe", rotulos: ["Me envie o link"] };

test("com uma opção só, qualquer resposta abre a porta", () => {
  for (const t of ["sim", "quero", "me manda", "pode mandar por favor", "aaa", "👍"]) {
    assert.ok(abrePortaUnica(t, PORTA_BEBE, REGRAS_FAKE), `"${t}" devia abrir`);
  }
});

test("pergunta sobre o material também abre — ela quer o material", () => {
  assert.ok(abrePortaUnica("é pra bebê de quantos meses?", PORTA_BEBE, REGRAS_FAKE));
});

test("pedir OUTRO material não abre a porta errada", () => {
  assert.ok(
    !abrePortaUnica("GLP1", PORTA_BEBE, REGRAS_FAKE),
    "quem digitou GLP1 receberia o PDF do bebê",
  );
  assert.ok(!abrePortaUnica("quero o glp-1", PORTA_BEBE, REGRAS_FAKE));
});

test("com duas opções ou mais, a leitura decide — nunca a porta única", () => {
  const duas = { regra_id: "glp1", rotulos: ["Sim, sou nutri", "Não, sou paciente"] };
  assert.ok(!abrePortaUnica("sim", duas, REGRAS_FAKE));
});

test("sem opção pendente, ou com anexo, não abre nada", () => {
  assert.ok(!abrePortaUnica("sim", null, REGRAS_FAKE));
  assert.ok(!abrePortaUnica("", PORTA_BEBE, REGRAS_FAKE));
  assert.ok(!abrePortaUnica("[audio]", PORTA_BEBE, REGRAS_FAKE), "anexo não é resposta");
});

/* ── O SEGUNDO incidente (05/10/2026): o conserto de cima, mal ligado ────
 *
 * A fila gravou `status='sem_confirmacao'` — valor que o CHECK do banco
 * recusa — e não leu o erro do UPDATE. A linha ficou `pendente`, o cron pegou
 * de novo, e a MESMA resposta privada saiu DEZ vezes, de 5 em 5 minutos.
 */

const MIGRACAO_FILA = readFileSync("../../supabase/migrations/aline/009_instagram_automacao.sql", "utf8");

test("STATUS_FILA é exatamente o CHECK do banco, não uma lista parecida", () => {
  const linha = MIGRACAO_FILA.split("\n").find((l) => /CHECK \(status IN/.test(l));
  assert.ok(linha, "não achei o CHECK de status da ig_fila na migração");
  const noBanco = [...linha!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...STATUS_FILA].sort(), noBanco.sort());
});

test("todo desfecho vira um status que o banco aceita", () => {
  for (const d of ["entregue", "sem_confirmacao", "recusado"] as const) {
    const status = statusNaFila(d);
    assert.ok(ehStatusDeFila(status), `${d} virou "${status}", que o CHECK recusa`);
  }
});

test("sem confirmação PARA a linha: nunca volta pra pendente", () => {
  // Deixar `pendente` É o loop: o cron só pega pendente.
  assert.equal(statusNaFila("sem_confirmacao"), "enviado");
  assert.notEqual(statusNaFila("sem_confirmacao"), "pendente");
  // E não é "falhou": mentiria sobre uma mensagem que provavelmente chegou.
  assert.notEqual(statusNaFila("sem_confirmacao"), "falhou");
});

test("recusado é falha de verdade, e entregue é enviado", () => {
  assert.equal(statusNaFila("recusado"), "falhou");
  assert.equal(statusNaFila("entregue"), "enviado");
});

test("nenhum marcar() da fila carimba status que o banco recusa", () => {
  const literais = [...fila.matchAll(/marcar\([^,)]+,\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(literais.length > 0, "não achei chamada de marcar() com status literal");
  for (const s of literais) {
    assert.ok(ehStatusDeFila(s), `marcar(..., "${s}") — valor fora do CHECK, a linha fica pendente`);
  }
});

test("o desfecho do envio passa por statusNaFila, nunca cru", () => {
  assert.match(fila, /marcar\(item\.id,\s*statusNaFila\(desfecho\)/);
  assert.doesNotMatch(fila, /marcar\([^)]*"sem_confirmacao"/);
});

test("marcar() LÊ o erro do update — engolir foi metade do incidente", () => {
  const corpo = fila.slice(fila.indexOf("async function marcar("));
  const fim = corpo.indexOf("async function cancelarRestoDaSequencia");
  const trecho = fim > 0 ? corpo.slice(0, fim) : corpo;
  assert.match(trecho, /const \{ error \}/, "marcar() não lê o retorno do update");
  assert.match(trecho, /console\.error/, "marcar() falha calado");
});

test("a tentativa é contada ANTES do envio", () => {
  const iTent = fila.indexOf("tentativas: (item.tentativas");
  const iEnvio = fila.indexOf("if (item.tipo === \"dm\") await enviarDm");
  assert.ok(iTent > 0, "a fila não conta tentativa nenhuma");
  assert.ok(iTent < iEnvio, "a tentativa é contada depois do envio — função cortada no meio reenvia");
});

test("linha tentada duas vezes e ainda pendente para de tentar", () => {
  assert.match(fila, /item\.tentativas \?\? 0\) >= 2/);
  assert.match(fila, /\.select\("id, perfil_id[^"]*tentativas"\)/);
});
