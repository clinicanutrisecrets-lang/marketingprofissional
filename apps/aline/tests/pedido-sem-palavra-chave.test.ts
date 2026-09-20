/**
 * O defeito do ManyChat que a Aline relatou em 16/09/2026:
 *
 *   "se a pessoa não clica no botão... às vezes ela conversa, ela não apertou
 *    só o botão, só o NUTRA. Ela quis discursar sobre. E aí eu tive que
 *    manualmente mandar pra ela."
 *
 * O nosso robô tinha o MESMO defeito, e pior: o comentário sem a palavra caía
 * no agradecimento genérico, então a pessoa recebia uma simpatia e sumia — a
 * Aline nem ficava sabendo que perdeu a lead.
 *
 * Estes testes travam a rede que fica embaixo da palavra-chave.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidatasPorIntencao,
  casaPalavraChave,
  casarOpcao,
  PREFIXO_PAYLOAD_OPCAO,
  descreverRegra,
  selecionarRegra,
  type Regra,
} from "../src/lib/automacao/regras.ts";
import { lerConfig } from "../src/lib/automacao/config.ts";

function regra(over: Partial<Regra> = {}): Regra {
  return {
    id: "r-glp1",
    nome: "Isca GLP-1",
    ativa: true,
    gatilho: "comentario",
    palavras_chave: ["GLP1", "GLP-1"],
    media_ids: [],
    resposta_publica: null,
    resposta_privada: "Te mandei o material do GLP-1 aqui 💚",
    sequencia_id: null,
    tags_adicionar: [],
    uma_vez_por_contato: false,
    prioridade: 0,
    ...over,
  };
}

const ev = (texto: string) => ({ gatilho: "comentario" as const, texto });

/* ── O caso que ela contou ──────────────────────────────────────────────── */

test("o discurso sem a palavra-chave não casa regra nenhuma (o defeito)", () => {
  const texto =
    "Aline, eu tomo aquela injeção pra emagrecer há 4 meses e tô com muito " +
    "enjoo e perdendo massa. Você tem algum material sobre isso?";
  assert.equal(casaPalavraChave(texto, ["GLP1", "GLP-1"]), false);
  assert.equal(selecionarRegra(ev(texto), [regra()]), null);
});

test("mas a regra entra como candidata pra IA ler a intenção", () => {
  const texto =
    "Aline, eu tomo aquela injeção pra emagrecer há 4 meses e tô com muito " +
    "enjoo e perdendo massa. Você tem algum material sobre isso?";
  const c = candidatasPorIntencao(ev(texto), [regra()]);
  assert.equal(c.length, 1);
  assert.equal(c[0].id, "r-glp1");
});

test("quem digitou a palavra-chave NÃO vai pra IA: resposta instantânea de sempre", () => {
  const texto = "GLP1";
  assert.ok(selecionarRegra(ev(texto), [regra()]));
  assert.deepEqual(candidatasPorIntencao(ev(texto), [regra()]), []);
});

/* ── Os guardas ─────────────────────────────────────────────────────────── */

test("regra já aplicada não volta (uma vez por contato vale na rede também)", () => {
  const r = regra({ uma_vez_por_contato: true });
  const c = candidatasPorIntencao(ev("tomo a canetinha e queria ajuda"), [r], new Set(["r-glp1"]));
  assert.deepEqual(c, []);
});

test("regra sem palavra-chave não entra: ela já casa tudo em selecionarRegra", () => {
  const r = regra({ palavras_chave: [] });
  assert.ok(selecionarRegra(ev("qualquer coisa"), [r]));
  assert.deepEqual(candidatasPorIntencao(ev("qualquer coisa"), [r]), []);
});

test("regra de outro post não entra", () => {
  const r = regra({ media_ids: ["post-123"] });
  const c = candidatasPorIntencao({ gatilho: "comentario", texto: "tomo a canetinha", mediaId: "post-999" }, [r]);
  assert.deepEqual(c, []);
});

test("regra inativa e de outro gatilho não entram", () => {
  const texto = "tomo a canetinha e queria ajuda";
  assert.deepEqual(candidatasPorIntencao(ev(texto), [regra({ ativa: false })]), []);
  assert.deepEqual(candidatasPorIntencao(ev(texto), [regra({ gatilho: "dm" })]), []);
});

test("texto vazio não vira intenção", () => {
  assert.deepEqual(candidatasPorIntencao(ev("   "), [regra()]), []);
});

test("candidatas saem por prioridade, como selecionarRegra", () => {
  const a = regra({ id: "a", prioridade: 5, palavras_chave: ["x"] });
  const b = regra({ id: "b", prioridade: 1, palavras_chave: ["y"] });
  const c = candidatasPorIntencao(ev("tomo a canetinha"), [a, b]);
  assert.deepEqual(c.map((r) => r.id), ["b", "a"]);
});

/* ── O catálogo que a IA lê ─────────────────────────────────────────────── */

test("a descrição diz o NOME e o QUE a regra entrega", () => {
  const d = descreverRegra(regra());
  assert.match(d, /Isca GLP-1/);
  assert.match(d, /material do GLP-1/);
});

test("regra só de tag ainda é descrita pelo nome, sem quebrar", () => {
  assert.equal(descreverRegra(regra({ resposta_privada: null, resposta_publica: null })), "Isca GLP-1");
});

/* ── A chave ────────────────────────────────────────────────────────────── */

test("🔴 nasce LIGADA: config vazia entrega o material sem a palavra-chave", () => {
  assert.equal(lerConfig({}).entender_pedido_sem_palavra, true);
  assert.equal(lerConfig(null).entender_pedido_sem_palavra, true);
});

test("só `false` explícito volta ao casamento por palavra exata", () => {
  assert.equal(lerConfig({ entender_pedido_sem_palavra: false }).entender_pedido_sem_palavra, false);
  assert.equal(lerConfig({ entender_pedido_sem_palavra: true }).entender_pedido_sem_palavra, true);
});

test("a rede independe das chaves gerais: funciona com tudo desligado", () => {
  // É o estado real da conta dela hoje (automacao_config = {}).
  const c = lerConfig({});
  assert.equal(c.agradecer_comentarios, false);
  assert.equal(c.responder_dm_scanner, false);
  assert.equal(c.entender_pedido_sem_palavra, true);
});

/* ── O caso Maísa (print do ManyChat, 16/09/2026) ───────────────────────── */

/**
 * O fluxo perguntou "você é nutricionista?" esperando um CLIQUE. Ela
 * respondeu por escrito, o ManyChat não entendeu, e ela passou a adivinhar a
 * senha: "Nutri.maisantos" → "nutrimaisantos" → "Nutri_secrets" → "Não
 * chegou". A Aline mandou o protocolo na mão.
 *
 * Aqui ficam travados os rótulos REAIS da regra GLP1 e as frases REAIS dela.
 */

const ROTULOS_GLP1 = ["Outro profissional", "Sim, sou nutri", "Não, sou paciente"];
const ULTIMAS = { regra_id: "r-glp1", rotulos: ROTULOS_GLP1 };
const RESPOSTA_MAISA = "Sou nutricionista a 9 anos formação pelo IESB Brasília df";

test("🔴 a resposta escrita da Maísa NÃO casa botão: é por isso que precisa do classificador", () => {
  assert.equal(casarOpcao({ texto: RESPOSTA_MAISA }, ULTIMAS), null);
});

test("o '9 anos' da frase dela não pode ser lido como 'opção 9'", () => {
  // O casamento por número é a string INTEIRA; um 9 no meio da frase não conta.
  assert.equal(casarOpcao({ texto: RESPOSTA_MAISA }, ULTIMAS), null);
  assert.deepEqual(casarOpcao({ texto: "2" }, ULTIMAS), { regraId: "r-glp1", indice: 1 });
  assert.equal(casarOpcao({ texto: "9" }, ULTIMAS), null); // fora da lista de 3
});

test("as três tentativas de adivinhar a senha não casam botão nenhum", () => {
  for (const chute of ["Nutri.maisantos", "nutrimaisantos", "Nutri_secrets"]) {
    assert.equal(casarOpcao({ texto: chute }, ULTIMAS), null, chute);
  }
});

test("quem clica no botão continua no caminho instantâneo", () => {
  const r = casarOpcao({ texto: "", payload: `${PREFIXO_PAYLOAD_OPCAO}r-glp1:1` }, ULTIMAS);
  assert.deepEqual(r, { regraId: "r-glp1", indice: 1 });
});

test("digitar o rótulo exato também casa, sem gastar modelo", () => {
  assert.deepEqual(casarOpcao({ texto: "sim, sou nutri" }, ULTIMAS), { regraId: "r-glp1", indice: 1 });
});

test("🔴 regra já entregue não sai de novo: os chutes dela não viram 4 cópias", () => {
  // As 5 regras da conta são uma_vez_por_contato. Depois da primeira entrega,
  // a rede de intenção não pode reenviar a cada mensagem que ela mandar.
  const r = regra({ uma_vez_por_contato: true, gatilho: "dm" });
  const jaFoi = new Set(["r-glp1"]);
  for (const chute of ["Nutri.maisantos", "nutrimaisantos", "Nutri_secrets", "Não chegou"]) {
    const ev = { gatilho: "dm" as const, texto: chute };
    assert.equal(selecionarRegra(ev, [r], jaFoi), null, chute);
    assert.deepEqual(candidatasPorIntencao(ev, [r], jaFoi), [], chute);
  }
});
