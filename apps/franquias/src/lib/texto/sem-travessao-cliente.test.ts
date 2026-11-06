import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

// Aline, 06/11/2026: texto que a cliente lê (telas, e-mails, avisos) não tem
// travessão nem meia-risca. Reescreve com dois-pontos, vírgula ou ponto.
// Fora do escopo: /admin (time), termos, privacidade, /en (revisão da Meta),
// prompts do modelo (lib/claude, lib/agentes e os geradores), comentários e logs.
const SRC = new URL("../../", import.meta.url);
const ALVOS = [
  "app",
  "components",
  "lib/emails/templates.ts",
  "lib/onboarding/concluir.ts",
  "lib/instagram/publisher.ts",
  "lib/biblioteca/gate.ts",
  "lib/produtos/actions.ts",
  "lib/anuncios/campanha-automatica.ts",
  "lib/meta/bm.ts",
  "lib/utils.ts",
];
const FORA = /\/admin\/|\/en\/|app\/termos\/|app\/privacidade\/|\.test\.tsx?$/;

function arquivos(rel: string): string[] {
  const u = new URL(rel, SRC);
  if (!statSync(u).isDirectory()) return [rel];
  return readdirSync(u, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(`${rel}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${rel}/${e.name}`] : [],
  );
}
function semComentarios(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}
const ehLog = (linha: string) => /console\.|^\s*`\[[\w-]+\]/.test(linha);

test("texto da cliente: sem travessão nem meia-risca", () => {
  const achados: string[] = [];
  for (const rel of ALVOS.flatMap(arquivos)) {
    if (FORA.test(rel)) continue;
    semComentarios(readFileSync(new URL(rel, SRC), "utf8"))
      .split("\n")
      .forEach((l, i) => {
        if (/[—–]/.test(l) && !ehLog(l)) achados.push(`${rel}:${i + 1}: ${l.trim()}`);
      });
  }
  assert.deepEqual(achados, []);
});
