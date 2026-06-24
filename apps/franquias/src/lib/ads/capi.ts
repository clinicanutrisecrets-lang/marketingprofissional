import "server-only";
import { normalizarUserData, type CAPIUserData } from "./capi-hash";

/**
 * Meta Conversions API (CAPI) — envia eventos server-side.
 * Complementa o pixel client-side; permite matching mesmo com ad blocker.
 *
 * Requisitos:
 * - META_PIXEL_ID (sem NEXT_PUBLIC — só server)
 * - META_CAPI_ACCESS_TOKEN (Access Token do pixel, geração em Events Manager)
 */

const CAPI_VERSION = "v21.0";

export type { CAPIUserData };

export type CAPIEvent = {
  event_name: "Lead" | "Schedule" | "InitiateCheckout" | "Purchase";
  event_time?: number; // unix seconds
  event_id: string; // pra dedup com pixel
  event_source_url?: string;
  action_source?: "website" | "chat" | "phone_call" | "system_generated";
  value?: number;
  currency?: string;
  user_data: CAPIUserData;
  custom_data?: Record<string, unknown>;
};

export type CAPIResult = {
  ok: boolean;
  events_received?: number;
  fbtrace_id?: string;
  erro?: string;
  /** true quando o erro é transitório (rede/5xx/429) e vale a pena re-tentar */
  retryable?: boolean;
};

export async function enviarEventoCAPI(event: CAPIEvent): Promise<CAPIResult> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId) return { ok: false, erro: "META_PIXEL_ID ausente", retryable: false };
  if (!token) return { ok: false, erro: "META_CAPI_ACCESS_TOKEN ausente", retryable: false };

  const eventTimeSec = event.event_time ?? Math.floor(Date.now() / 1000);

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_time: eventTimeSec,
        event_id: event.event_id,
        event_source_url: event.event_source_url,
        action_source: event.action_source ?? "website",
        // usa o event_time (em ms) pra montar o fbc — mais correto que "agora"
        user_data: normalizarUserData(event.user_data, eventTimeSec * 1000),
        custom_data: {
          ...event.custom_data,
          ...(event.value !== undefined ? { value: event.value } : {}),
          ...(event.currency ? { currency: event.currency } : {}),
        },
      },
    ],
  };

  try {
    const resp = await fetch(
      `https://graph.facebook.com/${CAPI_VERSION}/${pixelId}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const j = (await resp.json()) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message: string };
    };
    if (!resp.ok || j.error) {
      // 5xx e 429 são transitórios; 4xx (exceto 429) são definitivos.
      const retryable = resp.status >= 500 || resp.status === 429;
      return { ok: false, erro: j.error?.message ?? `HTTP ${resp.status}`, retryable };
    }
    return { ok: true, events_received: j.events_received, fbtrace_id: j.fbtrace_id };
  } catch (e) {
    // timeout / erro de rede → transitório
    return { ok: false, erro: e instanceof Error ? e.message : String(e), retryable: true };
  }
}

/**
 * Envia com retry em erros transitórios (rede/5xx/429), backoff exponencial.
 * Erros definitivos (token ausente, 4xx) não re-tentam.
 */
export async function enviarEventoCAPIComRetry(
  event: CAPIEvent,
  opts: { tentativas?: number; baseDelayMs?: number } = {},
): Promise<CAPIResult & { tentativas: number }> {
  const max = opts.tentativas ?? 3;
  const base = opts.baseDelayMs ?? 500;
  let ultimo: CAPIResult = { ok: false, erro: "não executado" };
  for (let i = 1; i <= max; i++) {
    ultimo = await enviarEventoCAPI(event);
    if (ultimo.ok || !ultimo.retryable) return { ...ultimo, tentativas: i };
    if (i < max) await new Promise((r) => setTimeout(r, base * 2 ** (i - 1)));
  }
  return { ...ultimo, tentativas: max };
}
