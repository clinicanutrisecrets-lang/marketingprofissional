import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  ESTILOS_LEGENDA,
  ESTILO_PADRAO,
  FILTROS,
  FILTRO_PADRAO,
  UPLOAD_MAX_SEG,
  estiloValido,
  estimativaMinutos,
  filtroValido,
} from "./opcoes.ts";

const RAIZ = join(import.meta.dirname, "../../../../..");
const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");

/**
 * 🔴 A trava que importa: os nomes escolhidos na tela têm que existir no
 * worker. Se divergirem, a nutri escolhe "completo", o Python não reconhece e
 * devolve o vídeo SEM filtro — sem erro em lugar nenhum. Só o cliente
 * descobre, olhando o vídeo.
 */
test("todo filtro da tela existe no motor em Python", () => {
  const py = ler("packages/video-filtro/engine/presets.py");
  for (const f of FILTROS) {
    if (f.id === "nenhum") continue;
    assert.ok(
      new RegExp(`"${f.id}"\\s*:`).test(py),
      `o filtro "${f.id}" não está em PRESETS de presets.py`,
    );
  }
  assert.ok(py.includes('"nenhum"'), "presets.py precisa tratar 'nenhum'");
});

test("todo estilo de legenda da tela existe no worker", () => {
  const py = ler("packages/corte-ia/legenda_estilos.py");
  for (const e of ESTILOS_LEGENDA) {
    assert.ok(
      new RegExp(`"${e.id}"\\s*:\\s*\\{`).test(py),
      `o estilo "${e.id}" não está em ESTILOS de legenda_estilos.py`,
    );
  }
});

test("o padrão dos dois lados é o mesmo", () => {
  assert.equal(FILTRO_PADRAO, "nenhum");
  assert.equal(ESTILO_PADRAO, "classica");
  assert.ok(ler("packages/corte-ia/legenda_estilos.py").includes('PADRAO = "classica"'));
});

test("valor inventado cai no padrão em vez de explodir", () => {
  for (const lixo of ["", "  ", "COMPLETO ", "hack", null, undefined, 42, {}]) {
    assert.ok(FILTROS.some((f) => f.id === filtroValido(lixo as unknown)));
    assert.ok(ESTILOS_LEGENDA.some((e) => e.id === estiloValido(lixo as unknown)));
  }
  assert.equal(filtroValido("hack"), "nenhum");
  assert.equal(estiloValido("hack"), "classica");
  // caixa e espaço não podem derrubar a escolha de quem clicou
  assert.equal(filtroValido(" Completo "), "completo");
  assert.equal(estiloValido("EDITORIAL"), "editorial");
});

test("toda opção tem rótulo e ajuda escritos", () => {
  for (const o of [...FILTROS, ...ESTILOS_LEGENDA]) {
    assert.ok(o.rotulo.length > 2, o.id);
    assert.ok(o.ajuda.length > 15, `${o.id} precisa dizer o que faz`);
  }
});

test("o rótulo não promete o que a tela não faz (nada de IA nem estrelinha)", () => {
  // Regra 1 do projeto: na interface é "algoritmo Scanner", e a estrelinha é
  // marca de IA. Vale pros textos que a nutri lê aqui.
  for (const o of [...FILTROS, ...ESTILOS_LEGENDA]) {
    const txt = `${o.rotulo} ${o.ajuda}`;
    assert.ok(!/\bIA\b|intelig[êe]ncia artificial/i.test(txt), o.id);
    assert.ok(!txt.includes("✨"), o.id);
  }
});

test("a estimativa cresce com o filtro e nunca encolhe", () => {
  const [a0, a1] = estimativaMinutos(60, "nenhum");
  const [b0, b1] = estimativaMinutos(60, "completo");
  assert.equal(a0, 3);
  assert.ok(b0 > a0, "com filtro tem que avisar que demora mais");
  assert.ok(b1 > a1);
  assert.ok(b1 >= b0);
  // vídeo mais longo, espera maior
  assert.ok(estimativaMinutos(180, "pele")[0] > estimativaMinutos(30, "pele")[0]);
});

test("o teto do upload é maior que o da gravação, e finito", () => {
  const constantes = ler("apps/franquias/src/lib/corte/constantes.ts");
  const m = constantes.match(/CORTE_MAX_SEG\s*=\s*(\d+)/);
  assert.ok(m);
  assert.ok(UPLOAD_MAX_SEG > Number(m![1]));
  assert.ok(UPLOAD_MAX_SEG <= 300, "acima disso o worker não fecha com filtro");
});

test("o servidor confere a duração por origem, não confia no cliente", () => {
  const actions = ler("apps/franquias/src/lib/corte/actions.ts");
  assert.ok(actions.includes("UPLOAD_MAX_SEG"), "o teto do upload tem que valer no servidor");
  assert.ok(/tetoSeg/.test(actions));
  assert.ok(
    /params\.duracaoSeg > tetoSeg/.test(actions),
    "sem essa checagem, um POST direto manda um vídeo de meia hora pro worker",
  );
});

test("o filtro escolhido chega ao workflow (senão o motor nem é instalado)", () => {
  const actions = ler("apps/franquias/src/lib/corte/actions.ts");
  assert.ok(/inputs:[\s\S]*filtro,/.test(actions));
  const wf = ler(".github/workflows/render-corte.yml");
  assert.ok(wf.includes("filtro:"), "o workflow precisa declarar o input");
  assert.ok(
    /if:\s*inputs\.filtro\s*!=\s*''\s*&&\s*inputs\.filtro\s*!=\s*'nenhum'/.test(wf),
    "instalar o motor de filtro só quando pedido",
  );
});
