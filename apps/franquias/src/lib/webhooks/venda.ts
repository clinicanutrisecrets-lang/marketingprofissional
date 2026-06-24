import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lógica pura do webhook de venda da plataforma própria (checkout Asaas).
 * Sem "server-only"/DB pra ser testável. Ver docs/HANDOFF-PLATAFORMA-PROPRIA.md.
 */

export type EventoVenda = "venda_aprovada" | "venda_estornada" | "chargeback";

export type PayloadVenda = {
  evento: EventoVenda;
  pedido_id: string;
  event_id?: string;
  franqueada_id: string;
  anuncio_id?: string | null;
  fbclid?: string | null;
  fbp?: string | null;
  valor: number;
  currency?: string;
  produto?: string;
  cliente?: { email?: string; phone?: string; nome?: string };
  event_time?: string;
};

const EVENTOS_VALIDOS: ReadonlySet<string> = new Set([
  "venda_aprovada",
  "venda_estornada",
  "chargeback",
]);

/**
 * Compara assinaturas em tempo constante (evita timing attack).
 * Aceita tanto "<hex>" quanto "sha256=<hex>".
 */
export function assinaturaValida(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const recebida = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const esperada = createHmac("sha256", secret).update(rawBody).digest("hex");
  // timingSafeEqual exige buffers do mesmo tamanho
  if (recebida.length !== esperada.length) return false;
  try {
    return timingSafeEqual(Buffer.from(recebida, "hex"), Buffer.from(esperada, "hex"));
  } catch {
    return false;
  }
}

export type ParseResult =
  | { ok: true; payload: PayloadVenda }
  | { ok: false; erro: string };

/**
 * Valida e normaliza o payload da venda. Retorna erro descritivo se inválido,
 * pra responder 400 sem estourar exceção.
 */
export function parsePayloadVenda(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, erro: "corpo não é objeto" };
  const p = raw as Record<string, unknown>;

  const evento = p.evento;
  if (typeof evento !== "string" || !EVENTOS_VALIDOS.has(evento)) {
    return { ok: false, erro: `evento inválido: ${String(evento)}` };
  }
  if (typeof p.pedido_id !== "string" || p.pedido_id.trim() === "") {
    return { ok: false, erro: "pedido_id ausente" };
  }
  if (typeof p.franqueada_id !== "string" || p.franqueada_id.trim() === "") {
    return { ok: false, erro: "franqueada_id ausente" };
  }
  const valor = Number(p.valor);
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, erro: "valor inválido" };
  }

  const cliente = (typeof p.cliente === "object" && p.cliente !== null
    ? (p.cliente as Record<string, unknown>)
    : {}) as { email?: unknown; phone?: unknown; nome?: unknown };

  return {
    ok: true,
    payload: {
      evento: evento as EventoVenda,
      pedido_id: p.pedido_id,
      event_id: typeof p.event_id === "string" ? p.event_id : undefined,
      franqueada_id: p.franqueada_id,
      anuncio_id: typeof p.anuncio_id === "string" ? p.anuncio_id : null,
      fbclid: typeof p.fbclid === "string" ? p.fbclid : null,
      fbp: typeof p.fbp === "string" ? p.fbp : null,
      valor,
      currency: typeof p.currency === "string" ? p.currency : "BRL",
      produto: typeof p.produto === "string" ? p.produto : undefined,
      cliente: {
        email: typeof cliente.email === "string" ? cliente.email : undefined,
        phone: typeof cliente.phone === "string" ? cliente.phone : undefined,
        nome: typeof cliente.nome === "string" ? cliente.nome : undefined,
      },
      event_time: typeof p.event_time === "string" ? p.event_time : undefined,
    },
  };
}

/** event_id determinístico pra dedup: usa o informado, senão deriva do pedido. */
export function resolverEventId(payload: PayloadVenda): string {
  return payload.event_id ?? `venda_${payload.pedido_id}`;
}

/** venda_estornada/chargeback são reversões (registram conversão negativa). */
export function ehReversao(evento: EventoVenda): boolean {
  return evento === "venda_estornada" || evento === "chargeback";
}
