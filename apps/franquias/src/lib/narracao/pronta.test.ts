import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { narracoesProntasPorRef, estadoVozDoVideo } from "./pronta.ts";

const fonte = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

// Aline, 07/11/2026: o cartão dizia "falta a sua voz" mesmo com a narração pronta.

test("a narração pronta mais nova de cada vídeo; enviando, montando e erro não contam", () => {
  const m = narracoesProntasPorRef([
    { ref: "bf-concepcao", status: "pronto", url: "https://x/velha.mp4", criado_em: "2026-11-07T06:33:00Z" },
    { ref: "bf-concepcao", status: "pronto", url: "https://x/nova.mp4", criado_em: "2026-11-07T06:37:00Z" },
    { ref: "bf-concepcao", status: "montando", url: null, criado_em: "2026-11-07T06:40:00Z" },
    { ref: "bf-gestacao", status: "enviando", url: null, criado_em: "2026-11-07T06:00:00Z" },
    { ref: "bf-stories", status: "erro", url: "https://x/erro.mp4", criado_em: "2026-11-07T06:00:00Z" },
  ]);
  assert.deepEqual(m, { "bf-concepcao": "https://x/nova.mp4" });
  assert.deepEqual(narracoesProntasPorRef(null), {});
});

test("com a voz pronta o cartão oferece baixar; sem ela, o aviso de que falta a voz", () => {
  const prontas = { "bf-concepcao": "https://x/nova.mp4" };
  assert.deepEqual(estadoVozDoVideo("bf-concepcao", prontas), { tipo: "com-voz", url: "https://x/nova.mp4" });
  assert.deepEqual(estadoVozDoVideo("bf-gestacao", prontas), { tipo: "falta-voz" });
  assert.deepEqual(estadoVozDoVideo("bf-gestacao", undefined), { tipo: "falta-voz" });
});

test("aba Vídeos e Aprovar semana não mostram o aviso fixo: passam pela narração pronta", () => {
  for (const tela of ["../../app/dashboard/videos/VideosMarcaSection.tsx", "../../app/dashboard/aprovar/AprovacaoView.tsx"]) {
    const s = fonte(tela);
    assert.doesNotMatch(s, /<AvisoFaltaVoz\b/, tela);
    assert.match(s, /<AvisoVozDoVideo\b[^>]*prontas=/, tela);
  }
  assert.match(fonte("../../app/dashboard/videos/AvisoVozDoVideo.tsx"), /estadoVozDoVideo\(/);
  assert.match(fonte("../../app/dashboard/videos/page.tsx"), /narracoesProntasMarcaAction\(\)/);
  assert.match(fonte("../../app/dashboard/aprovar/page.tsx"), /narracoesProntas=\{narracoesProntas\}/);
});
