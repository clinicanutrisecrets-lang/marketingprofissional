import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  slidesDoPostFixo,
  combinacaoDeFotos,
  arquivoDaFoto,
  FOTOS_POST_FIXO,
  CONJUNTOS_POST_FIXO,
  PAPEL_POST_FIXO,
  LEGENDA_POST_FIXO,
} from "./post-fixo.ts";

test("post fixo: 10 slides, capa primeiro e fecho com o link da bio", () => {
  const s = slidesDoPostFixo();
  assert.equal(s.length, 10);
  assert.equal(s[0]!.tipo, "capa");
  const fecho = s[9]!;
  assert.equal(fecho.tipo, "fecho");
  assert.match((fecho as { chamada?: string }).chamada ?? "", /Salve e agende sua consulta no link da bio/);
  assert.match(LEGENDA_POST_FIXO, /link da bio/);
});

test("post fixo: a genética fica (decisão da Aline) e a ciência descomplicada também", () => {
  const texto = JSON.stringify(slidesDoPostFixo());
  assert.match(texto, /Nutrigenética/);
  assert.match(texto, /MTHFR/);
  assert.match(texto, /Ciência descomplicada e profissionalismo em cada prescrição/);
});

test("post fixo: sem travessão, sem 'IA' e sem nome de pessoa do time", () => {
  const texto = JSON.stringify(slidesDoPostFixo()) + LEGENDA_POST_FIXO;
  assert.doesNotMatch(texto, /—/);
  assert.doesNotMatch(texto, /\bIA\b|intelig[eê]ncia artificial/);
  assert.doesNotMatch(texto, /Aline|Nutri Secrets/);
});

test("post fixo: toda foto pedida existe nos quatro conjuntos", () => {
  const usadas = slidesDoPostFixo().flatMap((s) => ("fotoNome" in s ? [s.fotoNome] : []));
  for (const f of usadas) assert.ok((FOTOS_POST_FIXO as readonly string[]).includes(f));
  for (const c of CONJUNTOS_POST_FIXO) {
    for (const f of FOTOS_POST_FIXO) {
      const p = new URL(`../../../public/post-fixo/${arquivoDaFoto(c, f)}`, import.meta.url);
      assert.ok(existsSync(p), `falta ${arquivoDaFoto(c, f)}`);
    }
  }
});

test("post fixo: a combinação de fotos é estável por conta e varia entre contas", () => {
  assert.deepEqual(combinacaoDeFotos("conta-1"), combinacaoDeFotos("conta-1"));
  const distintas = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(combinacaoDeFotos(`c${i}`))));
  assert.ok(distintas.size > 5);
});

test("post fixo: ligado na semana, uma vez por conta pelo papel", () => {
  const semanal = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.match(semanal, /montarPostFixoDaSemana\(/);
  const mont = readFileSync(new URL("./post-fixo-da-semana.ts", import.meta.url), "utf8");
  assert.match(mont, /\.eq\("papel_estrategia", PAPEL_POST_FIXO\)/);
  assert.match(mont, /if \(cErr\) return \{ ok: false/);
  assert.ok(PAPEL_POST_FIXO.length < 300);
});
