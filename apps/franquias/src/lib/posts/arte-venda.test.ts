import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brandDaFranqueada, COR_PRIMARIA_PADRAO } from "../ai-image/brand.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("marca: nome comercial vence o nome completo; sem cor cai no padrão", () => {
  const b = brandDaFranqueada(
    { nome_comercial: "Nutri Demo", nome_completo: "Marina Demo", cor_primaria_hex: null },
    { logoUrl: null, fotoUrl: "https://x/foto.png" },
  );
  assert.equal(b.nomeMarca, "Nutri Demo");
  assert.equal(b.corPrimariaHex, COR_PRIMARIA_PADRAO);
  assert.equal(b.logoUrl, undefined);
  assert.equal(b.fotoProfissionalUrl, "https://x/foto.png");
  assert.equal(b.nicho, "nutrição funcional");
});

test("ligação: pacote da semana e post de venda desenham com a MESMA marca", () => {
  assert.match(fonte("../geracao/semanal.ts"), /brandDaFranqueada\(/);
  assert.match(fonte("./arte-venda.ts"), /brandDaFranqueada\(/);
  // a montagem campo a campo antiga não pode voltar no gerador semanal
  assert.doesNotMatch(fonte("../geracao/semanal.ts"), /tomVisual:/);
});

test("ligação: a tela de venda desenha a arte quando não há anexo, e salva os slides", () => {
  const s = fonte("../../app/dashboard/posts-venda/PostsVendaClient.tsx");
  assert.match(s, /desenharArteDoPostVenda\(/);
  assert.match(s, /!arquivo && \(tipo === "feed_imagem" \|\| tipo === "feed_carrossel"\)/);
  assert.match(s, /urls_slides: urlsSlides/);
  assert.match(fonte("./manual.ts"), /urls_slides: params\.urls_slides/);
});

test("ligação: sem estrelinha nos botões de gerar (regra 1 do projeto)", () => {
  assert.doesNotMatch(fonte("../../app/dashboard/posts-venda/PostsVendaClient.tsx"), /✨/);
  assert.doesNotMatch(fonte("../../app/dashboard/page.tsx"), /✨/);
  assert.doesNotMatch(fonte("../../app/dashboard/SidebarNav.tsx"), /✨/);
});
