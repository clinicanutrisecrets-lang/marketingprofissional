import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { trechosDoReel, indiceNoTempo, palavrasAcesas, trechoApertado } from "./roteiro.ts";

const fonte = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// Formato real do SPEC (o exemplo do prompt de lib/conteudo/reel-animado.ts).
const SPEC = {
  tema: "Cansaço",
  cenas: [
    { tipo: "hook", dur: 4.4, l1: "Seu exame veio normal.", l2: "E você continua cansada." },
    { tipo: "sintoma", dur: 5.4, titulo: "Cansaço que não passa", texto: "Acorda já sem energia." },
    { tipo: "gene", dur: 6.2, gene: "COMT", rs: "rs4680", texto: "Ele limpa o estresse devagar." },
    { tipo: "sinergia", dur: 10.6, titulo: "Prato do foco", itens: [{ nome: "Espinafre cozido" }, { nome: "Cacau 70%" }, { nome: "Ovos" }] },
    { tipo: "inventado", dur: 9, texto: "não existe no motor" },
    { tipo: "virada", dur: 5, l1: "Não é força de vontade.", l2: "É informação.", texto: "" },
    { tipo: "cta", dur: 5, l1: "Quer investigar?", acao1: "ME CHAMA NO DIRECT", l2: "Salve pra depois." },
  ],
};

test("cada cena vira um trecho com os mesmos tempos do vídeo (cena desconhecida sai, como no motor)", () => {
  const t = trechosDoReel(SPEC);
  assert.equal(t.length, 6);
  assert.deepEqual(t.map((x) => x.de), [0, 4.4, 9.8, 16, 26.6, 31.6]);
  assert.equal(t[5]!.ate, 36.6);
  assert.equal(t[0]!.texto, "Seu exame veio normal. E você continua cansada.");
  assert.equal(t[2]!.texto, "O gene COMT. Ele limpa o estresse devagar.");
  assert.equal(t[3]!.texto, "Prato do foco. Espinafre cozido, Cacau 70%, Ovos.");
  assert.ok(!t.some((x) => x.texto.includes("não existe")));
});

test("o teto de 60 s corta as cenas do fim inteiras, igual ao motor", () => {
  const cenas = Array.from({ length: 8 }, (_, i) => ({ tipo: "nota", dur: 9, texto: `Cena ${i}.` }));
  const t = trechosDoReel({ cenas });
  assert.equal(t.length, 6);
  assert.equal(t.at(-1)!.ate, 54);
  // cena acima de 20 s é limitada a 20
  assert.equal(trechosDoReel({ cenas: [{ tipo: "nota", dur: 40, texto: "x" }] })[0]!.ate, 20);
});

test("spec ausente (reel antigo) não quebra: sem trechos", () => {
  assert.deepEqual(trechosDoReel(null), []);
  assert.deepEqual(trechosDoReel({}), []);
});

test("karaokê: trecho no tempo, palavras acesas e aviso de trecho corrido", () => {
  const t = trechosDoReel(SPEC);
  assert.equal(indiceNoTempo(t, 0), 0);
  assert.equal(indiceNoTempo(t, 5), 1);
  assert.equal(indiceNoTempo(t, 99), -1);
  const tr = { de: 10, ate: 14, texto: "um dois três quatro" };
  assert.equal(palavrasAcesas(tr, 10), 0);
  assert.equal(palavrasAcesas(tr, 12), 2);
  assert.equal(palavrasAcesas(tr, 20), 4);
  assert.equal(trechoApertado({ de: 0, ate: 2, texto: "um dois três quatro cinco seis sete" }), true);
  assert.equal(trechoApertado({ de: 0, ate: 4, texto: "um dois três" }), false);
});

test("ligação: o spec é guardado, a página usa a régua e os três lugares têm o botão", () => {
  assert.match(fonte("../conteudo/reel-animado.ts"), /post_id: p\.postId \?\? null, spec \}/);
  assert.match(fonte("../../app/dashboard/narrar/page.tsx"), /trechosDoReel\(r\.spec\)/);
  for (const f of [
    "../../app/dashboard/conteudo/ReelAnimadoSection.tsx",
    "../../app/dashboard/videos/VideosMetodologiaSection.tsx",
    "../../app/dashboard/aprovar/AprovacaoView.tsx",
  ]) {
    assert.match(fonte(f), /\/dashboard\/narrar\?origem=/, f);
  }
  const w = fonte("../../../../../.github/workflows/narrar-video.yml");
  assert.match(w, /atrim=start=/);
  assert.match(w, /-shortest/);
  assert.match(w, /if: failure\(\)/);
});
