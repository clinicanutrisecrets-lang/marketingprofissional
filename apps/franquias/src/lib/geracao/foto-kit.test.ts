import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fotoDoKit, FOTOS_KIT_GENETICO } from "./foto-kit.ts";
import { conteudoDaArteUnica } from "./carrossel-semanal.ts";
import { planoDaJornada } from "./jornada.ts";

test("só o teste genético ganha a foto do kit", () => {
  assert.equal(fotoDoKit({ nome: "DNA 360", scanner_produto_id: "teste_genetico" }, "https://app.x.com"), "https://app.x.com/kit/caixa-aberta.jpg");
  assert.equal(fotoDoKit({ nome: "Epi", scanner_produto_id: "teste_epigenetico" }), null);
  assert.equal(fotoDoKit(null), null);
  for (const f of FOTOS_KIT_GENETICO) assert.ok(existsSync(`public${f}`), f);
});

test("o post do teste carrega o produto e manda explicar o que é antes do nome", () => {
  const { slots } = planoDaJornada({
    semanaRef: "2026-10-19",
    diasPostSemana: [1, 3, 5],
    produtos: [{ nome: "DNA 360", scanner_produto_id: "teste_genetico" }],
    queixas: ["cansaço"],
  });
  const p = slots.find((s) => s.angulo === "divulgacao_produto");
  assert.ok(p, "semana sem post de produto");
  assert.equal(p!.produto?.scanner_produto_id, "teste_genetico");
  assert.match(p!.instrucao, /NÃO sabe o que é "DNA 360"/);
  assert.match(p!.instrucao, /cotonete na boca/);
});

test("story sem subtítulo leva a legenda curta pra arte (story não tem legenda)", () => {
  const c = conteudoDaArteUnica({ headline: "Você não engorda só de noite", copy_legenda: "O corpo já decidiu de manhã." }, "stories");
  assert.equal(c.subtitle, "O corpo já decidiu de manhã.");
  const feed = conteudoDaArteUnica({ headline: "Título", copy_legenda: "Legenda" }, "feed_imagem");
  assert.equal(feed.subtitle, undefined);
});

test("ligação: o pacote usa a foto do kit no feed e na capa do carrossel do teste", () => {
  const s = readFileSync("src/lib/geracao/semanal.ts", "utf8");
  assert.match(s, /baixarFotoDoKit\(item\.produto\)/);
  assert.match(s, /fotoArteRef = kitCapa \? kitCapa\.url/);
  assert.match(s, /frase: post\.frase_video/);
});
