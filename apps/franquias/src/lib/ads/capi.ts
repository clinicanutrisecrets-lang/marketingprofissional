import "server-only";
import { createHash } from "node:crypto";

/**
 * Meta Conversions API (CAPI) — envia eventos server-side.
 * Complementa o pixel client-side; permite matching mesmo com ad blocker.
 *
 * Requisitos:
 * - META_PIXEL_ID (sem NEXT_PUBLIC — só server)
 * - META_CAPI_ACCESS_TOKEN (Access Token do pixel, geração em Events Manager)
 */

const CAPI_VERSION = "v21.0";

export type CAPIUserData = {
  fbclid?: string;
  fbp?: string;
  email?: string;
  phone?: string;
  external_id?: string;
  client_ip?: string;
  client_user_agent?: string;
};

export type CAPIEvent = {
  event_name: "Lead" | "Schedule" | "InitiateCheckout" | "Purchase";
  event_time?: number; // unix seconds
  event_id: string;   // pra dedup com pixel
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
};

function sha256(v: string): string {
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

function normalizarUserData(u: CAPIUserData): Record<string, string> {
  const out: Record<string, string> = {};
  if (u.email) out.em = sha256(u.email);
  if (u.phone) out.ph = sha256(u.phone.replace(/\D/g, ""));
  if (u.external_id) out.external_id = sha256(u.external_id);
  if (u.fbclid) out.fbc = `fb.1.${Date.now()}.${u.fbclid}`;
  if (u.fbp) out.fbp = u.fbp;
  if (u.client_ip) out.client_ip_address = u.client_ip;
  if (u.client_user_agent) out.client_user_agent = u.client_user_agent;
  return out;
}

export async function enviarEventoCAPI(event: CAPIEvent): Promise<CAPIResult> {
  const pixelId = process.env.META_PIXEL_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId) return { ok: false, erro: "META_PIXEL_ID ausente" };
  if (!token) return { ok: false, erro: "META_CAPI_ACCESS_TOKEN ausente" };

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_time: event.event_time ?? Math.floor(Date.now() / 1000),
        event_id: event.event_id,
        event_source_url: event.event_source_url,
        action_source: event.action_source ?? "website",
        user_data: normalizarUserData(event.user_data),
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
      return { ok: false, erro: j.error?.message ?? `HTTP ${resp.status}` };
    }
    return { ok: true, events_received: j.events_received, fbtrace_id: j.fbtrace_id };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}
