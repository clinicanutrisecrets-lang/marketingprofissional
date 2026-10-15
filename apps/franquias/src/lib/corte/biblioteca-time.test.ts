import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "../..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

test("biblioteca de clipes é do time: a página confere o gate e o card só aparece pra ele", () => {
  const pagina = ler("app/dashboard/biblioteca-videos/page.tsx");
  assert.match(pagina, /bibliotecaDoTime\([\s\S]{0,120}redirect\("\/dashboard\/videos"\)/);
  const videos = ler("app/dashboard/videos/page.tsx");
  assert.match(videos, /\{bibTime && \(\s*<Link\s+href="\/dashboard\/biblioteca-videos"/);
});

test("menu: o caminho da semana fica à mostra e o resto vai pra Mais ferramentas", () => {
  const nav = ler("app/dashboard/SidebarNav.tsx");
  const principais = nav.slice(nav.indexOf("const PRINCIPAIS"), nav.indexOf("const FERRAMENTAS"));
  for (const href of ["/dashboard/aprovar", "/dashboard/briefings", "/dashboard/posts-venda", "/dashboard/videos"]) {
    assert.ok(principais.includes(`"${href}"`), href);
  }
  assert.ok(!principais.includes(`href: "/dashboard/conteudo/editor"`));
  assert.match(nav, /Mais ferramentas/);
});

test("menu de 15/10: Criar post junta carrossel e post único, e o Estúdio sai do menu", () => {
  const nav = ler("app/dashboard/SidebarNav.tsx");
  const principais = nav.slice(nav.indexOf("const PRINCIPAIS"), nav.indexOf("const FERRAMENTAS"));
  assert.ok(principais.includes('"/dashboard/criar-post"'));
  assert.ok(!nav.includes('href: "/dashboard/conteudo",'), "Estúdio fora do menu");
  assert.ok(!nav.includes('label: "Editor de arte"'), "Editor de arte mora no Criar post");
  assert.ok(!nav.includes("Carrossel por tema"), "carrossel mora no Criar post");

  const criar = ler("app/dashboard/criar-post/page.tsx");
  assert.match(criar, /URL_CARROSSEL_TEMA[\s\S]*target="_top"/);
  assert.match(criar, /href="\/dashboard\/conteudo\/editor"/);
  // Constante de arquivo "use client" chega como referência de cliente numa página de servidor.
  assert.doesNotMatch(criar, /from "\.\.\/SidebarNav"/);

  // O Reel animado mora só em Vídeos.
  assert.doesNotMatch(ler("app/dashboard/conteudo/page.tsx"), /ReelAnimadoSection/);
  assert.doesNotMatch(ler("components/TutorialTour.tsx"), /Estúdio de conteúdo|Editor de arte/);
});

test("upload do time vai pro acervo compartilhado, com o gate conferido na action", () => {
  const actions = ler("lib/videos/actions.ts");
  const fn = actions.slice(actions.indexOf("export async function adicionarAoAcervoDoTime"));
  const corpo = fn.slice(0, fn.indexOf("\nexport async function"));
  assert.match(corpo, /bibliotecaDoTime\(/);
  assert.ok(corpo.indexOf("bibliotecaDoTime(") < corpo.indexOf('.from("acervo_videos")'), "gate antes da escrita");
  assert.match(corpo, /criado_por: user\.id/);

  const view = ler("app/dashboard/biblioteca-videos/BibliotecaView.tsx");
  assert.match(view, /acervoPorPadrao\b/);
  assert.match(view, /adicionarAoAcervo: adicionarAoAcervoDoTime/);

  // O componente compartilhado nasce marcado só quando pedido (o Studio segue desmarcado).
  const ui = readFileSync(join(raiz, "../../../packages/ui/src/BibliotecaVideos.tsx"), "utf8");
  assert.match(ui, /useState\(acervoPorPadrao\)/);
  assert.match(ui, /acervoPorPadrao = false/);
  assert.match(ui, /Se aparece você ou alguém\s+do time, desmarque/);
});
