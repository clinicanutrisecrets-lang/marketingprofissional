/**
 * Respostas do painel do Scanner no pacote de domingo (Aline, 15/10/2026):
 * data comemorativa (ação com a condição DELA ou só posts) e stories falados.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarPreferenciasScanner,
  dataDaSemana,
  aplicarDataComemorativa,
  frequenciaReelsComVideo,
  temPalavraDePromocao,
} from "./preferencias-scanner.ts";
import { conferirStoriesFalados } from "./stories-falados.ts";

const slots = () => [
  { tipo: "reels", angulo: "educativo", consciencia: "inconsciente", papel: "Tema em alta: x. reconhecer", instrucao: "i0" },
  { tipo: "feed_carrossel", angulo: "educativo", consciencia: "consciente_problema", papel: "mecanismo", instrucao: "i1" },
  { tipo: "feed_imagem", angulo: "chamada_direta", consciencia: "consciente_solucao", papel: "oferta", instrucao: "i2" },
  { tipo: "stories", angulo: "educativo", consciencia: "inconsciente", papel: "st", instrucao: "i3" },
];

const prefs = validarPreferenciasScanner({
  grava_videos: true,
  datas: [
    { chave: "dia_das_maes-2027", nome: "Dia das Mães", data: "2027-05-09", escolha: "promocao", condicao: "bônus de uma consulta\n de retorno", produto: "Consulta Nutrigenética" },
    { chave: "natal-2026", nome: "Natal", data: "2026-12-25", escolha: "so_posts" },
    { chave: "x", nome: "y", data: "2026-12-01", escolha: "inventada" },
  ],
});

test("validação: escolha inventada sai, condição perde a quebra de linha", () => {
  assert.equal(prefs!.datas.length, 2);
  assert.equal(prefs!.datas[0]!.condicao, "bônus de uma consulta de retorno");
  assert.equal(validarPreferenciasScanner(null), null);
});

test("a data entra nas duas semanas antes dela, nunca depois", () => {
  assert.equal(dataDaSemana(prefs, "2027-04-26")?.chave, "dia_das_maes-2027");
  assert.equal(dataDaSemana(prefs, "2027-05-03")?.chave, "dia_das_maes-2027");
  assert.equal(dataDaSemana(prefs, "2027-05-10"), null);
  assert.equal(dataDaSemana(prefs, "2026-12-14")?.chave, "natal-2026");
});

test("bônus vai no post comercial com o texto dela; só posts no carrossel, sem oferta", () => {
  const promo = aplicarDataComemorativa(slots(), dataDaSemana(prefs, "2027-05-03"));
  assert.match(promo.slots[2]!.instrucao, /"bônus de uma consulta de retorno"/);
  assert.match(promo.slots[2]!.instrucao, /NUNCA use as palavras promoção, desconto/);
  const so = aplicarDataComemorativa(slots(), dataDaSemana(prefs, "2026-12-14"));
  assert.match(so.slots[1]!.papel, /^Data comemorativa: Natal/);
  assert.match(so.slots[1]!.instrucao, /não fale de bônus, desconto/);
  // Nunca o post do tema em alta nem stories.
  assert.equal(so.slots[0]!.instrucao, "i0");
  assert.equal(so.slots[3]!.instrucao, "i3");
});

test("grava vídeos garante um reel de câmera", () => {
  assert.equal(frequenciaReelsComVideo("nunca", true), "semanal");
  assert.equal(frequenciaReelsComVideo("nunca", false), "nunca");
  assert.equal(frequenciaReelsComVideo("2x_semana", true), "2x_semana");
});

const fala = (n: number) => Array.from({ length: n }, () => "palavra").join(" ");

test("stories falados: 3, de 20 a 75 palavras, sem rótulo nem travessão", () => {
  const ok = conferirStoriesFalados({
    titulo: "Inchaço",
    stories: [0, 1, 2].map(() => ({ fala: `Gancho: [olha pra câmera] ${fala(30)}`, texto_na_tela: "Você incha no fim do dia?" })),
  });
  assert.ok(ok.ok);
  if (ok.ok) assert.ok(!/gancho|\[/i.test(ok.sequencia.stories[0].fala));
  assert.equal(conferirStoriesFalados({ stories: [{ fala: fala(30), texto_na_tela: "a" }] }).ok, false);
  assert.equal(
    conferirStoriesFalados({ stories: [0, 1, 2].map(() => ({ fala: fala(90), texto_na_tela: "a" })) }).ok,
    false,
  );
});

test("ligação: semanal usa a data e grava os stories; sync espelha; card mostra o roteiro", () => {
  const sem = readFileSync(new URL("./semanal.ts", import.meta.url), "utf8");
  assert.match(sem, /aplicarDataComemorativa\(/);
  assert.match(sem, /prefsScanner\?\.grava_videos === true/);
  assert.match(sem, /roteiro_reels: st\.fala/);
  const sync = readFileSync(new URL("../publico/sync.ts", import.meta.url), "utf8");
  assert.match(sync, /preferencias_scanner/);
  const card = readFileSync(new URL("../../app/dashboard/aprovar/AprovacaoView.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(card, /ehReels && typeof post\.roteiro_reels/);
});

test("código de ética: bônus escrito como promoção ou desconto não vira post", () => {
  for (const ruim of ["10% até dia 8", "desconto de 100 reais", "promoção de Black Friday", "R$ 200 a menos"]) {
    assert.ok(temPalavraDePromocao(ruim), ruim);
    const p = validarPreferenciasScanner({
      datas: [{ chave: "black_friday-2026", nome: "Black Friday", data: "2026-11-27", escolha: "promocao", condicao: ruim, produto: "Consulta Epigenética" }],
    });
    assert.equal(dataDaSemana(p, "2026-11-16"), null, ruim);
  }
  assert.equal(temPalavraDePromocao("bônus de um e-book de receitas saudáveis para sobremesa"), false);
  const bf = validarPreferenciasScanner({
    datas: [{ chave: "black_friday-2026", nome: "Black Friday", data: "2026-11-27", escolha: "promocao", condicao: "bônus de um retorno", produto: "Consulta Epigenética" }],
  });
  assert.equal(dataDaSemana(bf, "2026-11-16")?.nome, "Black Friday");
});
