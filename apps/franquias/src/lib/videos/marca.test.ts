import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  VIDEOS_MARCA,
  LOGO_VAZIA,
  assinaturaVideoMarca,
  marcaDoCadastro,
  parametrosDoMolde,
  precisaGerar,
  roteiroComoTexto,
  videosMarcaLiberadosPara,
} from "./marca.ts";

const PUBLIC = join(import.meta.dirname, "../../../public");
const RAIZ = join(import.meta.dirname, "../../../../..");

test("todo molde e prévia do catálogo existe em public/", () => {
  for (const v of VIDEOS_MARCA) {
    assert.ok(existsSync(join(PUBLIC, v.molde)), `falta ${v.molde}`);
    assert.ok(existsSync(join(PUBLIC, v.poster)), `falta ${v.poster}`);
  }
});

test("o molde sai sem legenda e sem o editor (a profissional narra por cima)", () => {
  for (const v of VIDEOS_MARCA) {
    const html = readFileSync(join(PUBLIC, v.molde), "utf8");
    assert.match(html, /\\"legendas\\": false/, `${v.id}: legendas ligadas`);
    assert.match(html, /\\"motionEditor\\": false/, `${v.id}: editor ligado`);
  }
});

test("texto que vai pra legenda: sem travessão, sem IA, sem marca, sem promessa", () => {
  for (const v of VIDEOS_MARCA) {
    const tudo = [v.titulo, v.resumo, v.legenda, roteiroComoTexto(v)].join("\n");
    assert.ok(!/[—–]/.test(tudo), `${v.id}: travessão`);
    assert.ok(!/\bIA\b|intelig[êe]ncia artificial/i.test(tudo), `${v.id}: IA`);
    assert.ok(!/nutri\s*secrets|scanner da sa[úu]de/i.test(tudo), `${v.id}: marca`);
    assert.ok(!/\bcura\b|\bcurar\b|garantid/i.test(tudo), `${v.id}: promessa`);
  }
});

test("roteiro cobre o vídeo em ordem, sem buraco nem sobreposição", () => {
  for (const v of VIDEOS_MARCA) {
    let fim = 0;
    for (const t of v.roteiro) {
      assert.equal(t.de, fim, `${v.id}: trecho começa em ${t.de}, esperado ${fim}`);
      assert.ok(t.ate > t.de);
      fim = t.ate;
    }
    assert.ok(Math.abs(v.duracaoSeg - fim) <= 1, `${v.id}: roteiro para em ${fim}s, vídeo tem ${v.duracaoSeg}s`);
  }
});

test("roteiro cabe no tempo de cada cena (até ~2,8 palavras por segundo)", () => {
  for (const v of VIDEOS_MARCA) {
    for (const t of v.roteiro) {
      const palavras = t.texto.split(/\s+/).length;
      assert.ok(palavras / (t.ate - t.de) <= 2.8, `${v.id} ${t.de}s: ${palavras} palavras em ${t.ate - t.de}s`);
    }
  }
});

test("a duração do catálogo é a soma das cenas do molde", () => {
  for (const v of VIDEOS_MARCA) {
    const html = readFileSync(join(PUBLIC, v.molde), "utf8");
    const m = /OM_SCENES = '(\[.*?\])'/.exec(html.replace(/\\"/g, '"'));
    assert.ok(m, `${v.id}: sem OM_SCENES`);
    const soma = (JSON.parse(m![1]) as { dur: number }[]).reduce((a, c) => a + c.dur, 0);
    assert.ok(Math.abs(soma - v.duracaoSeg) < 0.05, `${v.id}: molde tem ${soma}s, catálogo ${v.duracaoSeg}s`);
  }
});

test("sem logo cadastrada, o molde recebe a logo vazia (nunca a do Scanner)", () => {
  const m = marcaDoCadastro({ cor_primaria_hex: "#846558", cor_secundaria_hex: "b09082", logoUrl: null });
  assert.deepEqual(m, { primaria: "#846558", secundaria: "#B09082", logoUrl: null });
  assert.equal(new URLSearchParams(parametrosDoMolde(m)).get("logo"), LOGO_VAZIA);
  assert.equal(marcaDoCadastro({ logoUrl: "http://x/logo.png" }).logoUrl, null, "só https");
  assert.equal(marcaDoCadastro({ cor_primaria_hex: "rosa" }).primaria, "#0ABFBC", "cor inválida cai no padrão");
});

test("mudar cor, logo ou versão muda a assinatura (e refaz o vídeo)", () => {
  const v = VIDEOS_MARCA[0];
  const base = { primaria: "#846558", secundaria: "#B09082", logoUrl: "https://x/l.png" };
  const a = assinaturaVideoMarca(v, base);
  assert.equal(a, assinaturaVideoMarca(v, { ...base }));
  assert.notEqual(a, assinaturaVideoMarca(v, { ...base, primaria: "#000000" }));
  assert.notEqual(a, assinaturaVideoMarca(v, { ...base, logoUrl: "https://x/outra.png" }));
  assert.notEqual(a, assinaturaVideoMarca({ ...v, versao: v.versao + 1 }, base));
});

test("precisaGerar: só gera de novo sem linha, com erro ou travada", () => {
  const agora = Date.parse("2026-10-15T12:00:00Z");
  const l = (status: "gerando" | "pronto" | "erro", min: number) => ({
    video_id: "gene-fto", assinatura: "a", status, criado_em: new Date(agora - min * 60000).toISOString(),
  });
  assert.equal(precisaGerar(null, "a", agora), true);
  assert.equal(precisaGerar(l("pronto", 5), "a", agora), false);
  assert.equal(precisaGerar(l("pronto", 5), "b", agora), true, "assinatura nova");
  assert.equal(precisaGerar(l("gerando", 10), "a", agora), false, "não dispara duas vezes");
  assert.equal(precisaGerar(l("gerando", 90), "a", agora), true, "travou");
  assert.equal(precisaGerar(l("erro", 1), "a", agora), true);
});

test("fase de teste: só Aline, Juliana e Viviane", () => {
  assert.equal(videosMarcaLiberadosPara(" Clinicanutrisecrets@gmail.com "), true);
  assert.equal(videosMarcaLiberadosPara("julimendesnutri@gmail.com"), true);
  assert.equal(videosMarcaLiberadosPara("suporte.vivitavares@gmail.com"), true);
  assert.equal(videosMarcaLiberadosPara("outra@gmail.com"), false);
  assert.equal(videosMarcaLiberadosPara(null), false);
});

test("ligação: tela, narração e worker usam o catálogo", () => {
  const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");
  assert.match(ler("apps/franquias/src/app/dashboard/videos/page.tsx"), /videosMarcaDaFranqueada/);
  assert.match(ler("apps/franquias/src/lib/narracao/actions.ts"), /origem === "marca"/);
  assert.match(ler("apps/franquias/src/app/dashboard/narrar/page.tsx"), /origem === "marca"/);
  const wf = ler(".github/workflows/render-video-marca.yml");
  assert.match(wf, /packages\/video-marca\/render\.cjs/);
  assert.match(wf, /videos_marca\?id=eq/);
  assert.match(ler("supabase/migrations/franquias/040_videos_marca.sql"), /'marca'/);
  // 🔴 os quadros vão pro ffmpeg pela entrada padrão (em disco passariam de 5 GB)
  assert.match(ler("packages/video-marca/render.cjs"), /image2pipe/);
});

test("o recorte da logo não escreve no stdout (ele vira os parâmetros do molde)", () => {
  const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");
  // Caso Juliana (15/10/2026): "logo pronta (…)" grudou em "primaria" e a cor
  // primária caiu no tiffany padrão, com a secundária trocando normalmente.
  const py = ler("packages/video-marca/logo_sem_fundo.py");
  for (const linha of py.split("\n").filter((l) => /^\s*print\(/.test(l))) {
    assert.match(linha, /file=sys\.stderr/, `print no stdout: ${linha.trim()}`);
  }
  assert.match(ler(".github/workflows/render-video-marca.yml"), /logo_sem_fundo\.py[\s\S]{0,200}stdout=__import__\("sys"\)\.stderr/);
});

test("vídeos de marca: o cron diário deixa os vídeos prontos pras contas da fase de teste", async () => {
  const { readFileSync } = await import("node:fs");
  const rota = readFileSync(new URL("../../app/api/cron/sincronizar-produtos/route.ts", import.meta.url), "utf8");
  assert.match(rota, /videosMarcaLiberadosPara\(fr\.email\)/);
  assert.match(rota, /await videosMarcaDaFranqueada\(/);
  assert.match(rota, /select\("id, nome_completo, email"\)/);
});
