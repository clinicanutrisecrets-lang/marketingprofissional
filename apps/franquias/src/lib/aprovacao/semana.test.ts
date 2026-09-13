/**
 * Trava o caso da Juliana (13/09/2026): semana aprovada não desaparece, e
 * aprovação sem post não rouba a tela nem trava a regeneração.
 *
 * As linhas são as REAIS medidas no banco em 13/09 — a de 14/09 com 13 posts
 * aprovada por ela em 08/09, e a carcaça de 17/08 com zero posts que sobrou
 * do onboarding de 11/08.
 *
 * Roda sem instalar nada:
 *   node --experimental-strip-types --test src/lib/aprovacao/semana.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aprovacaoEmRevisao,
  aprovacaoFechada,
  aprovacaoVazia,
  escolherAprovacao,
  legendaParaCopiar,
  mensagemSemanaJaMontada,
  nomeArquivoDaArte,
  publicacaoAutomaticaLigada,
  semanasVisiveis,
} from "./semana.ts";

const JULIANA = [
  { id: "2cbcd8d3", semana_ref: "2026-09-14", status: "aprovada_integral", posts: 13 },
  { id: "vazia-1708", semana_ref: "2026-08-17", status: "aguardando", posts: 0 },
];

test("🔴 semana aprovada continua na tela (era o bug da Juliana)", () => {
  const escolhida = escolherAprovacao(JULIANA);
  assert.equal(escolhida?.id, "2cbcd8d3");
  assert.equal(aprovacaoFechada(escolhida?.status), true);
});

test("🔴 aprovação sem post nenhum é resíduo: não aparece e não é escolhida", () => {
  assert.equal(aprovacaoVazia({ posts: 0 }), true);
  assert.equal(aprovacaoVazia({ posts: 13 }), false);
  const visiveis = semanasVisiveis(JULIANA);
  assert.deepEqual(
    visiveis.map((v) => v.id),
    ["2cbcd8d3"],
  );
});

test("pendente vem antes de aprovada, e a mais recente antes da antiga", () => {
  const cands = [
    { id: "velha-aprovada", semana_ref: "2026-08-31", status: "aprovada_integral", posts: 6 },
    { id: "nova-aprovada", semana_ref: "2026-09-14", status: "aprovada_integral", posts: 13 },
    { id: "pendente", semana_ref: "2026-09-07", status: "aguardando", posts: 8 },
  ];
  assert.equal(escolherAprovacao(cands)?.id, "pendente");
  assert.equal(
    escolherAprovacao(cands.filter((c) => c.status === "aprovada_integral"))?.id,
    "nova-aprovada",
  );
  // não mexe na lista de quem chamou
  assert.equal(cands[0]!.id, "velha-aprovada");
});

test("a nutri pode abrir uma semana anterior pelo id, se ela tiver post", () => {
  const cands = [
    { id: "atual", semana_ref: "2026-09-14", status: "aguardando", posts: 8 },
    { id: "passada", semana_ref: "2026-09-07", status: "aprovada_integral", posts: 6 },
    { id: "carcaca", semana_ref: "2026-08-17", status: "aguardando", posts: 0 },
  ];
  assert.equal(escolherAprovacao(cands, "passada")?.id, "passada");
  // id que não é dela, ou semana vazia: cai no padrão em vez de tela vazia
  assert.equal(escolherAprovacao(cands, "de-outra-nutri")?.id, "atual");
  assert.equal(escolherAprovacao(cands, "carcaca")?.id, "atual");
});

test("recusada não volta pra tela; sem nada visível, devolve null", () => {
  assert.equal(
    escolherAprovacao([{ id: "r", semana_ref: "2026-09-14", status: "recusada", posts: 5 }]),
    null,
  );
  assert.equal(escolherAprovacao([]), null);
  assert.equal(aprovacaoEmRevisao("aprovada_com_edicoes"), true);
  assert.equal(aprovacaoEmRevisao("aprovada_integral"), false);
});

test("a mensagem de semana já montada diz QUAL semana e o estado dela", () => {
  const fechada = mensagemSemanaJaMontada({
    semanaRef: "2026-09-14",
    status: "aprovada_integral",
    posts: 13,
  });
  assert.match(fechada, /14\/09/);
  assert.match(fechada, /13 posts/);
  assert.match(fechada, /aprovou/);
  assert.doesNotMatch(fechada, /status:/);

  const pendente = mensagemSemanaJaMontada({
    semanaRef: "2026-09-14",
    status: "aguardando",
    posts: 1,
  });
  assert.match(pendente, /1 post\b/);
  assert.match(pendente, /revisão/);
});

test("legenda copiada leva CTA e hashtags, sem repetir o CTA que já está no texto", () => {
  assert.equal(
    legendaParaCopiar({
      copy_legenda: "Seu intestino fala.",
      copy_cta: "Agende sua consulta",
      hashtags: ["microbiota", "#saude"],
    }),
    "Seu intestino fala.\n\nAgende sua consulta\n\n#microbiota #saude",
  );
  assert.equal(
    legendaParaCopiar({
      copy_legenda: "Seu intestino fala. Agende sua consulta",
      copy_cta: "Agende sua consulta",
      hashtags: null,
    }),
    "Seu intestino fala. Agende sua consulta",
  );
  assert.equal(legendaParaCopiar({}), "");
});

test("o arquivo baixado diz o tipo e o dia do post, e mantém a extensão", () => {
  assert.equal(
    nomeArquivoDaArte(
      { tipo_post: "feed_imagem", data_hora_agendada: "2026-09-14T08:00:00+00:00" },
      "https://x.supabase.co/storage/v1/arte.jpg?token=abc",
    ),
    "feed-imagem-2026-09-14.jpg",
  );
  assert.equal(
    nomeArquivoDaArte({ tipo_post: "reels" }, "https://x/y/video.mp4"),
    "reels-sem-data.mp4",
  );
  // extensão desconhecida (URL assinada sem nome de arquivo) não vira lixo
  assert.equal(
    nomeArquivoDaArte({ tipo_post: "stories", data_hora_agendada: "2026-09-15" }, "https://x/y/abc"),
    "stories-2026-09-15.png",
  );
});

test("🔴 sem Instagram ligado não se promete publicação automática", () => {
  // as 7 contas do app em 13/09: token nulo em todas
  assert.equal(publicacaoAutomaticaLigada({ instagram_handle: "jullianamendesss" } as never), false);
  assert.equal(
    publicacaoAutomaticaLigada({ instagram_conta_id: "123", instagram_access_token: null }),
    false,
  );
  assert.equal(
    publicacaoAutomaticaLigada({
      instagram_conta_id: "123",
      instagram_access_token: "tok",
      instagram_token_expiry: "2020-01-01T00:00:00Z",
    }),
    false,
  );
  assert.equal(
    publicacaoAutomaticaLigada({
      instagram_conta_id: "123",
      instagram_access_token: "tok",
      instagram_token_expiry: "2030-01-01T00:00:00Z",
    }),
    true,
  );
  assert.equal(publicacaoAutomaticaLigada({ publer_profile_id: "p1" }), true);
});
