import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { acentuarVisivel, acentuarFundo } from "./acentos-visivel.ts";
import { rotuloNicho, rotuloTom, rotuloDeId } from "./rotulos.ts";
import { queixasDaRodada } from "../geracao/jornada.ts";
import { temaDoReelAnimado } from "../geracao/reel-animado-semanal.ts";

const ler = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

test("o rótulo do nicho sai com acento (caso real de 15/10/2026)", () => {
  assert.equal(rotuloNicho("nutricao_funcional"), "nutrição funcional");
  assert.equal(rotuloNicho("saude_feminina"), "saúde feminina");
  assert.equal(rotuloNicho("fertilidade_gestacao"), "fertilidade e gestação");
  assert.equal(rotuloTom("cientifico_acessivel"), "científico acessível");
});

test("nicho que não está no mapa não quebra: vira texto com acento", () => {
  assert.equal(rotuloNicho("saude_mental"), "saúde mental");
  assert.equal(rotuloNicho("nicho_novo"), "nicho novo");
  assert.equal(rotuloNicho(null), "");
  assert.equal(rotuloDeId("teste_genetico"), "teste genético");
});

test("o papel da semana sem queixa declarada usa o rótulo acentuado", () => {
  const [a, b] = queixasDaRodada([], "nutricao_funcional");
  assert.equal(a, "a queixa mais comum de quem procura nutrição funcional");
  assert.equal(b, "outra queixa comum de quem procura nutrição funcional");
  assert.match(temaDoReelAnimado([], "saude_feminina"), /^saúde feminina: /);
  assert.doesNotMatch(ler("../geracao/jornada.ts"), /nicho\.replace\(\/_\/g/);
});

test("rede de segurança: acentua o texto do post", () => {
  assert.equal(
    acentuarVisivel("Voce nao precisa adivinhar: a saude do intestino e a nutricao andam juntas."),
    "Você não precisa adivinhar: a saúde do intestino e a nutrição andam juntas.",
  );
  assert.equal(acentuarVisivel("NAO ESPERE"), "NÃO ESPERE");
});

test("rede de segurança: link, hashtag, @perfil e id interno ficam como estão", () => {
  const t = "Agende: https://tratamentos.scannerdasaude.com/x/consulta-nutrigenetica #saude #nutricao @dra.saude saude_feminina";
  assert.equal(acentuarVisivel(t), t);
  assert.equal(acentuarVisivel("veja scannerdasaude.com/nutrigenetica agora"), "veja scannerdasaude.com/nutrigenetica agora");
});

test("rede de segurança no objeto: campo de hashtag, link e enum não se mexem", () => {
  const r = acentuarFundo({
    copy_legenda: "Voce sabia? A genetica conta.",
    copy_cta: "Comenta SAUDE",
    copy_hashtags: ["#saude", "#nutricao"],
    hashtags: ["#genetica"],
    checkout_url: "https://x.com/saude",
    tipo: "feed_carrossel",
    angulo_copy: "educativo_ciencia",
    slides: ["Nao e destino", "A saude muda"],
  });
  assert.equal(r.copy_legenda, "Você sabia? A genética conta.");
  assert.equal(r.copy_cta, "Comenta SAÚDE");
  assert.deepEqual(r.copy_hashtags, ["#saude", "#nutricao"]);
  assert.deepEqual(r.hashtags, ["#genetica"]);
  assert.equal(r.checkout_url, "https://x.com/saude");
  assert.equal(r.tipo, "feed_carrossel");
  assert.deepEqual(r.slides, ["Não e destino", "A saúde muda"]);
});

test("ligação: geração semanal, posts de venda e stories passam pela rede", () => {
  assert.match(ler("../claude/generate.ts"), /acentuarFundo\(semTravessoesFundo\(JSON\.parse\(cleaned\)\)\)/);
  assert.match(ler("../conteudo/reel-animado.ts"), /acentuarFundo\(semAbreviacaoFundo\(semTravessoesFundo\(spec\)\)\)/);
  assert.match(ler("../geracao/stories-falados-gerar.ts"), /acentuarFundo\(c\.sequencia\)/);
  assert.match(ler("../conteudo/sinergia-semanal.ts"), /acentuarFundo\(c\.conteudo\)/);
  assert.match(ler("../posts/manual.ts"), /acentuarFundo\(semTravessoesFundo\(/);
});

test("o espelho do acento é o mesmo arquivo do scanner-saude (a lista não diverge)", () => {
  const aqui = ler("../acentos-ptbr.ts");
  const lista = aqui.split("`")[1];
  const studio = ler("../../../../aline/src/lib/acentos-ptbr.ts").split("`")[1];
  assert.equal(lista, studio);
});
