import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lerRss, semRepetidas, validarTemas, temaParaPost, BUSCAS_EM_ALTA, REGRAS_RADAR } from "../src/lib/em-alta/radar.ts";

const ler = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const XML = `<rss><channel>
<item><title>Kim Kardashian revela diagnóstico de esofagite e teme doença grave - Globo</title><link>https://g1/x</link><pubDate>Mon</pubDate><source url="https://g">Globo</source></item>
<item><title>Kim Kardashian revela diagnóstico de esofagite e teme desenvolver doença - Band</title><link>https://band/y</link><source url="b">Band</source></item>
<item><title>Marjorie Estiano revela hábitos de alimentação em nova série - Terra</title><link>https://t/z</link><source url="t">Terra</source></item>
</channel></rss>`;

test("lê o RSS e tira o veículo do fim do título", () => {
  const m = lerRss(XML);
  assert.equal(m.length, 3);
  assert.equal(m[0]!.titulo, "Kim Kardashian revela diagnóstico de esofagite e teme doença grave");
  assert.equal(m[0]!.fonte, "Globo");
  assert.equal(m[0]!.url, "https://g1/x");
});

test("a mesma notícia em dois veículos fica uma vez", () => {
  assert.equal(semRepetidas(lerRss(XML)).length, 2);
});

test("valida o que o modelo escolheu: índice real, textos e sem travessão", () => {
  const m = semRepetidas(lerRss(XML));
  const r = validarTemas({ temas: [
    { indice: 2, fato: "Marjorie Estiano contou a rotina de alimentação da nova série.", angulo: "Rotina de famoso não é receita: o que funciona depende do seu corpo — e dos seus exames.", assunto: "individualidade metabólica", relevancia: 7 },
    { indice: 9, fato: "não existe", angulo: "não existe nada aqui", assunto: "x", relevancia: 10 },
    { indice: 1, fato: "curto", angulo: "curto", assunto: "x", relevancia: 9 },
  ] }, m);
  assert.equal(r.length, 1);
  assert.doesNotMatch(r[0]!.angulo, /[—–]/);
  assert.match(temaParaPost(r[0]!), /^Marjorie Estiano.*Leitura: /);
});

test("o radar procura cultura (famoso, série, viral) e descarta a dor alheia", () => {
  assert.ok(BUSCAS_EM_ALTA.some((q) => /famos/.test(q)));
  assert.ok(BUSCAS_EM_ALTA.some((q) => /Netflix|série/.test(q)));
  assert.match(REGRAS_RADAR, /DESCARTE: crime, política, morte, câncer/);
  assert.match(REGRAS_RADAR, /Nunca trate o famoso como paciente/);
});

test("cron agendado e o feed mostra o radar", () => {
  assert.match(ler("../vercel.json"), /\/api\/cron\/temas-em-alta/);
  assert.match(ler("../src/app/api/cron/temas-em-alta/route.ts"), /CRON_SECRET/);
  assert.match(ler("../src/app/perfis/[slug]/feed/page.tsx"), /<EmAltaRadar /);
  assert.match(ler("../src/lib/em-alta/actions.ts"), /update\(\{ post_id: r\.postId \}\)/);
});
