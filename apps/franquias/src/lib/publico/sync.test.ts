/**
 * O público do Scanner chegando aos posts.
 *
 * O defeito que isto trava: a página de venda recebia o público estruturado e
 * o post do Instagram não, então o post não tinha como obedecer "ela não
 * atende gestante".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { validarPublico } from "./publico.ts";
import { blocoPublicoDaCopy } from "../claude/copy-agent.ts";

/** Resposta REAL que o Hub devolve pro Gleryston (conferido em 25/09/2026). */
const doHub = {
  quem: ["Mulheres", "Homens", "60+"],
  idade_min: 18,
  idade_max: 80,
  queixas: ["Composição corporal e peso", "Energia, sono e fadiga", "Suporte tireoidiano"],
  nao_atende: "gestante, oncológico, criança, atletas",
  como_chega: ["instagram", "whatsapp", "indicacao"],
  trata_peso: true,
};

test("o público do Hub vira a fronteira que vai pro prompt", () => {
  const bloco = blocoPublicoDaCopy(validarPublico(doHub)!);
  assert.match(bloco, /O PÚBLICO DELA \(fronteira da copy/);
  assert.match(bloco, /Ela NÃO atende: gestante, oncológico, criança, atletas\. É PROIBIDO/);
  assert.match(bloco, /ÚNICO vocabulário de dor permitido/);
  // ele trata peso: a trava do emagrecimento não pode aparecer
  assert.doesNotMatch(bloco, /NÃO fale de emagrecer/);
});

test("o prompt do post só monta o bloco quando existe público", () => {
  // 🔴 Nove das onze contas do Avançado não responderam o questionário (medido
  // 25/09). Elas não podem ganhar restrição inventada por causa disto, então a
  // montagem é condicional, não um bloco vazio.
  const prompts = readFileSync(new URL("../claude/prompts.ts", import.meta.url), "utf8");
  assert.match(prompts, /\.\.\.\(ctx\.publico \? \["", blocoPublicoDaCopy\(ctx\.publico\)\] : \[\]\)/);
  // e o que já existia continua no prompt
  assert.match(prompts, /CARROSSEIS/);
  assert.match(prompts, /NUCLEO_AGENTE_COPY,/);
});

test("validarPublico descarta o que não tem forma de público", () => {
  assert.equal(validarPublico(null), null);
  assert.equal(validarPublico("texto solto"), null);
  assert.equal(validarPublico({ queixas: [], nao_atende: "" }), null);
  assert.equal(validarPublico({ queixas: [1, 2, 3] }), null);
  // idade fora do mundo real não passa
  const p = validarPublico({ queixas: ["Sono"], idade_min: -5, idade_max: 999 })!;
  assert.equal(p.idade_min, null);
  assert.equal(p.idade_max, null);
});

test("só o que ela NÃO atende já basta pra valer a pena", () => {
  const p = validarPublico({ queixas: [], nao_atende: "atletas" });
  assert.ok(p);
  assert.match(blocoPublicoDaCopy(p!), /É PROIBIDO/);
});

test("texto gigante vindo do outro lado é cortado, não repassado inteiro", () => {
  // Prompt é onde texto estranho vira instrução: o que chega de outro serviço
  // entra com limite.
  const p = validarPublico({ queixas: ["x"], nao_atende: "a".repeat(5000) })!;
  assert.ok(p.nao_atende!.length <= 600);
  const muitas = validarPublico({ queixas: Array(100).fill("queixa") })!;
  assert.ok(muitas.queixas!.length <= 30);
});

test("o cron diário sincroniza o público junto do catálogo", () => {
  const cron = readFileSync(
    new URL("../../app/api/cron/sincronizar-produtos/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(cron, /sincronizarPublicoDoHub/);
  // em bloco próprio: falha no público não pode derrubar a sincronia do preço
  assert.match(cron, /const rp = await sincronizarPublicoDoHub/);
});

test("a geração semanal carrega o público antes de escrever", () => {
  const semanal = readFileSync(new URL("../geracao/semanal.ts", import.meta.url), "utf8");
  assert.match(semanal, /contexto\.publico = await carregarPublicoContexto/);
});

test("a falha do Hub não apaga o que já está espelhado", () => {
  const fonte = readFileSync(new URL("./sync.ts", import.meta.url), "utf8");
  // todo caminho de erro sai por `return { ok: false`, antes do update
  const posUpdate = fonte.indexOf('.update(patch)');
  const trechoAntes = fonte.slice(0, posUpdate);
  for (const motivo of ["scanner_indisponivel", "sem_vinculo_scanner", "plano_nao_elegivel"]) {
    assert.ok(trechoAntes.includes(motivo), `${motivo} devia sair antes do update`);
  }
});
