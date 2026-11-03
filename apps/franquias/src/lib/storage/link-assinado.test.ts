/**
 * Slide do carrossel sem imagem (Juliana, 03/11/2026): o caminho cru do bucket
 * foi gravado no lugar do link quando o createSignedUrl falhou uma vez.
 *   node --experimental-strip-types --test apps/franquias/src/lib/storage/link-assinado.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assinarArtesSemLink, ehCaminhoCru, linkAssinadoOuCaminho } from "./link-assinado.ts";

function bucket(falhasAntes: number) {
  let chamadas = 0;
  return {
    chamadas: () => chamadas,
    async createSignedUrl(path: string) {
      chamadas++;
      if (chamadas <= falhasAntes) return { data: null, error: new Error("instável") };
      return { data: { signedUrl: `https://x.supabase.co/sign/${path}?token=t` }, error: null };
    },
  };
}

test("caminho cru x link", () => {
  assert.equal(ehCaminhoCru("abc/ai-image/1_carrossel_3.png"), true);
  assert.equal(ehCaminhoCru("https://x/y.png"), false);
  assert.equal(ehCaminhoCru(""), false);
});

test("uma falha do Storage não vira slide sem link: tenta de novo", async () => {
  const b = bucket(1);
  const u = await linkAssinadoOuCaminho(b, "c/ai-image/3.png");
  assert.match(u, /^https:/);
  assert.equal(b.chamadas(), 2);
});

test("a tela assina o slide que ficou só com o caminho", async () => {
  const [p] = await assinarArtesSemLink(bucket(0), [
    { id: "1", urls_slides: ["https://ok/1.png", "c/ai-image/3.png"], url_imagem_final: null },
  ]);
  assert.deepEqual((p!.urls_slides as string[]).map((u) => u.startsWith("https:")), [true, true]);
});

test("nenhum gravador volta a gravar `?? path` calado", () => {
  for (const f of [
    "../ai-image/render.ts",
    "../conteudo/gerador-sugestoes.ts",
    "../../app/api/conteudo/render-card/route.ts",
  ]) {
    const s = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.ok(!/signedUrl \?\? path/.test(s), `${f} voltou a gravar o caminho cru`);
  }
  const tela = readFileSync(new URL("../../app/dashboard/aprovar/page.tsx", import.meta.url), "utf8");
  assert.match(tela, /assinarArtesSemLink\(/);
});
