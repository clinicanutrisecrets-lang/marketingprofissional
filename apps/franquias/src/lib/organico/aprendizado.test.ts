import { describe, it, expect } from "vitest";
import { taxaEdicao, agregarEdicoesPorAngulo } from "./aprendizado";

describe("taxaEdicao", () => {
  it("0 quando textos são idênticos", () => {
    expect(taxaEdicao("oi mundo", "oi mundo")).toBe(0);
  });
  it("1 quando original vazio e final preenchido (ou vice-versa)", () => {
    expect(taxaEdicao("", "algo")).toBe(1);
    expect(taxaEdicao("algo", "")).toBe(1);
  });
  it("0 quando ambos vazios", () => {
    expect(taxaEdicao(null, null)).toBe(0);
  });
  it("valor parcial proporcional à mudança", () => {
    const t = taxaEdicao("gato", "rato"); // 1 char em 4
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(0.5);
  });
});

describe("agregarEdicoesPorAngulo", () => {
  it("ordena ângulos pela taxa de edição média (mais editado primeiro)", () => {
    const r = agregarEdicoesPorAngulo([
      { angulo_copy: "mito_vs_verdade", copy_legenda_ia_original: "texto original aqui", copy_legenda: "COMPLETAMENTE outro texto diferente" },
      { angulo_copy: "educativo_ciencia", copy_legenda_ia_original: "texto identico", copy_legenda: "texto identico" },
    ]);
    expect(r[0]!.angulo).toBe("mito_vs_verdade");
    expect(r[0]!.taxaEdicaoMedia).toBeGreaterThan(r[1]!.taxaEdicaoMedia);
  });

  it("ignora posts sem baseline da IA", () => {
    const r = agregarEdicoesPorAngulo([
      { angulo_copy: "x", copy_legenda_ia_original: null, copy_legenda: "qualquer" },
      { angulo_copy: "x", copy_legenda_ia_original: "abc", copy_legenda: "abd" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.posts).toBe(1);
  });
});
