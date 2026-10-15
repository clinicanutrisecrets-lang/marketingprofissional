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
