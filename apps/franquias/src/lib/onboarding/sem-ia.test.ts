import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// Regra 1 do projeto: a interface nunca diz "IA" (Aline, 15/10/2026).
test("onboarding do Marketing: nenhum passo diz IA nem usa a estrelinha", () => {
  const dir = new URL("../../components/onboarding/steps/", import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".tsx"))) {
    const texto = readFileSync(new URL(f, dir), "utf8");
    assert.doesNotMatch(texto, /\bIA\b|intelig[eê]ncia artificial|✨/, f);
  }
});

// Telas e e-mails que a cliente lê (Aline, 06/11/2026: "o time do Scanner", nunca "IA").
// Comentário de código não conta; o painel /admin é do time e fica de fora.
function semComentarios(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}
function arquivos(dir: URL): URL[] {
  const out: URL[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...arquivos(new URL(e.name + "/", dir)));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push(new URL(e.name, dir));
  }
  return out;
}
test("painel da cliente e e-mails: nenhum texto diz IA nem usa a estrelinha", () => {
  const alvos = [
    ...arquivos(new URL("../../app/dashboard/", import.meta.url)),
    new URL("../emails/templates.ts", import.meta.url),
    new URL("../reports/semanal.ts", import.meta.url),
  ];
  for (const u of alvos) {
    let texto = semComentarios(readFileSync(u, "utf8"));
    // semanal.ts manda o prompt pro modelo com "Posts IA"; só a frase que vai pra tela conta.
    if (u.pathname.endsWith("semanal.ts")) texto = texto.split("insight_manual_vs_ia:")[1] ?? "";
    assert.doesNotMatch(texto, /\bIA\b|intelig[eê]ncia artificial|✨/, u.pathname);
  }
});
