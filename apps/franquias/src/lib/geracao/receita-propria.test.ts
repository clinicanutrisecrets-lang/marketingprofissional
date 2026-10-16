import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  adocanteProibido,
  linhasDeIngredientes,
  problemaDaReceita,
  receitaPropriaParaSinergia,
  escolherReceitaPropria,
  type ArquivoReceita,
} from "./receita-propria.ts";

const BASE: ArquivoReceita = {
  id: "a1",
  tipo: "foto_comida",
  url_storage: "https://x/foto.jpg",
  descricao: "Salada de lentilha com limão",
  eh_receita: true,
  receita_ingredientes: "- 1 xícara de lentilha cozida\n- 1 colher de azeite\n\n- suco de meio limão",
  receita_modo_preparo: "Misture a lentilha com o azeite e tempere com o limão na hora de servir.",
};

test("ingredientes: uma linha por item, sem marcador nem linha vazia", () => {
  assert.deepEqual(linhasDeIngredientes(BASE.receita_ingredientes!), [
    "1 xícara de lentilha cozida",
    "1 colher de azeite",
    "suco de meio limão",
  ]);
});

test("adoçante proibido é recusado (regra de adoçantes), estévia e eritritol passam", () => {
  assert.equal(adocanteProibido("2 colheres de Xilitol"), "xilitol");
  assert.equal(adocanteProibido("sucralose a gosto"), "sucralose");
  assert.equal(adocanteProibido("estévia e eritritol"), null);
  const p = problemaDaReceita({ titulo: "Bolo", ingredientes: "farinha\novos\nmaltitol", modo_preparo: "Misture tudo e asse por trinta minutos." });
  assert.match(p!, /maltitol/);
});

test("receita incompleta diz o que falta", () => {
  assert.match(problemaDaReceita({ titulo: "", ingredientes: "a\nb\nc", modo_preparo: "x".repeat(40) })!, /nome/);
  assert.match(problemaDaReceita({ titulo: "X", ingredientes: "a\nb", modo_preparo: "x".repeat(40) })!, /3 ingredientes/);
  assert.match(problemaDaReceita({ titulo: "X", ingredientes: "a\nb\nc", modo_preparo: "mexa" })!, /modo de preparo/);
});

test("vira receita da sinergia só quando ela disse sim e a receita serve", () => {
  const r = receitaPropriaParaSinergia(BASE)!;
  assert.equal(r.chave, "propria:a1");
  assert.equal(r.foto_url, "https://x/foto.jpg");
  assert.equal(r.titulo, "Salada de lentilha com limão");
  assert.equal(r.ingredientes.length, 3);
  assert.equal(receitaPropriaParaSinergia({ ...BASE, eh_receita: false }), null);
  assert.equal(receitaPropriaParaSinergia({ ...BASE, eh_receita: null }), null);
  assert.equal(receitaPropriaParaSinergia({ ...BASE, tipo: "foto_post" }), null);
  assert.equal(receitaPropriaParaSinergia({ ...BASE, receita_ingredientes: "xilitol\na\nb" }), null);
});

test("cada receita dela entra uma vez só", () => {
  const b = { ...BASE, id: "a2" };
  assert.equal(escolherReceitaPropria([BASE, b], [])!.chave, "propria:a1");
  assert.equal(escolherReceitaPropria([BASE, b], ["propria:a1"])!.chave, "propria:a2");
  assert.equal(escolherReceitaPropria([BASE, b], ["propria:a1", "propria:a2"]), null);
});

test("a sinergia procura a receita dela ANTES do banco do Scanner", () => {
  const s = readFileSync(join(import.meta.dirname, "sinergia-da-semana.ts"), "utf8");
  const iPropria = s.indexOf("receitaPropriaDaConta(admin");
  const iScanner = s.indexOf("buscarReceitaSinergia({");
  assert.ok(iPropria > 0 && iScanner > iPropria);
  assert.match(s, /\.eq\("eh_receita", true\)/);
});

test("a ação de salvar recusa pela mesma régua", () => {
  const s = readFileSync(join(import.meta.dirname, "..", "arquivos", "actions.ts"), "utf8");
  assert.match(s, /problemaDaReceita\(/);
});
