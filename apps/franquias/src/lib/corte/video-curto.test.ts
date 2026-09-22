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

import {
  avaliarFrase,
  duracaoFinal,
  origemValida,
  posicaoComFaixaDentro,
  posicaoFaixa,
  DUR_MAX,
  DUR_MIN,
  DUR_PADRAO,
  FRASE_MAX,
  PISO_FAIXA,
  POS_MAX,
  POS_MIN,
  POS_PADRAO,
} from "./video-curto.ts";

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
  // A posição da faixa entra na mesma régua: divergir faria a tela mostrar a
  // frase num lugar e o vídeo sair com ela noutro.
  assert.equal(num("POS_PADRAO"), POS_PADRAO);
  assert.equal(num("POS_MIN"), POS_MIN);
  assert.equal(num("POS_MAX"), POS_MAX);
  assert.equal(num("PISO_FAIXA"), PISO_FAIXA);
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

// --------------------------------------------------------------- posição
test("posição fora da faixa vira o limite, nunca erro", () => {
  // Jogar fora um vídeo inteiro por causa de um número seria pior que
  // desenhar a frase um pouco fora do lugar pedido.
  assert.equal(posicaoFaixa(0), POS_MIN);
  assert.equal(posicaoFaixa(1), POS_MAX);
  assert.equal(posicaoFaixa(-3), POS_MIN);
  assert.equal(posicaoFaixa(99), POS_MAX);
});

test("posição ausente ou sem sentido cai no centro de sempre", () => {
  for (const v of [undefined, null, "", "abc", NaN, Infinity, {}]) {
    assert.equal(posicaoFaixa(v), POS_PADRAO);
  }
});

test("REGRESSÃO: o padrão continua sendo o centro exato", () => {
  // O worker devolve o vídeo byte a byte igual ao de antes desta escolha
  // existir quando a posição é 0.5. Mudar este número redesenha vídeo que
  // já está no ar.
  assert.equal(POS_PADRAO, 0.5);
  assert.equal(posicaoFaixa(0.5), 0.5);
});

test("o arraste para onde a faixa ainda cabe na tela", () => {
  // Faixa de 30% da altura: o centro não pode passar de 0.15 em cima.
  assert.equal(posicaoComFaixaDentro(0.01, 0.3), 0.18);
  assert.equal(posicaoComFaixaDentro(0.05, 0.5), 0.25);
});

test("REGRESSÃO: a faixa nunca encosta na assinatura do pé", () => {
  // O @handle mora no pé do vídeo; faixa por cima dele some com a
  // assinatura. Com faixa alta, o limite de baixo é o piso, não o POS_MAX.
  const h = 0.3;
  const p = posicaoComFaixaDentro(0.99, h);
  assert.ok(p + h / 2 <= PISO_FAIXA + 1e-9, `faixa terminou em ${p + h / 2}`);
  // Faixa baixinha ainda respeita o teto geral.
  assert.equal(posicaoComFaixaDentro(0.99, 0.05), POS_MAX);
});

test("faixa maior que o espaço disponível volta pro centro", () => {
  // Não há posição a escolher: fingir que há entregaria preview mentindo.
  assert.equal(posicaoComFaixaDentro(0.2, 1), POS_PADRAO);
});

test("LIGAÇÃO: a posição escolhida chega ao banco e ao worker", () => {
  const acao = ler("apps/franquias/src/lib/corte/actions.ts");
  const corpo = acao.slice(acao.indexOf("criarVideoCurtoAction"));
  // Quem manda é a régua, não o número que chegou no corpo da requisição.
  assert.match(corpo, /frase_pos: posicaoFaixa\(params\.posicao\)/);

  const py = ler("packages/corte-ia/pipeline.py");
  assert.match(py, /pos=row\.get\("frase_pos"\)/);

  const tela = ler("apps/franquias/src/app/dashboard/videos/VideoCurtoSection.tsx");
  assert.match(tela, /posicao: pos/);
  // O arraste para onde o vídeo para: a tela usa a MESMA conta do worker.
  assert.match(tela, /posicaoComFaixaDentro/);
});

test("LIGAÇÃO: a coluna nasce no centro e é aditiva", () => {
  const sql = ler("supabase/migrations/franquias/029_corte_frase_pos.sql");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS frase_pos/);
  assert.match(sql, /DEFAULT 0\.5/);
  // Os limites do banco são os mesmos da régua — senão o insert estoura no
  // CHECK depois de a tela ter dito que estava tudo certo.
  assert.match(sql, new RegExp(`>= ${POS_MIN}`));
  assert.match(sql, new RegExp(`<= ${POS_MAX}`));
});
