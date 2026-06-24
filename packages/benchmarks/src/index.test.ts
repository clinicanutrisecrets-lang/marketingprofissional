import { describe, it, expect } from "vitest";
import {
  avaliarCusto,
  avaliacaoEmUI,
  percentDiffMediano,
  type Benchmark,
} from "./index";

// Benchmark de exemplo: CPL (quanto MENOR, melhor)
const cpl: Benchmark = {
  valor_excelente: 8,
  valor_bom: 15,
  valor_mediano: 25,
  valor_ruim: 45,
};

describe("avaliarCusto", () => {
  it("classifica como excelente quando <= valor_excelente", () => {
    expect(avaliarCusto(5, cpl)).toBe("excelente");
    expect(avaliarCusto(8, cpl)).toBe("excelente"); // limite inclusivo
  });

  it("classifica como bom na faixa entre excelente e bom", () => {
    expect(avaliarCusto(8.01, cpl)).toBe("bom");
    expect(avaliarCusto(15, cpl)).toBe("bom");
  });

  it("classifica como mediano na faixa entre bom e mediano", () => {
    expect(avaliarCusto(20, cpl)).toBe("mediano");
    expect(avaliarCusto(25, cpl)).toBe("mediano");
  });

  it("classifica como ruim acima do mediano", () => {
    expect(avaliarCusto(25.01, cpl)).toBe("ruim");
    expect(avaliarCusto(45, cpl)).toBe("ruim");
    expect(avaliarCusto(120, cpl)).toBe("ruim");
  });

  it("trata valor zero como excelente (custo nulo)", () => {
    expect(avaliarCusto(0, cpl)).toBe("excelente");
  });
});

describe("avaliacaoEmUI", () => {
  it("retorna metadados de UI para cada avaliação", () => {
    expect(avaliacaoEmUI("excelente").label).toBe("Excelente");
    expect(avaliacaoEmUI("ruim").cor).toBe("#EF4444");
    for (const a of ["excelente", "bom", "mediano", "ruim"] as const) {
      const ui = avaliacaoEmUI(a);
      expect(ui.emoji).toBeTruthy();
      expect(ui.label).toBeTruthy();
      expect(ui.cor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe("percentDiffMediano", () => {
  it("retorna negativo quando melhor que o mediano", () => {
    // 12.5 é 50% abaixo de 25
    expect(percentDiffMediano(12.5, cpl)).toBe(-50);
  });

  it("retorna zero quando igual ao mediano", () => {
    expect(percentDiffMediano(25, cpl)).toBe(0);
  });

  it("retorna positivo quando pior que o mediano", () => {
    // 50 é 100% acima de 25
    expect(percentDiffMediano(50, cpl)).toBe(100);
  });
});
