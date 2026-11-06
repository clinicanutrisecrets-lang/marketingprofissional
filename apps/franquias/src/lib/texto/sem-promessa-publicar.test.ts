import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";

// Aline, 06/11/2026 (Juliana avisou): o app NÃO publica nada por ninguém, não
// tem essa permissão da Meta. A nutri aprova, baixa a arte, copia a legenda e
// posta ela mesma. Nenhum e-mail nem tela da cliente pode prometer publicação.
const SRC = new URL("../../", import.meta.url);
const ALVOS = ["app", "components", "lib/emails/templates.ts", "lib/onboarding/concluir.ts"];
const FORA = /\/admin\/|\/en\/|app\/termos\/|app\/privacidade\/|app\/api\/|\.test\.tsx?$/;
// Aline, 06/11/2026: "não tem nada de conectar Instagram para publicação
// automática do Publer, não existe isso". Nenhuma tela oferece essa conexão.
const PROMESSA =
  /publicamos|public(a|am|ado|ados)? (sozinh|automaticamente|no horário)|publicação automática|publicar automático|posts automáticos|sai logo em seguida|agendad[oa] (para|pra) publicar|o Scanner (também )?publica|conectar instagram (pra|para) publica|instagram conectado para publica|\bpubler\b/i;

function arquivos(rel: string): string[] {
  const u = new URL(rel, SRC);
  if (!statSync(u).isDirectory()) return [rel];
  return readdirSync(u, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? arquivos(`${rel}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${rel}/${e.name}`] : [],
  );
}
const semComentarios = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("e-mails e telas da cliente: nada promete que o Scanner publica", () => {
  const achados: string[] = [];
  for (const rel of ALVOS.flatMap(arquivos)) {
    if (FORA.test(rel)) continue;
    semComentarios(readFileSync(new URL(rel, SRC), "utf8"))
      .split("\n")
      .forEach((l, i) => {
        if (PROMESSA.test(l)) achados.push(`${rel}:${i + 1}: ${l.trim()}`);
      });
  }
  assert.deepEqual(achados, []);
});
