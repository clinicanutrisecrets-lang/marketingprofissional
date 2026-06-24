import { describe, it, expect } from "vitest";
import { decidirAcaoAnuncio, type MetricasAnuncio } from "./otimizacao";

const base: MetricasAnuncio = {
  diasAtivo: 7,
  gastoTotal: 100,
  leads: 5,
  cpl: 23, // ~mediano (não é vencedor claro)
  ctr: 1.5,
  frequency: 1.5,
  budgetDiario: 50,
  cplBenchmarkMediano: 25,
  capMensalRestante: 1000,
};

describe("decidirAcaoAnuncio", () => {
  it("aguarda quando tem menos de 3 dias de dados", () => {
    expect(decidirAcaoAnuncio({ ...base, diasAtivo: 2 }).acao).toBe("aguardar");
  });

  it("pausa quando gastou >= R$200 sem nenhum lead", () => {
    const d = decidirAcaoAnuncio({ ...base, gastoTotal: 250, leads: 0 });
    expect(d.acao).toBe("pausar");
    expect(d.motivo).toMatch(/sem nenhum lead/);
  });

  it("pausa quando CPL passa de 2.5x o mercado", () => {
    const d = decidirAcaoAnuncio({ ...base, cpl: 70, cplBenchmarkMediano: 25 });
    expect(d.acao).toBe("pausar");
  });

  it("escala budget de um vencedor (+25%) respeitando o teto mensal", () => {
    const d = decidirAcaoAnuncio({ ...base, cpl: 18, frequency: 1.5, leads: 8, budgetDiario: 50 });
    expect(d.acao).toBe("escalar");
    expect(d.novoBudgetDiario).toBe(62.5);
  });

  it("não escala além do que resta no orçamento mensal", () => {
    const d = decidirAcaoAnuncio({
      ...base,
      cpl: 18,
      leads: 8,
      budgetDiario: 50,
      capMensalRestante: 5, // teto = 55
    });
    expect(d.acao).toBe("escalar");
    expect(d.novoBudgetDiario).toBe(55);
  });

  it("não pausa por saturação sozinha, mas sinaliza troca de criativo", () => {
    const d = decidirAcaoAnuncio({ ...base, frequency: 3.0, leads: 5, cpl: 20 });
    expect(d.acao).toBe("manter");
    expect(d.alertaSaturacao).toBe(true);
  });

  it("mantém quando está tudo dentro do esperado", () => {
    expect(decidirAcaoAnuncio(base).acao).toBe("manter");
  });

  it("não escala vencedor saturado (freq alta tem prioridade)", () => {
    const d = decidirAcaoAnuncio({ ...base, cpl: 18, leads: 8, frequency: 2.6 });
    expect(d.acao).toBe("manter");
    expect(d.alertaSaturacao).toBe(true);
  });
});
