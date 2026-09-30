import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { VIDEOS_METODOLOGIA, roteiroComoTexto } from "./metodologia.ts";

const PUBLIC = join(import.meta.dirname, "../../../public");

test("todo vídeo e pôster do catálogo existe em public/", () => {
  for (const v of VIDEOS_METODOLOGIA) {
    assert.ok(existsSync(join(PUBLIC, v.arquivo)), `falta ${v.arquivo}`);
    assert.ok(existsSync(join(PUBLIC, v.poster)), `falta ${v.poster}`);
  }
});

test("texto que vai pra legenda da profissional: sem travessão, sem IA, sem marca", () => {
  for (const v of VIDEOS_METODOLOGIA) {
    const tudo = [v.titulo, v.resumo, ...v.comoUsar, v.legenda, roteiroComoTexto(v)].join("\n");
    assert.ok(!/[—–]/.test(tudo), `${v.id}: travessão`);
    assert.ok(!/\bIA\b|intelig[êe]ncia artificial/i.test(tudo), `${v.id}: IA`);
    assert.ok(!/nutri\s*secrets|scanner da sa[úu]de|@nutri_secrets/i.test(tudo), `${v.id}: marca`);
    assert.ok(!/\bcura\b|\bcurar\b|garantid/i.test(tudo), `${v.id}: promessa`);
  }
});

test("roteiro cobre o vídeo em ordem, sem buraco nem sobreposição", () => {
  for (const v of VIDEOS_METODOLOGIA) {
    let fim = 0;
    for (const t of v.roteiro) {
      assert.equal(t.de, fim, `${v.id}: trecho começa em ${t.de}, esperado ${fim}`);
      assert.ok(t.ate > t.de);
      fim = t.ate;
    }
    assert.ok(v.duracaoSeg - fim <= 2, `${v.id}: roteiro para em ${fim}s, vídeo tem ${v.duracaoSeg}s`);
  }
});

test("o roteiro sem tempos cabe no teleprompter (?texto= corta em 4000)", () => {
  for (const v of VIDEOS_METODOLOGIA) assert.ok(roteiroComoTexto(v, false).length < 4000);
});

test("a aba Vídeos mostra a seção pra todo mundo, fora do gate do corte", () => {
  const page = readFileSync(join(import.meta.dirname, "../../app/dashboard/videos/page.tsx"), "utf8");
  assert.match(page, /\n\s*<VideosMetodologiaSection \/>/);
  assert.doesNotMatch(page, /corteIa && <VideosMetodologiaSection/);
});
