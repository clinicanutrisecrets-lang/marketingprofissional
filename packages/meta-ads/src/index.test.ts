import { describe, it, expect } from "vitest";
import { MAPEAMENTO_OBJETIVO, type ObjetivoNegocio } from "./index";

const OBJETIVOS: ObjetivoNegocio[] = [
  "ganhar_seguidores",
  "receber_mensagens",
  "agendar_consultas",
  "vender_teste_genetico",
  "alcance",
  "trafego_site",
];

// Objetivos/optimization válidos da Meta Marketing API (Outcome-Driven Ad Experiences).
const META_OBJECTIVES_VALIDOS = new Set([
  "OUTCOME_ENGAGEMENT",
  "OUTCOME_LEADS",
  "OUTCOME_SALES",
  "OUTCOME_AWARENESS",
  "OUTCOME_TRAFFIC",
  "OUTCOME_APP_PROMOTION",
]);

describe("MAPEAMENTO_OBJETIVO", () => {
  it("cobre todos os objetivos de negócio sem faltar nenhum", () => {
    for (const obj of OBJETIVOS) {
      expect(MAPEAMENTO_OBJETIVO[obj]).toBeDefined();
    }
    expect(Object.keys(MAPEAMENTO_OBJETIVO).sort()).toEqual([...OBJETIVOS].sort());
  });

  it("mapeia cada objetivo pra um meta_objective ODAX válido", () => {
    for (const obj of OBJETIVOS) {
      expect(META_OBJECTIVES_VALIDOS.has(MAPEAMENTO_OBJETIVO[obj].meta_objective)).toBe(true);
    }
  });

  it("define os mapeamentos críticos de aquisição corretamente", () => {
    // Vender teste genético deve otimizar por conversão de venda.
    expect(MAPEAMENTO_OBJETIVO.vender_teste_genetico.meta_objective).toBe("OUTCOME_SALES");
    expect(MAPEAMENTO_OBJETIVO.vender_teste_genetico.meta_optimization).toBe("OFFSITE_CONVERSIONS");
    expect(MAPEAMENTO_OBJETIVO.vender_teste_genetico.destino_padrao).toBe("link_externo");

    // Agendar consultas deve otimizar por geração de lead.
    expect(MAPEAMENTO_OBJETIVO.agendar_consultas.meta_objective).toBe("OUTCOME_LEADS");
    expect(MAPEAMENTO_OBJETIVO.agendar_consultas.meta_optimization).toBe("LEAD_GENERATION");
  });

  it("preenche todos os campos de UI/destino em cada objetivo", () => {
    const destinos = new Set(["whatsapp", "link_externo", "formulario", "perfil"]);
    for (const obj of OBJETIVOS) {
      const m = MAPEAMENTO_OBJETIVO[obj];
      expect(m.label).toBeTruthy();
      expect(m.descricao).toBeTruthy();
      expect(m.emoji).toBeTruthy();
      expect(m.meta_optimization).toBeTruthy();
      expect(destinos.has(m.destino_padrao)).toBe(true);
    }
  });
});
