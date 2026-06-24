import { describe, it, expect } from "vitest";
import { agruparJornadas, mascararContato, resumoFunil, type EventoConversao } from "./jornada";

describe("mascararContato", () => {
  it("mascara email preservando domínio", () => {
    expect(mascararContato("maria@gmail.com")).toBe("ma***@gmail.com");
  });
  it("mascara telefone mostrando últimos 4", () => {
    expect(mascararContato(null, "5541999991234")).toBe("***1234");
  });
  it("retorna null sem contato", () => {
    expect(mascararContato(null, null)).toBeNull();
  });
});

describe("agruparJornadas", () => {
  it("agrupa eventos do mesmo email numa jornada e pega o estágio mais avançado", () => {
    const evs: EventoConversao[] = [
      { tipo: "Lead", event_time: "2026-06-01T10:00:00Z", value: null, fbclid: "x", anuncio_id: "ad1", email: "p@x.com", nome: "Paciente" },
      { tipo: "Schedule", event_time: "2026-06-02T10:00:00Z", value: 650, fbclid: "x", anuncio_id: "ad1", email: "p@x.com" },
      { tipo: "Purchase", event_time: "2026-06-03T10:00:00Z", value: 1800, fbclid: "x", anuncio_id: "ad1", email: "p@x.com" },
    ];
    const js = agruparJornadas(evs);
    expect(js).toHaveLength(1);
    expect(js[0]!.estagio).toBe("Purchase");
    expect(js[0]!.valorComprado).toBe(1800);
    expect(js[0]!.nome).toBe("Paciente");
    expect(js[0]!.eventos).toBe(3);
  });

  it("reembolso reduz o valor comprado", () => {
    const evs: EventoConversao[] = [
      { tipo: "Purchase", event_time: "2026-06-03T10:00:00Z", value: 1800, fbclid: null, anuncio_id: null, email: "p@x.com" },
      { tipo: "Refund", event_time: "2026-06-04T10:00:00Z", value: -1800, fbclid: null, anuncio_id: null, email: "p@x.com" },
    ];
    expect(agruparJornadas(evs)[0]!.valorComprado).toBe(0);
  });

  it("separa pacientes diferentes", () => {
    const evs: EventoConversao[] = [
      { tipo: "Lead", event_time: "2026-06-01T10:00:00Z", value: null, fbclid: null, anuncio_id: null, email: "a@x.com" },
      { tipo: "Lead", event_time: "2026-06-01T11:00:00Z", value: null, fbclid: null, anuncio_id: null, email: "b@x.com" },
    ];
    expect(agruparJornadas(evs)).toHaveLength(2);
  });
});

describe("resumoFunil", () => {
  it("conta jornadas por estágio mais avançado e soma receita", () => {
    const r = resumoFunil([
      { chave: "1", nome: null, contato: null, estagio: "Lead", anuncioId: null, valorComprado: 0, ultimaAtividade: "", eventos: 1 },
      { chave: "2", nome: null, contato: null, estagio: "Purchase", anuncioId: null, valorComprado: 1800, ultimaAtividade: "", eventos: 3 },
      { chave: "3", nome: null, contato: null, estagio: "Schedule", anuncioId: null, valorComprado: 0, ultimaAtividade: "", eventos: 2 },
    ]);
    expect(r.leads).toBe(1);
    expect(r.agendamentos).toBe(1);
    expect(r.compras).toBe(1);
    expect(r.receita).toBe(1800);
  });
});
