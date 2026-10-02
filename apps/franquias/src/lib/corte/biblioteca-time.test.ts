import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = join(import.meta.dirname, "../..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

test("biblioteca de clipes é do time: a página confere o gate e o card só aparece pra ele", () => {
  const pagina = ler("app/dashboard/biblioteca-videos/page.tsx");
  assert.match(pagina, /corteIaLiberadoPara\([\s\S]{0,120}redirect\("\/dashboard\/videos"\)/);
  const videos = ler("app/dashboard/videos/page.tsx");
  assert.match(videos, /\{corteIa && \(\s*<Link\s+href="\/dashboard\/biblioteca-videos"/);
});

test("menu: o caminho da semana fica à mostra e o resto vai pra Mais ferramentas", () => {
  const nav = ler("app/dashboard/SidebarNav.tsx");
  const principais = nav.slice(nav.indexOf("const PRINCIPAIS"), nav.indexOf("const FERRAMENTAS"));
  for (const href of ["/dashboard/aprovar", "/dashboard/briefings", "/dashboard/posts-venda", "/dashboard/videos"]) {
    assert.ok(principais.includes(`"${href}"`), href);
  }
  assert.ok(!principais.includes("/dashboard/conteudo/editor"));
  assert.match(nav, /Mais ferramentas/);
});
