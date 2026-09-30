import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// Todo workflow que instala o motor de filtro de vídeo (mediapipe) tem que
// instalar junto as bibliotecas gráficas que ele abre. Sem elas o filtro
// falha com "libEGL.so.1: cannot open shared object file" e o corte sai SEM
// filtro, calado: foi o que aconteceu nos dois testes de 28/09/2026, e o
// "pele ficou ótimo" era o vídeo cru.
const DIR = new URL("../../../../../.github/workflows/", import.meta.url);

test("workflow com motor de filtro instala libEGL, libGLES e libGL", () => {
  const usam = readdirSync(DIR)
    .filter((f) => f.endsWith(".yml"))
    .map((f) => ({ f, s: readFileSync(new URL(f, DIR), "utf8") }))
    .filter(({ s }) => s.includes("packages/video-filtro/requirements.txt"));
  assert.ok(usam.length >= 3, "achei menos workflows de filtro do que o esperado");
  for (const { f, s } of usam) {
    for (const lib of ["libegl1", "libgles2", "libgl1"]) {
      assert.ok(s.includes(lib), `${f} instala o motor de filtro sem ${lib}`);
    }
  }
});
