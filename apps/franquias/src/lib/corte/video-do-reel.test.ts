import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fraseDoReel, escolherClipe, palavrasDoAssunto, type ClipeCandidato } from "./video-do-reel.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("a frase é o gancho do reel; sem gancho, a 1ª frase do roteiro; longa demais, nada", () => {
  assert.equal(fraseDoReel({ headline: "Exame normal e o cansaço continua" }), "Exame normal e o cansaço continua");
  assert.equal(fraseDoReel({ roteiro: "Você dorme oito horas e acorda cansada. Isso tem explicação." }), "Você dorme oito horas e acorda cansada.");
  assert.equal(fraseDoReel({ roteiro: "x".repeat(200) }), null);
  assert.equal(fraseDoReel({}), null);
  assert.ok(!fraseDoReel({ headline: "Sono — e energia" })!.includes("—"));
});

const c = (id: string, extra: Partial<ClipeCandidato>): ClipeCandidato => ({ id, origem: "acervo", duracao_seg: 10, ...extra });

test("o clipe mais ligado ao assunto vence; empate vai pro clipe em pé e da biblioteca dela", () => {
  const palavras = palavrasDoAssunto(["Energia, sono e fadiga"]);
  const r = escolherClipe(
    [
      c("a", { tags: ["cozinha", "salada"] }),
      c("b", { tags: ["sono", "cama"], largura_px: 1920, altura_px: 1080 }),
      c("c", { tags: ["sono"], largura_px: 1080, altura_px: 1920 }),
    ],
    palavras,
  );
  assert.equal(r?.id, "c");
  const empate = escolherClipe([c("x", { tags: ["sono"] }), c("y", { tags: ["sono"], origem: "biblioteca" })], palavras);
  assert.equal(empate?.id, "y");
});

test("a frase do vídeo escolhe a imagem: bactéria pede o clipe de bactérias (Aline, 14/10)", () => {
  const clipes = [
    c("pao", { titulo: "Mãos sovando massa de pão" }),
    c("bac", { titulo: "Bactérias ao microscópio", tags: ["microbiota", "intestino"] }),
  ];
  const r = escolherClipe(clipes, palavrasDoAssunto(["Essa bactéria no seu intestino pode ser a causa do seu cansaço"]));
  assert.equal(r?.id, "bac");
});

test("clipe que não mostra nada da frase NÃO entra: melhor sem vídeo que vídeo sem sentido", () => {
  const clipes = [c("pao", { titulo: "Mãos sovando massa de pão" }), c("dna", { titulo: "Hélice de DNA dourada" })];
  assert.equal(escolherClipe(clipes, palavrasDoAssunto(["Você não está exagerando."])), null);
});

test("clipe já usado só perde o EMPATE, nunca passa na frente de um que mostra a frase", () => {
  const clipes = [c("usado", { titulo: "Bactérias ao microscópio" }), c("novo", { titulo: "Mãos sovando massa de pão" })];
  const r = escolherClipe(clipes, palavrasDoAssunto(["Bactéria no intestino"]), new Set(["usado"]));
  assert.equal(r?.id, "usado");
});

test("a frase escrita para o vídeo vence o gancho do reel", () => {
  assert.equal(
    fraseDoReel({ frase: "Essa bactéria no seu intestino pode ser a causa do seu cansaço", headline: "Você não está exagerando." }),
    "Essa bactéria no seu intestino pode ser a causa do seu cansaço",
  );
});

test("clipe curto demais fica de fora; biblioteca vazia devolve null", () => {
  assert.equal(escolherClipe([c("a", { duracao_seg: 2 })], ["sono"]), null);
  assert.equal(escolherClipe([], ["sono"]), null);
});

test("ligação: o gerador semanal enfileira o vídeo do reel e o worker o liga ao post", () => {
  const sem = fonte("../geracao/semanal.ts");
  assert.match(sem, /item\.tipo === "reels"[\s\S]{0,200}enfileirarVideoDoReel\(/);
  const db = fonte("./video-do-reel-db.ts");
  assert.match(db, /post_id: p\.postId/);
  // Aline, 02/10: o vídeo do reel vale pra TODAS as contas, sem o gate da
  // edição automática.
  assert.doesNotMatch(db, /corteIaLiberadoPara/);
});

test("clipe já usado pela conta fica por último: dois reels da semana não repetem o clipe", () => {
  const a = c("dna-azul", { tags: ["gene", "dna"] });
  const b = c("dna-laranja", { tags: ["gene", "dna"] });
  const palavras = palavrasDoAssunto(["O gene que muda tudo"]);
  const primeiro = escolherClipe([a, b], palavras)!;
  const segundo = escolherClipe([a, b], palavras, new Set([primeiro.id]))!;
  assert.notEqual(segundo.id, primeiro.id);
  // Todos usados: ainda entrega um (nunca reel sem vídeo por isso).
  assert.ok(escolherClipe([a, b], palavras, new Set([a.id, b.id])));
});
