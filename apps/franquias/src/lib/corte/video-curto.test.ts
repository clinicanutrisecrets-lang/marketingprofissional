/**
 * Vídeo curto: clipe da biblioteca + frase em cima (Aline, 22/09/2026).
 *
 * Roda sem instalar nada:
 *   node --experimental-strip-types --test src/lib/corte/video-curto.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { avaliarFrase, duracaoFinal, origemValida, DUR_MAX, DUR_MIN, DUR_PADRAO, FRASE_MAX } from "./video-curto.ts";

const RAIZ = join(import.meta.dirname, "../../../../..");
const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");

test("frase vazia é recusada com o que fazer", () => {
  for (const v of ["", "   ", "\n\t"]) {
    const r = avaliarFrase(v);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.msg, /Escreva a frase/);
  }
});

test("frase longa diz quanto passou, em vez de só recusar", () => {
  const r = avaliarFrase("a".repeat(200));
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.msg, /200/);
    assert.match(r.msg, new RegExp(String(FRASE_MAX)));
  }
});

test("espaço sobrando não conta como tamanho", () => {
  const r = avaliarFrase("  o   seu   intestino  ");
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.frase, "o seu intestino");
});

test("REGRESSÃO: a duração nunca passa do clipe", () => {
  // Repetir ou congelar o último quadro entrega vídeo travado.
  assert.equal(duracaoFinal(10, 6), 6);
  assert.equal(duracaoFinal(null, 3.2), 3.2);
});

test("teto, piso e padrão do formato", () => {
  assert.equal(duracaoFinal(999, 60), DUR_MAX);
  assert.equal(duracaoFinal(0.1, 60), DUR_MIN);
  assert.equal(duracaoFinal(null, 60), DUR_PADRAO);
});

test("clipe sem duração conhecida não zera o vídeo", () => {
  assert.equal(duracaoFinal(8, null), 8);
  assert.equal(duracaoFinal(8, 0), 8);
});

test("origem desconhecida cai na biblioteca dela, nunca no acervo", () => {
  assert.equal(origemValida("acervo"), "acervo");
  assert.equal(origemValida("biblioteca"), "biblioteca");
  assert.equal(origemValida("qualquer"), "biblioteca");
  assert.equal(origemValida(undefined), "biblioteca");
});

test("REGRESSÃO: a régua do app e a do worker não podem divergir", () => {
  // Os números vivem nos dois lados de propósito (a tela recusa antes de
  // gastar worker; o worker recusa mesmo sem passar pela tela). Divergir
  // faria a tela aceitar uma frase que o worker devolve como erro.
  const py = ler("packages/corte-ia/clipe_frase.py");
  const num = (nome: string) => {
    const m = py.match(new RegExp(`^${nome}\\s*=\\s*([0-9.]+)`, "m"));
    assert.ok(m, `não achei ${nome} no worker`);
    return Number(m[1]);
  };
  assert.equal(num("FRASE_MAX"), FRASE_MAX);
  assert.equal(num("DUR_MAX"), DUR_MAX);
  assert.equal(num("DUR_MIN"), DUR_MIN);
  assert.equal(num("DUR_PADRAO"), DUR_PADRAO);
});

test("REGRESSÃO: a URL do clipe nunca sai da tela — só o id", () => {
  // Mandar o endereço faria o worker baixar qualquer coisa que pedissem.
  const acao = ler("apps/franquias/src/lib/corte/actions.ts");
  const i = acao.indexOf("criarVideoCurtoAction");
  const corpo = acao.slice(i);
  assert.doesNotMatch(corpo.split("export async function")[0]!, /clipeUrl|clipe_url/);
  assert.match(corpo, /clipe_video_id: params\.clipeId/);
  // E a conferência de dono antes de gastar uma rodada de worker.
  assert.match(corpo, /franqueada_id", f\.id/);
  assert.match(corpo, /não está na sua biblioteca/);

  const tela = ler("apps/franquias/src/app/dashboard/videos/VideoCurtoSection.tsx");
  assert.doesNotMatch(tela, /\burl\b\s*:/);
});

test("LIGAÇÃO: o worker desvia pro modo clipe antes de procurar fala", () => {
  const py = ler("packages/corte-ia/pipeline.py");
  assert.match(py, /modo"\) or "fala"\) == "clipe_frase"/);
  // O desvio tem que vir ANTES de baixar a gravação: no modo clipe não
  // existe origem_path pra baixar.
  const iDesvio = py.indexOf('== "clipe_frase"');
  const iBaixar = py.indexOf("baixar_objeto(BUCKET_ORIGEM");
  assert.ok(iDesvio > 0 && iBaixar > iDesvio, "o desvio precisa vir antes do download da gravação");
  // A URL é resolvida no worker, conferindo de quem é o clipe.
  assert.match(py, /def url_do_clipe/);
  assert.match(py, /franqueada_id": f"eq\.\{franqueada_id\}"/);
});

test("LIGAÇÃO: a tela existe e está atrás do mesmo gate do corte", () => {
  const pagina = ler("apps/franquias/src/app/dashboard/videos/page.tsx");
  assert.match(pagina, /corteIa && <VideoCurtoSection/);
});
