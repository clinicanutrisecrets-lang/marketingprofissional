import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICAS_GRAVACAO } from "./dicas-gravacao.ts";

const TELEPROMPTER = readFileSync(
  join(import.meta.dirname, "../../app/dashboard/conteudo/reel/[id]/Teleprompter.tsx"),
  "utf8",
);

test("as dicas são básicas, sem travessão e sem equipamento profissional", () => {
  assert.ok(DICAS_GRAVACAO.length >= 4 && DICAS_GRAVACAO.length <= 8);
  const tudo = DICAS_GRAVACAO.map((d) => `${d.titulo} ${d.texto}`).join(" ");
  assert.doesNotMatch(tudo, /[—–]/);
  assert.match(tudo, /janela/i);
  assert.match(tudo, /lente/i);
  assert.match(tudo, /barulho|silencios/i);
  assert.doesNotMatch(tudo, /ring light|microfone de lapela|softbox/i);
});

test("o teleprompter mostra as dicas ANTES de abrir a câmera", () => {
  assert.match(TELEPROMPTER, /DICAS_GRAVACAO/);
  assert.match(TELEPROMPTER, /if \(!cameraLiberada\) return;/);
  assert.match(TELEPROMPTER, /\}, \[cameraLiberada\]\);/);
  // localStorage sempre em try/catch
  assert.match(TELEPROMPTER, /try \{\s*ocultar = localStorage/);
});
