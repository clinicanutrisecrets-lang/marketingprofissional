/**
 * Travas do card tipográfico (Aline, 12/09/2026):
 *  - a foto que a profissional sobe entra onde ela escolher (topo, base, ao
 *    lado) e no tamanho que ela escolher, SEM nunca cruzar o bloco de texto;
 *  - `topo` + `media` reproduz a tirinha de sempre (84% × ~22%);
 *  - o line art saiu por completo — e não volta por acidente.
 *
 * Roda sem instalar nada (só a geometria pura de `fotoLayout.ts`):
 *   node --experimental-strip-types --test packages/ai-image/src/cardDesigner.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  colide,
  dentroDoCanvas,
  larguraColunaTexto,
  normalizarFotoLugar,
  normalizarFotoTamanho,
  planejarFoto,
  resolverLugar,
  tamanhoNominalFoto,
  FOTO_LUGAR_PADRAO,
  FOTO_TAMANHO_PADRAO,
  type FotoLugar,
  type FotoTamanho,
  type Rect,
} from "./fotoLayout.ts";

const LUGARES: FotoLugar[] = ["topo", "base", "direita"];
const TAMANHOS: FotoTamanho[] = ["pequena", "media", "grande"];
const CANVASES: Array<[number, number]> = [
  [1080, 1080],
  [1080, 1350],
  [1080, 1920],
];

/** Área útil típica do hero: abaixo de uma logo de 60px, acima do @handle. */
function areaUtil(H: number) {
  return { areaTopo: Math.round(H * 0.07) + 60 + Math.round(H * 0.02), areaBase: H - Math.round(H * 0.12) };
}

test("3 lugares × 3 tamanhos × 3 formatos: foto dentro do canvas e sem cruzar o texto", () => {
  for (const [W, H] of CANVASES) {
    const { areaTopo, areaBase } = areaUtil(H);
    const margemX = Math.round(W * 0.08);
    const gap = Math.round(W * 0.03);
    for (const lugar of LUGARES) {
      for (const tamanho of TAMANHOS) {
        const larguraTexto = lugar === "direita" ? larguraColunaTexto(W, margemX, gap) : Math.round(W * 0.84);
        const alturaTexto = Math.round(H * 0.3); // título + apoio de tamanho comum
        const plano = planejarFoto({ W, H, lugar, tamanho, areaTopo, areaBase, margemX, larguraTexto, alturaTexto, gap });
        const rotulo = `${W}x${H} ${lugar}/${tamanho}`;
        assert.ok(plano.foto, `${rotulo}: com texto comum a foto tem que caber`);
        const foto = plano.foto as Rect;
        assert.ok(dentroDoCanvas(foto, W, H), `${rotulo}: foto fora do canvas ${JSON.stringify(foto)}`);
        assert.ok(dentroDoCanvas(plano.texto, W, H), `${rotulo}: texto fora do canvas`);
        assert.ok(!colide(foto, plano.texto), `${rotulo}: foto cruza o texto ${JSON.stringify({ foto, texto: plano.texto })}`);
        // respeita a área útil (não invade logo nem rodapé)
        assert.ok(foto.y >= areaTopo && foto.y + foto.h <= areaBase, `${rotulo}: foto fora da área útil`);
        assert.ok(plano.texto.y >= areaTopo && plano.texto.y + plano.texto.h <= areaBase, `${rotulo}: texto fora da área útil`);
        assert.ok(foto.w > 0 && foto.h > 0);
      }
    }
  }
});

test("default = comportamento antigo: topo + média é a tirinha de 84% × ~22%", () => {
  assert.equal(FOTO_LUGAR_PADRAO, "topo");
  assert.equal(FOTO_TAMANHO_PADRAO, "media");
  assert.equal(normalizarFotoLugar(undefined), "topo");
  assert.equal(normalizarFotoLugar("qualquer coisa"), "topo");
  assert.equal(normalizarFotoTamanho(""), "media");
  assert.equal(normalizarFotoTamanho("enorme"), "media");

  const W = 1080, H = 1080;
  const nominal = tamanhoNominalFoto({ W, H, lugar: "topo", tamanho: "media" });
  assert.equal(nominal.w, Math.round(W * 0.84));
  assert.equal(nominal.h, Math.round(H * 0.22));
  // stories: 20% de altura, como antes
  assert.equal(tamanhoNominalFoto({ W: 1080, H: 1920, lugar: "topo", tamanho: "media" }).h, Math.round(1920 * 0.2));

  const { areaTopo, areaBase } = areaUtil(H);
  const plano = planejarFoto({
    W, H, lugar: "topo", tamanho: "media", areaTopo, areaBase,
    margemX: 86, larguraTexto: Math.round(W * 0.84), alturaTexto: 300, gap: 70,
  });
  assert.ok(plano.foto);
  assert.equal(plano.foto!.w, nominal.w);
  assert.equal(plano.foto!.h, nominal.h);
  assert.equal(plano.encolhida, false);
  assert.equal(plano.aviso, null);
  // foto acima, texto abaixo, com o respiro pedido
  assert.equal(plano.texto.y, plano.foto!.y + plano.foto!.h + 70);
  assert.equal(plano.foto!.x, Math.round((W - nominal.w) / 2));
});

test("tamanhos: pequena é menor que média, que é menor que grande; direita é coluna de ~40%", () => {
  for (const [W, H] of CANVASES) {
    for (const lugar of LUGARES) {
      const p = tamanhoNominalFoto({ W, H, lugar, tamanho: "pequena" });
      const m = tamanhoNominalFoto({ W, H, lugar, tamanho: "media" });
      const g = tamanhoNominalFoto({ W, H, lugar, tamanho: "grande" });
      assert.ok(p.h < m.h && m.h < g.h, `${lugar}: alturas em ordem`);
      assert.ok(p.w <= m.w && m.w <= g.w, `${lugar}: larguras em ordem`);
    }
    const dir = tamanhoNominalFoto({ W, H, lugar: "direita", tamanho: "media" });
    assert.ok(dir.w >= W * 0.36 && dir.w <= W * 0.42, "coluna da direita ~40% da largura");
    const peq = tamanhoNominalFoto({ W, H, lugar: "topo", tamanho: "pequena" });
    assert.equal(peq.w, Math.round(W * 0.4));
  }
});

test("base: foto abaixo do texto — a 'fotinho menor embaixo' que a Aline pediu", () => {
  const W = 1080, H = 1080;
  const { areaTopo, areaBase } = areaUtil(H);
  const plano = planejarFoto({
    W, H, lugar: "base", tamanho: "pequena", areaTopo, areaBase,
    margemX: 86, larguraTexto: 900, alturaTexto: 120, gap: 40,
  });
  assert.ok(plano.foto);
  assert.ok(plano.foto!.y >= plano.texto.y + plano.texto.h + 40, "foto começa depois do texto + respiro");
  assert.equal(plano.foto!.w, Math.round(W * 0.4));
  assert.ok(!colide(plano.foto!, plano.texto));
});

test("direita: texto na coluna esquerda, foto encostada na margem direita, sem cruzar", () => {
  const W = 1080, H = 1350;
  const { areaTopo, areaBase } = areaUtil(H);
  const margemX = 97, gap = 43;
  const larguraTexto = larguraColunaTexto(W, margemX, gap);
  const plano = planejarFoto({
    W, H, lugar: "direita", tamanho: "grande", areaTopo, areaBase, margemX, larguraTexto, alturaTexto: 500, gap,
  });
  assert.ok(plano.foto);
  assert.equal(plano.texto.x, margemX);
  assert.ok(plano.texto.x + plano.texto.w + gap <= plano.foto!.x, "coluna de texto termina antes da foto");
  assert.equal(plano.foto!.x + plano.foto!.w, W - margemX, "foto encosta na margem direita");
  assert.ok(!colide(plano.foto!, plano.texto));
  // texto medido MAIS LARGO que a coluna (renderer errou) → foto não entra, e avisa
  const errado = planejarFoto({
    W, H, lugar: "direita", tamanho: "media", areaTopo, areaBase, margemX, larguraTexto: Math.round(W * 0.84), alturaTexto: 500, gap,
  });
  assert.equal(errado.foto, null);
  assert.ok(errado.aviso);
});

test("🔴 nunca sobrepõe: texto alto → a foto encolhe; texto que toma tudo → foto sai COM aviso", () => {
  const W = 1080, H = 1080;
  const { areaTopo, areaBase } = areaUtil(H);
  const disponivel = areaBase - areaTopo;
  // Sobra pouco: a foto grande (34%) não cabe inteira, tem que encolher
  const apertado = planejarFoto({
    W, H, lugar: "topo", tamanho: "grande", areaTopo, areaBase,
    margemX: 86, larguraTexto: 900, alturaTexto: disponivel - Math.round(H * 0.2), gap: 40,
  });
  assert.ok(apertado.foto, "ainda cabe encolhida");
  assert.equal(apertado.encolhida, true);
  assert.ok(apertado.aviso && /reduzida/.test(apertado.aviso));
  assert.ok(!colide(apertado.foto!, apertado.texto));
  assert.ok(apertado.foto!.h < tamanhoNominalFoto({ W, H, lugar: "topo", tamanho: "grande" }).h);
  assert.ok(apertado.foto!.h >= Math.round(H * 0.08), "nunca abaixo da altura mínima");

  // Não sobra nem o mínimo: texto desenhado, foto omitida, aviso explícito
  for (const lugar of LUGARES) {
    const cheio = planejarFoto({
      W, H, lugar, tamanho: "pequena", areaTopo, areaBase,
      margemX: 86, larguraTexto: lugar === "direita" ? 400 : 900, alturaTexto: disponivel - 10, gap: 40,
    });
    if (lugar === "direita") {
      // coluna: a foto cabe ao lado mesmo com texto alto — é a geometria que impede o cruzamento
      assert.ok(cheio.foto);
      assert.ok(!colide(cheio.foto!, cheio.texto));
    } else {
      assert.equal(cheio.foto, null, `${lugar}: foto omitida`);
      assert.ok(cheio.aviso && /não coube/.test(cheio.aviso), `${lugar}: aviso de que não coube`);
      assert.ok(dentroDoCanvas(cheio.texto, W, H));
    }
  }
});

test("citação e lista são pilhas: 'ao lado' cai em topo com aviso; layout sem foto avisa", () => {
  assert.deepEqual(resolverLugar("citacao", "direita"), { lugar: "topo", aviso: resolverLugar("lista", "direita").aviso });
  assert.ok(resolverLugar("lista", "direita").aviso);
  assert.deepEqual(resolverLugar("citacao", "base"), { lugar: "base", aviso: null });
  assert.deepEqual(resolverLugar("editorial", "direita"), { lugar: "direita", aviso: null });
  assert.deepEqual(resolverLugar("foto", "direita"), { lugar: "direita", aviso: null });
  assert.ok(resolverLugar("conteudo", "topo").aviso, "slide interno não desenha foto — tem que dizer");
  assert.ok(resolverLugar("capa_clara", "topo").aviso);
});

test("carrossel 4:5: capa com foto em qualquer lugar/tamanho continua dentro da área útil", () => {
  const W = 1080, H = 1350;
  const { areaTopo, areaBase } = areaUtil(H);
  for (const lugar of LUGARES) {
    for (const tamanho of TAMANHOS) {
      const larguraTexto = lugar === "direita" ? larguraColunaTexto(W, 86, 60) : 907;
      const plano = planejarFoto({ W, H, lugar, tamanho, areaTopo, areaBase, margemX: 86, larguraTexto, alturaTexto: 380, gap: 60 });
      assert.ok(plano.foto, `${lugar}/${tamanho}`);
      assert.ok(!colide(plano.foto!, plano.texto));
      assert.ok(plano.foto!.y >= areaTopo && plano.foto!.y + plano.foto!.h <= areaBase);
    }
  }
});

// ————— Trava: o line art não volta —————

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..", "..");
const PASTAS_VARRIDAS = ["packages/ai-image/src", "apps/franquias/src", "apps/aline/src"];
const TOKENS_PROIBIDOS = ["lineArt", "svgIlustracao", "sugerirIlustracao", "ILUSTRACOES_DISPONIVEIS", "IlustracaoId"];

function arquivosFonte(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    const st = statSync(caminho);
    if (st.isDirectory()) {
      if (nome === "node_modules" || nome === ".next") continue;
      saida.push(...arquivosFonte(caminho));
    } else if (/\.(ts|tsx|mjs|js)$/.test(nome)) {
      saida.push(caminho);
    }
  }
  return saida;
}

test("🔴 trava: o line art foi retirado (Aline, 12/09/2026) e não volta em nenhum fonte", () => {
  assert.throws(() => statSync(join(RAIZ, "packages/ai-image/src/lineArt.ts")), "lineArt.ts tem que continuar apagado");
  const violacoes: string[] = [];
  for (const pasta of PASTAS_VARRIDAS) {
    const dir = join(RAIZ, pasta);
    let arquivos: string[] = [];
    try {
      arquivos = arquivosFonte(dir);
    } catch {
      continue; // app ausente neste checkout — não é violação
    }
    for (const arq of arquivos) {
      if (arq.endsWith("cardDesigner.test.ts")) continue; // este arquivo cita os tokens de propósito
      const texto = readFileSync(arq, "utf8");
      for (const token of TOKENS_PROIBIDOS) {
        if (texto.includes(token)) violacoes.push(`${arq.replace(RAIZ + "/", "")}: ${token}`);
      }
    }
  }
  assert.deepEqual(violacoes, [], `line art voltou:\n${violacoes.join("\n")}`);
});

test("cardDesigner: todo layout que aceita foto consulta o planejador único (nenhuma foto descartada em silêncio)", () => {
  const fonte = readFileSync(join(AQUI, "cardDesigner.ts"), "utf8");
  assert.ok(!fonte.includes("lineArt"), "cardDesigner não importa line art");
  // Uma chamada de planejarFoto por layout com foto: pilha (hero/foto), citação, lista, editorial
  const chamadas = fonte.match(/planejarFoto\(\{/g) ?? [];
  assert.ok(chamadas.length >= 4, `esperava ≥4 usos de planejarFoto, achei ${chamadas.length}`);
  // conteúdo e capas não desenham foto — e dizem isso
  assert.ok(fonte.includes("AVISO_LAYOUT_SEM_FOTO"), "layout sem foto tem que avisar, não engolir");
  // nenhum rect do plano é usado sem passar por desenharFoto (que trata foto ilegível)
  assert.ok((fonte.match(/desenharFoto\(composites, foto, plano\.foto/g) ?? []).length >= 4);
});
