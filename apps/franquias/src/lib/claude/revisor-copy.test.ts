/**
 * O revisor de copy.
 *
 * Dois perigos, e o segundo é o pior: deixar passar o que quebra a regra, e
 * disparar em texto bom. Alarme falso repetido treina a nutri a ignorar o
 * aviso, e aí passa junto o que importa. Metade destes testes é sobre o que
 * NÃO pode ser sinalizado.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { revisarCopy, temErro, termosDoNaoAtende, normPos } from "./revisor-copy.ts";

const regras = (t: string, ctx = {}) => revisarCopy(t, ctx).map((a) => a.regra);

/* ── o que tem que pegar ────────────────────────────────────────────────── */

test("pega travessão", () => {
  assert.ok(regras("O seu corpo fala — e você não escuta.").includes("travessao"));
});

test('pega "IA" e a estrelinha', () => {
  assert.ok(regras("Gerado com IA pra você.").includes("ia"));
  assert.ok(regras("Feito com inteligência artificial.").includes("ia"));
  assert.ok(regras("Novidade ✨ no consultório").includes("estrelinha"));
});

test("pega promessa de cura", () => {
  assert.ok(regras("Esse protocolo cura a sua enxaqueca.").includes("cura"));
  assert.ok(regras("Vamos curar isso de uma vez.").includes("cura"));
});

test('pega "acaba com" e superlativo', () => {
  assert.ok(regras("Acaba com o inchaço.").includes("promessa_definitiva"));
  assert.ok(regras("O método milagroso que ninguém conta.").includes("superlativo"));
  assert.ok(regras("Resultado 100% garantido.").includes("superlativo"));
});

test("pega resultado com prazo", () => {
  assert.ok(regras("Você emagrece em 30 dias.").includes("resultado_com_prazo"));
  assert.ok(regras("Elimine o inchaço em 2 semanas").includes("resultado_com_prazo"));
});

test("pega antes e depois, e sensacionalismo", () => {
  assert.ok(regras("Olha o antes e depois dela!").includes("antes_e_depois"));
  assert.ok(regras("CUIDADO! esse alimento").includes("sensacionalismo"));
  assert.ok(regras("PARE AGORA de comer isso").includes("sensacionalismo"));
});

test("pega gancho morto só na abertura", () => {
  assert.ok(regras("Você sabia que o intestino fala com o cérebro?").includes("gancho_morto"));
  // no meio do texto é conversa normal, não gancho
  const meio =
    "O seu exame pode estar normal e você seguir cansada. " +
    "Isso acontece porque a faixa do laboratório é estatística. ".repeat(3) +
    "Você sabia que isso tem nome?";
  assert.ok(!regras(meio).includes("gancho_morto"));
});

/* ── o que NÃO pode disparar ────────────────────────────────────────────── */

test("não confunde palavra que CONTÉM os termos", () => {
  // "cura" dentro de "procura", "curativo", "curadoria"
  assert.deepEqual(regras("Ela procura entender a curadoria do curativo."), []);
  // "ia" dentro de mil palavras
  assert.deepEqual(regras("A ciência da microbiota intestinal já mostrou isso."), []);
  // "adeus" existe, "ademais" não é
  assert.deepEqual(regras("Ademais, vale investigar."), []);
});

test("prazo sem promessa de resultado não é achado", () => {
  assert.deepEqual(regras("Respondo o direct em 2 dias, é o meu ritmo."), []);
  assert.deepEqual(regras("A coleta chega em 5 dias pelo correio."), []);
});

test("copy boa não dispara nada", () => {
  const boa =
    "O seu exame pode estar normal e você seguir cansada.\n\n" +
    "A faixa do laboratório é estatística: ela diz onde está a maioria, não onde " +
    "está o seu melhor. Por isso duas pessoas com o mesmo número se sentem " +
    "diferente.\n\nSe isso faz sentido pra você, me chama no direct.";
  assert.deepEqual(revisarCopy(boa), []);
});

test("emoji no texto não desloca o trecho recortado", () => {
  // 🔴 NFD puro deslocaria o índice e o recorte sairia torto.
  const achados = revisarCopy("Bom dia 🌞 amiga, isso cura tudo!");
  assert.equal(achados.length, 1);
  assert.match(achados[0].trecho, /cura/);
});

test("normPos preserva o comprimento em unidades", () => {
  const s = "Coração 💚 à noite";
  assert.equal(normPos(s).length, s.length);
  assert.equal(normPos(s), "coracao 💚 a noite");
});

/* ── o público dela ─────────────────────────────────────────────────────── */

test('os termos do "não atende" saem da lista, sem as palavras genéricas', () => {
  // Caso REAL (Gleryston, conferido no banco em 25/09)
  const t = termosDoNaoAtende("gestante, oncológico, criança, atletas");
  assert.deepEqual(t, ["gestante", "oncologico", "crianca", "atletas"]);

  // Caso REAL em prosa (demo): as genéricas ficam de fora, senão TODO post
  // seria sinalizado por conter "nutricional" ou "alimentar".
  const prosa = termosDoNaoAtende(
    "Não realizo atendimento nutricional esportivo de alta performance, nutrição " +
      "exclusivamente voltada para ganho de massa muscular ou acompanhamento " +
      "nutricional infantil fora do contexto materno e da introdução alimentar.",
  );
  assert.ok(prosa.includes("esportivo"));
  assert.ok(prosa.includes("performance"));
  assert.ok(prosa.includes("infantil"));
  assert.ok(!prosa.includes("nutricional"));
  assert.ok(!prosa.includes("alimentar"));
  assert.ok(!prosa.includes("atendimento"));
});

test("o que ela não atende vira CONFIRA, não erro", () => {
  const a = revisarCopy("Dicas de alimentação na gestação para a sua saúde.", {
    nao_atende: "gestante, oncológico, criança, atletas",
  });
  const achado = a.find((x) => x.regra === "fora_do_publico");
  assert.ok(achado, "devia sinalizar gestação");
  assert.equal(achado!.gravidade, "confira");
  // 🔴 prosa com exceção não dá pra ler por regra: quem decide é ela
  assert.equal(temErro(a), false);
});

test("prefixo casa a flexão, mas não casa palavra curta por acaso", () => {
  // "criança" acha "crianças"
  assert.ok(
    regras("Como alimentar crianças na escola", { nao_atende: "criança" }).includes("fora_do_publico"),
  );
  // termo de 4 letras exige a palavra inteira: "leve" não pode casar "levedura"
  assert.ok(
    !regras("A levedura do intestino", { nao_atende: "leve" }).includes("fora_do_publico"),
  );
});

test("palavra que ELA vetou é erro, não sugestão", () => {
  const a = revisarCopy("Uma dieta restritiva resolve?", { palavras_evitar: "dieta restritiva" });
  const achado = a.find((x) => x.regra === "palavra_vetada");
  assert.ok(achado);
  assert.equal(achado!.gravidade, "erro");
});

test("sem público declarado, nada é inventado", () => {
  // Quem não respondeu o questionário segue livre: apertar por omissão é o
  // outro jeito de errar.
  assert.deepEqual(revisarCopy("Emagrecer com saúde é possível.", {}), []);
});

/* ── preço ──────────────────────────────────────────────────────────────── */

test("preço fora do catálogo é erro; preço real passa", () => {
  const ctx = { precos_reais: ["R$ 3.500,00", "R$ 960,00"] };
  assert.ok(regras("A consulta sai por R$ 197,00", ctx).includes("preco_fora_do_catalogo"));
  assert.deepEqual(regras("O programa é R$ 3.500,00 no cartão", ctx), []);
});

test("sem catálogo carregado, o revisor não acusa preço", () => {
  // Catálogo ausente (undefined) é falta de informação, não prova de invenção.
  assert.deepEqual(regras("A consulta sai por R$ 197,00"), []);
});

/* ── o que o ensaio em 60 posts REAIS ensinou (25/09/2026) ──────────────── */

test('"aí" e "ia" em português não são a sigla IA', () => {
  // 🔴 Casar a palavra sem olhar a caixa deu 16 falsos positivos em 60 posts
  // reais, e ZERO verdadeiros: "E aí", "Foi aí que", "nunca ia mostrar".
  assert.deepEqual(regras("E aí, finalmente dá pra nutrir o que tá pedindo."), []);
  assert.deepEqual(regras("Foi aí que eu entendi o problema."), []);
  assert.deepEqual(regras("Exame básico nunca ia mostrar isso."), []);
  assert.deepEqual(regras("A nutrição age exatamente aí: na causa."), []);
});

test("a sigla em CAIXA ALTA e a expressão por extenso continuam pegando", () => {
  assert.ok(regras("Post gerado por IA pra você.").includes("ia"));
  assert.ok(regras("Feito com inteligência artificial.").includes("ia"));
  assert.ok(regras("FEITO COM INTELIGÊNCIA ARTIFICIAL").includes("ia"));
});

test("veto casa a FRASE inteira, não as palavras dela", () => {
  // Caso REAL: Juliana veta "corpo perfeito" e "antes e depois exagerado".
  // Quebrar em palavras vetaria "corpo" e "depois" e acusaria todo post.
  const dela =
    "não é sobre, é sobre, corpo perfeito, antes e depois exagerado, detox, milagre";
  assert.deepEqual(regras("O corpo que você tem hoje já conta uma história.", { palavras_evitar: dela }), []);
  assert.deepEqual(regras("Três meses depois, ela voltou.", { palavras_evitar: dela }), []);
  // e a frase vetada continua sendo pega
  assert.ok(
    regras("Não é sobre já estar grávida.", { palavras_evitar: dela }).includes("palavra_vetada"),
  );
  assert.ok(regras("Uma solução detox pra você.", { palavras_evitar: dela }).includes("palavra_vetada"));
});

test("veto de uma palavra só continua casando a palavra", () => {
  // Caso REAL: Viviane veta "apoiar, sustentar ".
  assert.ok(
    regras("Alimentação pensada pra sustentar o metabolismo.", {
      palavras_evitar: "apoiar, sustentar ",
    }).includes("palavra_vetada"),
  );
});

test("prazo retrospectivo é narrativa, não promessa", () => {
  // Caso REAL: "6 meses depois, ela voltou dizendo..."
  assert.deepEqual(regras("6 meses depois, ela voltou dizendo que melhorou."), []);
  assert.deepEqual(regras("Dois anos atrás eu não sabia disso."), []);
  // mas a promessa com prazo continua sendo erro
  assert.ok(
    regras("Melhora significativa dos sintomas em 90 dias.").includes("resultado_com_prazo"),
  );
});

test("palavra proibida dentro de uma frase que a nega vira CONFIRA", () => {
  // Caso REAL: "Não porque eu entreguei uma dieta milagrosa."
  const a = revisarCopy("Não porque eu entreguei uma dieta milagrosa.");
  const s = a.find((x) => x.regra === "superlativo");
  assert.ok(s);
  assert.equal(s!.gravidade, "confira");
  // sem a negação, segue erro
  const b = revisarCopy("Entreguei uma dieta milagrosa.");
  assert.equal(b.find((x) => x.regra === "superlativo")!.gravidade, "erro");
});

test("o ponto final da frase não transforma preço certo em preço inventado", () => {
  // 🔴 `[\d.,]*` é guloso: "R$ 9,90." virava "r$9,90." e nunca casava.
  const ctx = { precos_reais: ["R$ 9,90", "R$ 3.500,00"] };
  assert.deepEqual(regras("O app sai por R$ 9,90. Link na bio.", ctx), []);
  assert.deepEqual(regras("São R$ 3.500,00, no cartão.", ctx), []);
  // e o preço que não existe segue sendo pego
  assert.ok(regras("Sai por R$ 1.550,00. Link na bio.", ctx).includes("preco_fora_do_catalogo"));
});
