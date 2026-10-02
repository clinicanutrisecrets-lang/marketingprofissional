import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  planoDaJornada,
  semanaDaJornada,
  queixasDaRodada,
  produtoDoSlot,
  rotuloEstrategia,
  SEMANAS_DA_JORNADA,
} from "./jornada.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// Segundas reais consecutivas: cobrem as 4 semanas da jornada.
const SEGUNDAS = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
const GLERYSTON = [
  "Composição corporal e peso",
  "Energia, sono e fadiga",
  "Inflamação e dor",
  "Longevidade e prevenção",
];
const PRODUTOS = [
  { nome: "Mapa Genético Nutrimetabólico", scanner_produto_id: "teste_genetico" },
  { nome: "Teste Epigenético", scanner_produto_id: "teste_epigenetico" },
];

test("quatro segundas seguidas percorrem as quatro semanas, sem repetir", () => {
  const ns = SEGUNDAS.map(semanaDaJornada);
  assert.deepEqual([...ns].sort(), [1, 2, 3, 4]);
  for (let i = 1; i < ns.length; i++) assert.equal(ns[i], (ns[i - 1]! % SEMANAS_DA_JORNADA) + 1);
});

test("o primeiro pacote da jornada (semana de 05/10/2026) é a semana 1", () => {
  assert.equal(semanaDaJornada("2026-10-05"), 1);
  assert.equal(semanaDaJornada("2026-10-26"), 4);
  assert.equal(semanaDaJornada("2026-11-02"), 1);
  assert.equal(semanaDaJornada("2026-09-28"), 4, "antes do início segue o ciclo, sem quebrar");
});

test("data inválida cai na semana 1, nunca quebra", () => {
  assert.equal(semanaDaJornada(undefined), 1);
  assert.equal(semanaDaJornada("lixo"), 1);
});

test("queixa de frase livre (longa) nunca vira assunto de post", () => {
  const longa = "Além das questões hormonais e reprodutivas, também acompanho mulheres que apresentam sintomas como cansaço";
  const [a, b] = queixasDaRodada([longa, "Suporte tireoidiano", "Energia, sono e fadiga"], "longevidade", "2026-10-05");
  assert.ok(![a, b].includes(longa));
});

test("sem queixa declarada, o assunto é o nicho", () => {
  const [a] = queixasDaRodada(null, "saude_integrativa");
  assert.match(a, /saude integrativa/);
});

test("a rodada troca o par de queixas a cada 4 semanas", () => {
  const r1 = queixasDaRodada(GLERYSTON, "x", "2026-10-05");
  const r2 = queixasDaRodada(GLERYSTON, "x", "2026-11-02");
  assert.deepEqual(queixasDaRodada(GLERYSTON, "x", "2026-10-26"), r1, "mesma rodada, mesmo par");
  assert.notDeepEqual(r1, r2);
});

test("produto do slot: semana 3 nomeia o genético, semana 4 o epigenético", () => {
  assert.equal(produtoDoSlot(3, PRODUTOS)?.scanner_produto_id, "teste_genetico");
  assert.equal(produtoDoSlot(4, PRODUTOS)?.scanner_produto_id, "teste_epigenetico");
  assert.equal(produtoDoSlot(4, [PRODUTOS[0]!])?.scanner_produto_id, "teste_genetico");
  assert.equal(produtoDoSlot(3, []), null);
});

for (const seg of SEGUNDAS) {
  test(`semana de ${seg}: no máximo 1 comercial, formatos e stories da estratégia`, () => {
    const { estrategia, slots } = planoDaJornada({
      semanaRef: seg,
      diasPostSemana: [1, 2, 3, 4, 5],
      frequenciaReels: "semanal",
      frequenciaStories: "3x_semana",
      produtos: PRODUTOS,
      queixas: GLERYSTON,
      nicho: "longevidade",
    });
    const feed = slots.filter((s) => s.tipo !== "stories");
    assert.equal(feed.length, 5);
    assert.equal(feed[0]!.tipo, "reels");
    assert.equal(feed[1]!.tipo, "feed_carrossel");
    const comerciais = feed.filter((s) => s.angulo === "divulgacao_produto" || s.angulo === "chamada_direta");
    assert.ok(comerciais.length <= 1);
    // Semanas 1 e 2 não vendem.
    if (estrategia.semana <= 2) assert.equal(comerciais.length, 0);
    const stories = slots.filter((s) => s.tipo === "stories");
    assert.equal(stories.length, 3);
    assert.ok(stories[0]!.lembrete, "o 1º stories leva o lembrete da enquete/caixinha/link");
    for (const s of slots) {
      assert.ok(s.instrucao.includes("NÃO DIZER"));
      assert.ok(!s.instrucao.includes("{A}") && !s.instrucao.includes("{B}"));
      assert.ok(!s.papel.includes("{A}"));
      assert.ok(!/—/.test(s.papel + s.instrucao + (s.lembrete ?? "")), "sem travessão");
    }
    assert.match(rotuloEstrategia(estrategia), /^Semana [1-4] de 4: /);
  });
}

test("sem os testes no catálogo, nenhum post de produto e nenhum nome de produto", () => {
  for (const seg of SEGUNDAS) {
    const { slots } = planoDaJornada({ semanaRef: seg, diasPostSemana: [1, 3, 5], produtos: [], queixas: GLERYSTON });
    assert.ok(slots.every((s) => s.angulo !== "divulgacao_produto"));
    assert.ok(slots.every((s) => !s.instrucao.includes("PRODUTO DESTE POST")));
    assert.ok(slots.every((s) => !/^O teste entra pelo nome|^A oferta direta/.test(s.papel)));
  }
});

test("com o teste, o post de produto da semana 3 carrega o nome real do catálogo", () => {
  const seg = SEGUNDAS.find((s) => semanaDaJornada(s) === 3)!;
  const { slots } = planoDaJornada({ semanaRef: seg, diasPostSemana: [1, 3, 5], produtos: PRODUTOS, queixas: GLERYSTON });
  const prod = slots.find((s) => s.angulo === "divulgacao_produto");
  assert.ok(prod);
  assert.match(prod!.instrucao, /PRODUTO DESTE POST: Mapa Genético Nutrimetabólico/);
});

test("objeção vem dissolvida no gancho, nunca como post de resposta", () => {
  const { slots } = planoDaJornada({ semanaRef: SEGUNDAS[0], diasPostSemana: [1, 2, 3], queixas: GLERYSTON });
  for (const s of slots.filter((x) => x.objecao)) {
    assert.match(s.instrucao, /dissolver no GANCHO/);
  }
});

test("ligação: o gerador semanal planeja pela jornada e grava estratégia e papel", () => {
  const src = fonte("./semanal.ts");
  assert.match(src, /planoDaJornada\(/);
  assert.doesNotMatch(src, /planejarSemana\(/);
  assert.match(src, /estrategia:\s*estrategia/);
  assert.match(src, /papel_estrategia:/);
  assert.match(src, /lembrete_execucao:/);
  assert.match(src, /item\.instrucao/);
});
