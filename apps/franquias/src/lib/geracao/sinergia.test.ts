import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  conferirConteudo,
  diaDaSinergia,
  ingredientesDoSlide,
  linhaExameValida,
  linhaGeneticaValida,
  tituloDaReceita,
  type ReceitaSinergia,
} from "./sinergia.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

// A receita REAL do poke (receitas 075e54ce), como o Scanner devolve.
const POKE: ReceitaSinergia = {
  chave: "funil:estresse-07",
  foto_url: "https://scannerdasaude.com/materiais/funil/fotos/estresse-07.jpg",
  titulo: "Poke de salmão com guacamole tropical",
  temas: ["estresse"],
  tipo: "receita",
  ingredientes: [
    "200 gramas de filé de salmão fresco sem pele cortado em cubos médios",
    "Opcional: temperar o salmão com shoyu de coco ( Coco Aminos)",
    "Ingredientes guacamole tropical",
    "1 unid de abacate médio levemente amassado com garfo",
    "Raspa e suco de 1 limão taiti",
    "1 unid de manga tommy cortada em cubinhos",
  ],
  modo_preparo: "Hidratar o gojiberry...",
  tempo_min: null,
  rendimento: null,
  compostos: ["omega3"],
};

const nutriente = (nome: string, gen: string, exame: string) => ({
  nome,
  onde: "no salmão",
  texto: "Texto curto do nutriente.",
  microbiota: "Fibra fermentada vira butirato.",
  nutrigenetica: gen,
  exame,
});

const BRUTO = {
  titulo_receita: "Poke de salmão com guacamole tropical",
  tema: "Sinergia contra o estresse",
  subtitulo: "Três nutrientes no mesmo bowl.",
  trio: "Salmão • Abacate • Manga",
  explicacao: "Atuam em frentes diferentes.",
  nutrientes: [
    nutriente("Ômega-3", "FADS1 e FADS2: quem converte pouco aproveita mais o EPA e o DHA prontos.", "PCR ultrassensível."),
    nutriente("Magnésio", "TRPM6: a variante muda quanto magnésio o intestino segura.", "Magnésio eritrocitário."),
    nutriente("Vitamina C", "SLC23A1: a variante muda o transporte da vitamina C.", "Vitamina C plasmática."),
  ],
  ingredientes_idx: [0, 2, 3],
  passos: ["Hidrate o gojiberry.", "Misture o guacamole.", "Monte o bowl."],
  trocas: ["Sardinha no lugar do salmão"],
  fecho: "Juntos rendem mais.",
  legenda: "Legenda — com travessão",
  cta: "Me chama no direct",
  hashtags: ["sinergia", "#nutricao"],
};

test("conteúdo bom passa, e travessão vira vírgula", () => {
  const c = conferirConteudo(BRUTO, POKE);
  assert.equal(c.ok, true);
  if (!c.ok) return;
  assert.equal(c.conteudo.nutrientes.length, 3);
  assert.doesNotMatch(c.conteudo.legenda, /[—–]/);
  assert.deepEqual(c.conteudo.hashtags, ["#sinergia", "#nutricao"]);
});

test("gene fora da lista ou com número derruba a linha; nutriente com menos de 2 linhas derruba o conteúdo", () => {
  assert.equal(linhaGeneticaValida("XYZ9: gene que não está na curadoria."), false);
  assert.equal(linhaGeneticaValida("Sem gene nenhum aqui."), false);
  assert.equal(linhaGeneticaValida("MTHFR e SLC23A1 juntos."), true);
  const ruim = {
    ...BRUTO,
    nutrientes: [
      BRUTO.nutrientes[0],
      BRUTO.nutrientes[1],
      { ...nutriente("Vitamina C", "XYZ9 muda tudo.", "Faixa de 0,4 a 2 mg/dL"), microbiota: "" },
    ],
  };
  const c = conferirConteudo(ruim, POKE);
  assert.equal(c.ok, false);
});

test("sigla de gene com número NÃO é faixa (SLC23A1 virava 23 a 1)", () => {
  assert.equal(linhaExameValida("SLC23A1: a variante muda o transporte."), true);
  assert.equal(linhaExameValida("Ideal entre 30 a 60"), false);
  assert.equal(linhaExameValida("faixa 70-150"), false);
  assert.equal(linhaExameValida("acima de 2,5 mg"), false);
  assert.equal(linhaExameValida("Homocisteína e folato sérico."), true);
});

test("ingredientes do slide são LINHAS da receita, escolhidas pelo índice; cabeçalho sai", () => {
  const l = ingredientesDoSlide(POKE, [0, 2, 3, 99, "x"]);
  assert.deepEqual(l, [POKE.ingredientes[0], POKE.ingredientes[3]]);
  for (const x of l) assert.ok(POKE.ingredientes.includes(x));
  // Sem índice válido: as primeiras linhas, sem o cabeçalho.
  assert.ok(!ingredientesDoSlide(POKE, null).includes("Ingredientes guacamole tropical"));
});

test("o título só pode corrigir acento e maiúscula", () => {
  assert.equal(tituloDaReceita("Shake de amendoas com morango", "Shake de amêndoas com morango"), "Shake de amêndoas com morango");
  assert.equal(tituloDaReceita("Shake de amendoas com morango", "Shake de castanha com morango"), "Shake de amendoas com morango");
});

test("dia do carrossel: o 3º dia de post (o 2º é do reel animado)", () => {
  assert.equal(diaDaSinergia([1, 3, 5]), 5);
  assert.equal(diaDaSinergia([2, 4]), 4);
  assert.equal(diaDaSinergia([]), 4);
});

test("ligação: o pacote de domingo chama a sinergia, guarda a chave e apaga os cards se o worker não sair", () => {
  const s = fonte("./semanal.ts");
  assert.match(s, /buscarReceitaSinergia\(/);
  assert.match(s, /escreverSinergia\(/);
  assert.match(s, /dispararRenderSinergia\(/);
  assert.match(s, /sinergia_chave: r\.receita\.chave/);
  assert.match(s, /delete\(\)\.in\("id", \[carrosselId, \.\.\.storyIds\]\)/);
  const w = fonte("../../../../../.github/workflows/render-sinergia.yml");
  assert.match(w, /if: failure\(\)/);
  assert.match(w, /--falhou/);
});

test("o modelo nunca escreve ingrediente: o prompt pede ÍNDICE e o público entra como fronteira", () => {
  const s = fonte("../conteudo/sinergia-semanal.ts");
  assert.match(s, /ingredientes_idx/);
  assert.match(s, /publico: p\.publico/);
  assert.match(s, /COMPLIANCE_CFN_BR/);
});
