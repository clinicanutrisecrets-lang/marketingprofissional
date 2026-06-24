import { describe, it, expect } from "vitest";
import { identificarServico, extrairAnuncioId } from "./servico-auth";

describe("identificarServico", () => {
  it("reconhece a IA do WhatsApp pelo x-ia-token", () => {
    expect(identificarServico("ia-secret", null, "ia-secret", "sofia-secret")).toEqual({
      autorizado: true,
      origem: "whatsapp_ia",
    });
  });

  it("mantém compatibilidade com x-sofia-token (legado)", () => {
    expect(identificarServico(null, "sofia-secret", "ia-secret", "sofia-secret")).toEqual({
      autorizado: true,
      origem: "sofia",
    });
  });

  it("prioriza a IA quando ambos os tokens vêm válidos", () => {
    expect(
      identificarServico("ia-secret", "sofia-secret", "ia-secret", "sofia-secret")?.origem,
    ).toBe("whatsapp_ia");
  });

  it("rejeita token errado", () => {
    expect(identificarServico("errado", null, "ia-secret", "sofia-secret")).toBeNull();
  });

  it("rejeita quando o env não está configurado (não autentica com string vazia)", () => {
    expect(identificarServico("", null, undefined, undefined)).toBeNull();
    expect(identificarServico(null, null, "ia-secret", "sofia-secret")).toBeNull();
  });
});

describe("extrairAnuncioId", () => {
  it("extrai o anuncioId do leadRef frq_X_ad_Y", () => {
    expect(extrairAnuncioId("frq_abc_ad_2f1a9c4e")).toBe("2f1a9c4e");
  });
  it("retorna null sem ref ou sem padrão ad_", () => {
    expect(extrairAnuncioId(undefined)).toBeNull();
    expect(extrairAnuncioId("frq_abc")).toBeNull();
  });
});
