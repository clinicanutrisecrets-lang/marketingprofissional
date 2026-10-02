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
  const empate = escolherClipe([c("x", {}), c("y", { origem: "biblioteca" })], palavras);
  assert.equal(empate?.id, "y");
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
  assert.match(db, /corteIaLiberadoPara\(/);
});
