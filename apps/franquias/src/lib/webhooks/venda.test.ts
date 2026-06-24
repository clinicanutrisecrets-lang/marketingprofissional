import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  assinaturaValida,
  parsePayloadVenda,
  resolverEventId,
  ehReversao,
} from "./venda";

const SECRET = "segredo-de-teste-123";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");

const payloadBase = {
  evento: "venda_aprovada",
  pedido_id: "ord_1",
  franqueada_id: "frq-uuid",
  valor: 1800,
  currency: "BRL",
  produto: "teste_genetico",
  cliente: { email: "p@x.com", phone: "5541999990000", nome: "Paciente" },
};

describe("assinaturaValida", () => {
  it("aceita assinatura correta (hex puro)", () => {
    const body = JSON.stringify(payloadBase);
    expect(assinaturaValida(body, sign(body), SECRET)).toBe(true);
  });
  it("aceita prefixo sha256=", () => {
    const body = JSON.stringify(payloadBase);
    expect(assinaturaValida(body, `sha256=${sign(body)}`, SECRET)).toBe(true);
  });
  it("rejeita assinatura errada", () => {
    const body = JSON.stringify(payloadBase);
    expect(assinaturaValida(body, sign("outro corpo"), SECRET)).toBe(false);
  });
  it("rejeita assinatura ausente", () => {
    expect(assinaturaValida("{}", null, SECRET)).toBe(false);
  });
  it("rejeita assinatura com tamanho diferente sem estourar", () => {
    expect(assinaturaValida("{}", "abc", SECRET)).toBe(false);
  });
});

describe("parsePayloadVenda", () => {
  it("valida e normaliza um payload correto", () => {
    const r = parsePayloadVenda(payloadBase);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.valor).toBe(1800);
      expect(r.payload.currency).toBe("BRL");
      expect(r.payload.cliente?.email).toBe("p@x.com");
      expect(r.payload.anuncio_id).toBeNull();
    }
  });
  it("default de currency é BRL", () => {
    const { ...semCurrency } = payloadBase;
    delete (semCurrency as Record<string, unknown>).currency;
    const r = parsePayloadVenda(semCurrency);
    expect(r.ok && r.payload.currency).toBe("BRL");
  });
  it("rejeita evento inválido", () => {
    const r = parsePayloadVenda({ ...payloadBase, evento: "qualquer" });
    expect(r.ok).toBe(false);
  });
  it("rejeita sem pedido_id", () => {
    const r = parsePayloadVenda({ ...payloadBase, pedido_id: "" });
    expect(r.ok).toBe(false);
  });
  it("rejeita sem franqueada_id", () => {
    const { ...sem } = payloadBase;
    delete (sem as Record<string, unknown>).franqueada_id;
    expect(parsePayloadVenda(sem).ok).toBe(false);
  });
  it("rejeita valor negativo ou não-numérico", () => {
    expect(parsePayloadVenda({ ...payloadBase, valor: -1 }).ok).toBe(false);
    expect(parsePayloadVenda({ ...payloadBase, valor: "x" }).ok).toBe(false);
  });
  it("rejeita corpo não-objeto", () => {
    expect(parsePayloadVenda(null).ok).toBe(false);
    expect(parsePayloadVenda("texto").ok).toBe(false);
  });
});

describe("resolverEventId", () => {
  it("usa o event_id informado quando presente", () => {
    const r = parsePayloadVenda({ ...payloadBase, event_id: "evt-xyz" });
    expect(r.ok && resolverEventId(r.payload)).toBe("evt-xyz");
  });
  it("deriva de venda_<pedido_id> quando ausente", () => {
    const r = parsePayloadVenda(payloadBase);
    expect(r.ok && resolverEventId(r.payload)).toBe("venda_ord_1");
  });
});

describe("ehReversao", () => {
  it("classifica estorno e chargeback como reversão", () => {
    expect(ehReversao("venda_estornada")).toBe(true);
    expect(ehReversao("chargeback")).toBe(true);
    expect(ehReversao("venda_aprovada")).toBe(false);
  });
});
