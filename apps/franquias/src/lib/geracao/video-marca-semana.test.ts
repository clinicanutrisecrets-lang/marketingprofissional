import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEOS_MARCA } from "../videos/marca.ts";
import { assuntosNoTexto, diaDoVideoMarca, escolherVideoDaSemana } from "./video-marca-semana.ts";

const base = { videos: VIDEOS_MARCA, jaUsados: new Set<string>() };

test("o tema da semana manda: semana de ansiedade traz o COMT, mesmo num nicho de emagrecimento", () => {
  const id = escolherVideoDaSemana({
    ...base,
    textosDaSemana: ["Ansiedade e compulsão: o mecanismo por trás"],
    textosDoNicho: ["emagrecimento"],
  });
  assert.equal(id, "gene-comt");
});

test("sem tema que case, vale o nicho", () => {
  assert.equal(escolherVideoDaSemana({ ...base, textosDaSemana: [""], textosDoNicho: ["emagrecimento"] }), "gene-fto");
});

test("não repete vídeo que ela já recebeu", () => {
  const id = escolherVideoDaSemana({
    videos: VIDEOS_MARCA,
    jaUsados: new Set(["gene-fto"]),
    textosDaSemana: [],
    textosDoNicho: ["emagrecimento"],
  });
  assert.equal(id, "gene-glp1r-gipr");
});

test("nada cabe: a semana fica sem vídeo", () => {
  assert.equal(escolherVideoDaSemana({ ...base, textosDaSemana: ["receita de bolo"], textosDoNicho: ["esportiva"] }), null);
});

test("assunto curto é palavra inteira: dor não acha dormir", () => {
  assert.equal(assuntosNoTexto(["dor"], "dificuldade para dormir"), 0);
  assert.equal(assuntosNoTexto(["dor"], "dores nas costas"), 1);
  assert.equal(assuntosNoTexto(["emagrec"], "Emagrecimento"), 1);
});

test("todo vídeo do catálogo tem assunto, senão nunca sairia na semana", () => {
  for (const v of VIDEOS_MARCA) assert.ok(v.temas.length > 0, v.id);
});

test("o vídeo vai no último dia de post da semana", () => {
  assert.equal(diaDoVideoMarca([5, 1, 3]), 5);
});

test("o pacote de domingo chama o vídeo da semana", () => {
  const src = readFileSync(join(import.meta.dirname, "semanal.ts"), "utf8");
  assert.match(src, /montarVideoMarcaDaSemana\(/);
});
