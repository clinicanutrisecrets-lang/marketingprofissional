/**
 * Campanha de Black Friday nos pacotes de domingo (Aline, 23/10/2026).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aplicarCampanhaBlackFriday,
  blocoBlackFriday,
  dataDoSlot,
  diasAteBlackFriday,
  postsDeBlackFriday,
  validarBlackFridayDaConta,
} from "./campanha-black-friday.ts";
import { validarPreferenciasScanner } from "./preferencias-scanner.ts";

const slot = (dia: number, tipo: string, angulo = "educativo_ciencia", papel = "Explica algo.") => ({
  dia,
  tipo,
  angulo,
  papel,
  instrucao: "INSTRUÇÃO ORIGINAL",
});
const semana = () => [
  slot(1, "feed_carrossel"),
  slot(3, "reels"),
  slot(5, "feed_imagem", "divulgacao_produto"),
  slot(1, "stories", "bastidor_da_nutri"),
];

test("ritmo: 1, 1, 2, 3 e 3 posts, do pacote de 25/10 ao de 22/11", () => {
  assert.deepEqual(
    ["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"].map(postsDeBlackFriday),
    [0, 1, 1, 2, 3, 3, 0],
  );
  assert.equal(dataDoSlot("2026-11-23", 5), "2026-11-27");
  assert.equal(dataDoSlot("2026-11-23", 0), "2026-11-29");
  assert.equal(diasAteBlackFriday("2026-11-24"), 3);
});

test("semana de 26/10: um post só, o comercial, em antecipação leve", () => {
  const { slots, posts } = aplicarCampanhaBlackFriday(semana(), { semanaRef: "2026-10-26", prefs: null, conta: null });
  assert.equal(posts, 1);
  const bf = slots.filter((s) => s.papel.startsWith("Black Friday"));
  assert.equal(bf.length, 1);
  assert.equal(bf[0]!.angulo, "divulgacao_produto");
  assert.match(bf[0]!.instrucao, /ANTECIPAÇÃO LEVE/);
  assert.match(bf[0]!.instrucao, /INSTRUÇÃO ORIGINAL\n\nPRIORIDADE: neste post vale a regra da BLACK FRIDAY/);
  // Stories só nas duas últimas semanas.
  assert.equal(slots.find((s) => s.tipo === "stories")!.instrucao, "INSTRUÇÃO ORIGINAL");
});

test("semana de 23/11, só no dia: contagem real e 'é hoje' na sexta; sábado e domingo ficam fora", () => {
  const base = [...semana(), slot(6, "feed_carrossel"), slot(0, "feed_carrossel")];
  const { slots, posts } = aplicarCampanhaBlackFriday(base, { semanaRef: "2026-11-23", prefs: null, conta: null });
  assert.equal(posts, 3);
  assert.match(slots[0]!.instrucao, /faltam 4 dias|REVELE O BÔNUS/);
  assert.match(slots[1]!.instrucao, /faltam 2 dias/);
  assert.match(slots[2]!.instrucao, /É HOJE/);
  assert.equal(slots[4]!.instrucao, "INSTRUÇÃO ORIGINAL"); // 28/11
  assert.equal(slots[5]!.instrucao, "INSTRUÇÃO ORIGINAL"); // 29/11
  assert.match(slots[3]!.instrucao, /contagem regressiva/i);
});

test("o bônus é a Leitura Epigenética Funcional para todo mundo; o dela entra junto só se não for promoção", () => {
  const prefs = validarPreferenciasScanner({
    datas: [{ chave: "black_friday-2026", nome: "Black Friday", data: "2026-11-27", escolha: "promocao", condicao: "bônus de um retorno em 30 dias", produto: "DNA 360" }],
  });
  const { slots } = aplicarCampanhaBlackFriday(semana(), { semanaRef: "2026-11-16", prefs, conta: null });
  const bf = slots.find((s) => s.papel.startsWith("Black Friday"))!;
  assert.match(bf.instrucao, /Leitura Epigenética Funcional/);
  assert.match(bf.instrucao, /bônus de um retorno em 30 dias/);
  const ruim = validarPreferenciasScanner({
    datas: [{ chave: "black_friday-2026", nome: "Black Friday", data: "2026-11-27", escolha: "promocao", condicao: "20% de desconto", produto: "DNA 360" }],
  });
  const r = aplicarCampanhaBlackFriday(semana(), { semanaRef: "2026-11-16", prefs: ruim, conta: null });
  assert.doesNotMatch(r.slots.map((s) => s.instrucao).join("\n"), /20% de desconto/);
});

test("quem respondeu 'nenhuma' para a Black Friday fica fora", () => {
  const prefs = validarPreferenciasScanner({
    datas: [{ chave: "black_friday-2026", nome: "Black Friday", data: "2026-11-27", escolha: "nenhuma" }],
  });
  const { slots, posts } = aplicarCampanhaBlackFriday(semana(), { semanaRef: "2026-11-16", prefs, conta: null });
  assert.equal(posts, 0);
  assert.ok(slots.every((s) => s.instrucao === "INSTRUÇÃO ORIGINAL"));
});

test("mês todo: já está valendo, últimos dias, e o link da página dela no CTA", () => {
  const conta = validarBlackFridayDaConta({ modo: "mes_todo", link: "https://tratamentos.scannerdasaude.com/ana/dna-360-black-friday" });
  const { slots } = aplicarCampanhaBlackFriday(semana(), { semanaRef: "2026-10-26", prefs: null, conta });
  const bf = slots.find((s) => s.papel.startsWith("Black Friday"))!;
  assert.match(bf.instrucao, /JÁ ESTÁ VALENDO/);
  assert.match(bf.instrucao, /https:\/\/tratamentos\.scannerdasaude\.com\/ana\/dna-360-black-friday/);
  assert.match(blocoBlackFriday({ dias: 2, modo: "mes_todo", link: null, bonusDela: null }), /ÚLTIMOS DIAS: faltam 2 dias/);
  // Sem página, nada de link do catálogo: chama pro direct.
  assert.match(blocoBlackFriday({ dias: 20, modo: "so_dia", link: null, bonusDela: null }), /direct/);
  // Link torto não passa.
  assert.equal(validarBlackFridayDaConta({ modo: "x", link: "javascript:alert(1)" })?.link, null);
  assert.equal(validarBlackFridayDaConta({ modo: "x" })?.modo, "so_dia");
});

test("texto da campanha: sem travessão, sem IA, sem palavra de promoção como pedido", () => {
  for (const dias of [30, 10, 3, 1, 0])
    for (const modo of ["so_dia", "mes_todo"] as const) {
      const t = blocoBlackFriday({ dias, modo, link: null, bonusDela: null });
      assert.ok(!t.includes("—"), "travessão");
      assert.doesNotMatch(t, /\bIA\b|intelig[êe]ncia artificial/i);
    }
});

test("ligação: o pacote de domingo aplica a campanha e o sync traz a página dela", () => {
  const sem = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.match(sem, /aplicarCampanhaBlackFriday\(/);
  assert.match(sem, /prefsScanner\?\.black_friday/);
  const prefs = validarPreferenciasScanner({ datas: [], black_friday: { modo: "mes_todo", link: null } });
  assert.equal(prefs?.black_friday?.modo, "mes_todo");
});
