import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIPOS_FOTO_BANCO,
  caminhoNoBucket,
  filaDaSemana,
  tipoLevaFotoDoBanco,
} from "./fotos-banco.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const fotos = ["a", "b", "c", "d"].map((id) => ({ id, url_storage: id }));

test("a fila gira as fotos sem perder nem repetir dentro da semana", () => {
  const f = filaDaSemana(fotos, "2026-10-05");
  assert.equal(f.length, 4);
  assert.deepEqual([...f].map((x) => x.id).sort(), ["a", "b", "c", "d"]);
});

test("semanas diferentes podem começar por fotos diferentes; a mesma semana é estável", () => {
  assert.deepEqual(filaDaSemana(fotos, "2026-10-05"), filaDaSemana(fotos, "2026-10-05"));
  const inicios = new Set(
    ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"].map(
      (s) => filaDaSemana(fotos, s)[0]!.id,
    ),
  );
  assert.ok(inicios.size > 1);
});

test("sem foto no banco, a fila é vazia (a arte segue tipográfica)", () => {
  assert.deepEqual(filaDaSemana([], "2026-10-05"), []);
});

test("caminho no bucket a partir de URL assinada e pública", () => {
  assert.deepEqual(
    caminhoNoBucket(
      "https://x.supabase.co/storage/v1/object/sign/franqueadas-assets/abc/foto_post/1_prato.jpg?token=t",
    ),
    { bucket: "franqueadas-assets", path: "abc/foto_post/1_prato.jpg" },
  );
  assert.deepEqual(
    caminhoNoBucket("https://y.supabase.co/storage/v1/object/public/nutri-assets/logos/l.jpg"),
    { bucket: "nutri-assets", path: "logos/l.jpg" },
  );
  assert.equal(caminhoNoBucket("https://exemplo.com/foto.jpg"), null);
});

test("só carrossel e feed levam foto; logo e depoimento não entram no banco", () => {
  assert.ok(tipoLevaFotoDoBanco("feed_carrossel"));
  assert.ok(tipoLevaFotoDoBanco("feed_imagem"));
  assert.ok(!tipoLevaFotoDoBanco("stories"));
  assert.ok(!(TIPOS_FOTO_BANCO as readonly string[]).includes("logo_principal"));
  assert.ok(!(TIPOS_FOTO_BANCO as readonly string[]).includes("depoimento_print"));
});

test("o pacote da semana passa a foto do banco pra capa e pro feed", () => {
  const s = fonte("./semanal.ts");
  assert.match(s, /fotoCapa: await proximaFotoDoBanco\(\)/);
  assert.match(s, /fotoPropria: tipoLevaFotoDoBanco\(item\.tipo\) \? await proximaFotoDoBanco\(\)/);
  assert.match(s, /\.in\("tipo", \[\.\.\.TIPOS_FOTO_BANCO\]\)/);
});

test("a tela Minhas fotos e o aviso em Aprovar semana existem", () => {
  assert.match(fonte("../../app/dashboard/fotos/FotosBanco.tsx"), /tipo="foto_post"/);
  const aprovar = fonte("../../app/dashboard/aprovar/page.tsx");
  assert.match(aprovar, /Suba fotos suas e dos seus pratos para os posts ganharem vida\./);
  assert.match(aprovar, /href="\/dashboard\/fotos"/);
  assert.match(fonte("../../app/dashboard/SidebarNav.tsx"), /\/dashboard\/fotos/);
});
