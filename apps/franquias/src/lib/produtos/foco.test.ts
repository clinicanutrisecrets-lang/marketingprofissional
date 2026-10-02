import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ehOfertaNaoVendavel, produtosDaEstrategia } from "./foco.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const T = "https://tratamentos.scannerdasaude.com";

// Linhas REAIS do espelho produtos_scanner (02/10/2026).
const catalogo = [
  { nome: "Consulta Nutrigenética", scanner_produto_id: "teste_genetico", checkout_url: `${T}/clinica-nutri-secrets/consulta-nutrigenetica-dna-360/checkout` },
  { nome: "DNA 360", scanner_produto_id: "teste_genetico", checkout_url: `${T}/mariana/mariana-dna-360/checkout` },
  { nome: "DNA 360", scanner_produto_id: "teste_genetico", checkout_url: `${T}/clinica-nutri-secrets/teste-interno-split-antecipacao/checkout` },
  { nome: "Experiência Clínica — Teste Nutrigenético", scanner_produto_id: "teste_genetico", checkout_url: `${T}/mariana/compra-propria-teste-genetico-27dff962/checkout` },
  { nome: "Teste Epigenético", scanner_produto_id: "teste_epigenetico", checkout_url: `${T}/juliana/compra-propria-teste-epigenetico-fecac9eb/checkout` },
  { nome: "Teste Epigenético", scanner_produto_id: "teste_epigenetico", checkout_url: `${T}/clinica-nutri-secrets/lotus-teste-epigenetico/checkout` },
  { nome: "Mesa", scanner_produto_id: "mesa", checkout_url: `${T}/mariana/mariana-mesa/checkout` },
  { nome: "Consulta Nutricional Avulsa", scanner_produto_id: null, checkout_url: `${T}/mariana/consulta-avulsa/checkout` },
  { nome: "Teste da esteira — uso interno (NÃO VENDER)", scanner_produto_id: "teste_genetico_sandbox", checkout_url: `${T}/clinica-nutri-secrets/teste-esteira-interno/checkout` },
];

test("compra própria, teste interno, peça do Lótus e Experiência nunca são vendáveis", () => {
  const nao = catalogo.filter(ehOfertaNaoVendavel).map((p) => p.checkout_url.split("/").slice(-2, -1)[0]);
  assert.deepEqual(nao, [
    "teste-interno-split-antecipacao",
    "compra-propria-teste-genetico-27dff962",
    "compra-propria-teste-epigenetico-fecac9eb",
    "lotus-teste-epigenetico",
    "teste-esteira-interno",
  ]);
});

test("oferta comum segue vendável (consulta, app, DNA 360)", () => {
  assert.equal(ehOfertaNaoVendavel(catalogo[1]!), false);
  assert.equal(ehOfertaNaoVendavel(catalogo[6]!), false);
  assert.equal(ehOfertaNaoVendavel(catalogo[7]!), false);
});

test("estratégia da semana: só genético e epigenético vendáveis", () => {
  const foco = produtosDaEstrategia(catalogo).map((p) => p.nome);
  assert.deepEqual(foco, ["Consulta Nutrigenética", "DNA 360"]);
});

test("sem nenhum dos dois, a estratégia fica sem produto (o slot vira autoridade)", () => {
  assert.deepEqual(produtosDaEstrategia(catalogo.slice(6)), []);
});

test("ligação: o gerador semanal filtra pelo foco; o catálogo e a lista manual tiram o não vendável", () => {
  assert.match(fonte("../geracao/semanal.ts"), /produtosDaEstrategia\(\s*await carregarProdutosContexto/);
  assert.match(fonte("./contexto.ts"), /ehOfertaNaoVendavel/);
  assert.match(fonte("./contexto.ts"), /scanner_produto_id/);
  assert.match(fonte("./actions.ts"), /\.filter\(\(p\) => !ehOfertaNaoVendavel/);
});
