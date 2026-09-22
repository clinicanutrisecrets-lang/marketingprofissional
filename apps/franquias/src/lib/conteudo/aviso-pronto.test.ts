/**
 * O aviso "seus conteúdos ficaram prontos" no painel (Aline, 22/09/2026).
 *
 * Roda sem instalar nada:
 *   node --experimental-strip-types --test src/lib/conteudo/aviso-pronto.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { avisoConteudoPronto } from "./aviso-pronto.ts";

const SEMANA = "2026-09-21";
const cheia = { id: "a1", semana_ref: SEMANA, status: "aguardando", posts: 9 };

test("semana em revisão avisa e leva pra tela de aprovar", () => {
  const a = avisoConteudoPronto({ aprovacao: cheia, pedidosAtendidos: [] });
  assert.ok(a);
  assert.equal(a.href, "/dashboard/aprovar");
  assert.match(a.detalhe, /9 posts/);
});

test("quando o pedido dela entrou, o aviso diz o assunto que ela pediu", () => {
  const a = avisoConteudoPronto({
    aprovacao: cheia,
    pedidosAtendidos: [{ tema: "menopausa e sono", semana: SEMANA }],
  });
  assert.ok(a);
  assert.match(a.titulo, /que você pediu/);
  assert.match(a.detalhe, /menopausa e sono/);
});

test("pedido de outra semana não entra no aviso desta", () => {
  const a = avisoConteudoPronto({
    aprovacao: cheia,
    pedidosAtendidos: [{ tema: "intestino", semana: "2026-09-07" }],
  });
  assert.ok(a);
  assert.doesNotMatch(a.detalhe, /intestino/);
});

test("três assuntos saem em lista, e o quarto vira contagem", () => {
  const a = avisoConteudoPronto({
    aprovacao: cheia,
    pedidosAtendidos: ["a", "b", "c", "d"].map((t) => ({ tema: t, semana: SEMANA })),
  });
  assert.ok(a);
  assert.match(a.detalhe, /a, b e c e mais 1/);
});

test("REGRESSÃO: aprovação SEM post nenhum não vira aviso", () => {
  // A linha de aprovação nasce antes dos posts; geração que falha no meio
  // deixa a carcaça. Avisar ali manda a nutri pra uma tela vazia — foi
  // exatamente o que aconteceu com a Juliana em 13/09.
  const a = avisoConteudoPronto({
    aprovacao: { ...cheia, posts: 0 },
    pedidosAtendidos: [{ tema: "menopausa", semana: SEMANA }],
  });
  assert.equal(a, null);
});

test("REGRESSÃO: semana já aprovada não fica pedindo aprovação", () => {
  // O aviso some pela AÇÃO que ele pede. Se continuasse depois de aprovada,
  // ela clicaria de novo achando que faltou alguma coisa.
  for (const status of ["aprovada_integral", "recusada", "", null]) {
    assert.equal(
      avisoConteudoPronto({ aprovacao: { ...cheia, status }, pedidosAtendidos: [] }),
      null,
      `status "${status}" não deveria avisar`,
    );
  }
});

test("sem aprovação nenhuma, sem aviso", () => {
  assert.equal(avisoConteudoPronto({ aprovacao: null, pedidosAtendidos: [] }), null);
});

test("aprovada_com_edicoes ainda espera ela, então avisa", () => {
  assert.ok(
    avisoConteudoPronto({
      aprovacao: { ...cheia, status: "aprovada_com_edicoes" },
      pedidosAtendidos: [],
    }),
  );
});

test("o aviso não escreve travessão", () => {
  // Regra do projeto: texto que a profissional lê não usa travessão.
  const a = avisoConteudoPronto({
    aprovacao: cheia,
    pedidosAtendidos: [{ tema: "sono", semana: SEMANA }],
  });
  assert.ok(a);
  assert.doesNotMatch(`${a.titulo} ${a.detalhe} ${a.acao}`, /[—–]/);
});

test("LIGAÇÃO: o painel desenha o aviso, e a consulta vive num arquivo só", () => {
  const raiz = join(import.meta.dirname, "../../../../..");
  // Sem os comentários: a explicação do código cita `total_posts` de
  // propósito, e a trava é sobre o que se CONSULTA.
  const semComentario = (f: string) =>
    f.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const painel = semComentario(
    readFileSync(join(raiz, "apps/franquias/src/app/dashboard/page.tsx"), "utf8"),
  );
  const db = semComentario(
    readFileSync(join(raiz, "apps/franquias/src/lib/conteudo/aviso-pronto-db.ts"), "utf8"),
  );
  assert.match(painel, /aviso\.href/);
  // 🔴 Desde 22/09 o MESMO aviso aparece no dashboard do Scanner, e a
  // consulta é uma só (aviso-pronto-db). O painel importa; não reimplementa.
  assert.match(painel, /montarAvisoPronto/);
  assert.doesNotMatch(painel, /from\("aprovacoes_semanais"\)/);
  assert.match(db, /avisoConteudoPronto/);
  // `total_posts` fica em 0 em quase toda linha — contar por ela faria a
  // carcaça vazia passar pela trava acima e o aviso voltaria a mentir.
  assert.doesNotMatch(db, /total_posts/);
  assert.match(db, /from\("posts_agendados"\)/);
  // A MESMA escolha da tela "Aprovar semana": o aviso não pode apontar pra
  // uma semana diferente da que o botão abre.
  assert.match(db, /escolherAprovacao/);
});
