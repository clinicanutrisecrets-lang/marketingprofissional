import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assinar, assinaturaConfere } from "./tratamentos-assinatura.ts";

const RAIZ = join(import.meta.dirname, "../../../../..");
const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");

test("canal do Tratamentos: só passa pedido assinado com o segredo certo", () => {
  const corpo = JSON.stringify({ acao: "estado", chave: "x" });
  const sig = assinar(corpo, "segredo");
  assert.ok(assinaturaConfere(corpo, sig, "segredo"));
  assert.ok(assinaturaConfere(corpo, `sha256=${sig}`, "segredo"));
  assert.ok(!assinaturaConfere(corpo, sig, "outro"), "segredo errado");
  assert.ok(!assinaturaConfere(corpo + " ", sig, "segredo"), "corpo mexido");
  assert.ok(!assinaturaConfere(corpo, "", "segredo"), "sem assinatura");
  assert.ok(!assinaturaConfere(corpo, assinar(corpo, ""), ""), "segredo vazio nunca vale, nem assinado com vazio");
});

test("videos-bf: confere a assinatura antes de tudo e fecha sem a variável", () => {
  const rota = ler("apps/franquias/src/app/api/integrations/tratamentos/videos-bf/route.ts");
  assert.ok(rota.indexOf("assinaturaConfere(") < rota.indexOf("JSON.parse("), "parse antes da assinatura");
  assert.match(rota, /VIDEOS_PARCEIRAS_SECRET/);
  assert.match(rota, /status: 503/);
  assert.match(rota, /chaveValida\(chave\)/);
});

test("parceira nunca vira dona de linha de franqueada: o dono é um OU outro", () => {
  const mig = ler("supabase/migrations/franquias/043_videos_parceiras.sql");
  assert.match(mig, /videos_marca_dono_check[\s\S]*\(franqueada_id IS NOT NULL\) <> \(parceira_chave IS NOT NULL\)/);
  assert.match(mig, /narracoes_video_dono_check/);
  const lib = ler("apps/franquias/src/lib/videos/parceiras.ts");
  assert.match(lib, /\.eq\("parceira_chave", chave\)/);
  assert.match(lib, /n\.parceira_chave !== p\.chave/);
});

test("franqueada não depende da migração 043: parceira_chave só vai no insert de parceira", () => {
  const srv = ler("apps/franquias/src/lib/videos/marca-servidor.ts");
  assert.match(srv, /p\.parceiraChave \? \{ franqueada_id: null, parceira_chave: p\.parceiraChave \} : \{ franqueada_id: p\.franqueadaId \}/);
});
