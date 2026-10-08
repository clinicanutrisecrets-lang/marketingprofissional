import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  lerTextoArte,
  mesmasPecas,
  normalizarPecasEditadas,
  podeRedesenhar,
} from "./texto-arte-edicao.ts";

const carrossel = [
  { headline: "Seu intestino fala" },
  { headline: "", corpo: "A fibra alimenta as bactérias que produzem butirato." },
  { headline: "Salve este post" },
];

test("lê o texto gravado e recusa formato estranho", () => {
  assert.deepEqual(lerTextoArte(carrossel), carrossel);
  assert.equal(lerTextoArte(null), null);
  assert.equal(lerTextoArte([]), null);
  assert.equal(lerTextoArte(["texto solto"]), null);
});

test("corrigir: limpa travessão e link, mantém o número de slides", () => {
  const r = normalizarPecasEditadas(
    [
      { headline: "Seu intestino — fala" },
      { headline: "", corpo: "Veja em scannerdasaude.com/x a fibra" },
      { headline: "Salve este post" },
    ],
    carrossel,
  );
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.pecas[0]!.headline, "Seu intestino, fala");
  assert.ok(!/scannerdasaude\.com/.test(r.pecas[1]!.corpo ?? ""));
  assert.equal(r.pecas.length, 3);
});

test("corrigir: slide vazio e mudança de tamanho são recusados", () => {
  const vazio = normalizarPecasEditadas([{ headline: "a" }, { headline: " ", corpo: "" }, { headline: "c" }], carrossel);
  assert.equal(vazio.ok, false);
  assert.equal(normalizarPecasEditadas([{ headline: "só um" }], carrossel).ok, false);
});

test("sem mudança não redesenha", () => {
  assert.ok(mesmasPecas(carrossel, JSON.parse(JSON.stringify(carrossel))));
  assert.ok(!mesmasPecas(carrossel, [...carrossel.slice(0, 2), { headline: "Outro" }]));
});

test("só post em revisão, ainda não publicado e com arte do desenhador", () => {
  assert.ok(podeRedesenhar({ status: "aguardando_aprovacao", tipo_post: "feed_carrossel" }));
  assert.ok(podeRedesenhar({ status: "aguardando_aprovacao", tipo_post: "stories" }));
  assert.ok(!podeRedesenhar({ status: "aprovado", tipo_post: "feed_imagem" }));
  assert.ok(!podeRedesenhar({ status: "aguardando_aprovacao", tipo_post: "reels" }));
  assert.ok(!podeRedesenhar({ status: "aguardando_aprovacao", tipo_post: "feed_imagem", data_hora_postado: "2026-10-08" }));
});

test("ligação: a geração guarda o texto, a ação confere dono e a tela mostra o botão", () => {
  const semanal = readFileSync("src/lib/geracao/semanal.ts", "utf8");
  assert.match(semanal, /textoArte = slides;/);
  assert.match(semanal, /textoArte = \[conteudoDaArteUnica\(post\)\];/);
  assert.match(semanal, /texto_arte: textoArte, foto_arte_ref: fotoArteRef/);
  const actions = readFileSync("src/lib/posts/actions.ts", "utf8");
  const acao = actions.slice(actions.indexOf("export async function redesenharArteComTexto"));
  assert.match(acao, /\.eq\("franqueada_id", ctx\.franqueadaId\)/);
  assert.match(acao, /podeRedesenhar\(p\)/);
  assert.match(acao, /normalizarPecasEditadas\(pecasEditadas, original\)/);
  assert.doesNotMatch(acao, /claude|anthropic/i);
  const tela = readFileSync("src/app/dashboard/aprovar/AprovacaoView.tsx", "utf8");
  assert.match(tela, /<TextoDaArte post=\{post\} onUpdate=\{onUpdate\} \/>/);
});
