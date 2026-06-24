import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { sha256, montarFbc, normalizarUserData } from "./capi-hash";

const hashOf = (v: string) => createHash("sha256").update(v).digest("hex");

describe("sha256", () => {
  it("normaliza (trim + lowercase) antes de hashear", () => {
    expect(sha256("  Maria@Email.COM ")).toBe(hashOf("maria@email.com"));
  });
  it("é determinístico", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
  });
});

describe("montarFbc", () => {
  it("monta no formato fb.1.<ts>.<fbclid>", () => {
    expect(montarFbc("ABC123", 1700000000000)).toBe("fb.1.1700000000000.ABC123");
  });
  it("não re-empacota um fbc já completo", () => {
    const jaCompleto = "fb.1.1699999999999.XYZ";
    expect(montarFbc(jaCompleto, 1700000000000)).toBe(jaCompleto);
  });
});

describe("normalizarUserData", () => {
  it("hasheia email, telefone (só dígitos) e external_id", () => {
    const out = normalizarUserData(
      { email: "Ana@x.com", phone: "+55 (41) 99999-0000", external_id: "ana@x.com" },
      1700000000000,
    );
    expect(out.em).toBe(hashOf("ana@x.com"));
    expect(out.ph).toBe(hashOf("5541999990000"));
    expect(out.external_id).toBe(hashOf("ana@x.com"));
  });

  it("monta fbc com o timestamp informado (determinístico, não usa Date.now)", () => {
    const out = normalizarUserData({ fbclid: "CLK" }, 1700000000000);
    expect(out.fbc).toBe("fb.1.1700000000000.CLK");
  });

  it("repassa fbp, ip e user agent sem hashear", () => {
    const out = normalizarUserData(
      { fbp: "fb.1.1.2", client_ip: "1.2.3.4", client_user_agent: "UA" },
      1700000000000,
    );
    expect(out.fbp).toBe("fb.1.1.2");
    expect(out.client_ip_address).toBe("1.2.3.4");
    expect(out.client_user_agent).toBe("UA");
  });

  it("omite campos ausentes", () => {
    expect(normalizarUserData({}, 1700000000000)).toEqual({});
  });
});
