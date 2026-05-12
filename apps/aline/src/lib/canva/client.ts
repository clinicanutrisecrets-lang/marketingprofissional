import "server-only";
import { createAlineClient } from "@/lib/supabase/server";

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth";

export const CANVA_SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "asset:read",
  "asset:write",
];

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env ausente: ${name}`);
  return v;
}

export function buildAuthUrl(state: string): string {
  const u = new URL(`${CANVA_AUTH_BASE}/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", getEnv("CANVA_CLIENT_ID"));
  u.searchParams.set("redirect_uri", getEnv("CANVA_REDIRECT_URI"));
  u.searchParams.set("scope", CANVA_SCOPES.join(" "));
  u.searchParams.set("state", state);
  return u.toString();
}

export type CanvaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export async function exchangeCode(code: string): Promise<CanvaTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: getEnv("CANVA_CLIENT_ID"),
    client_secret: getEnv("CANVA_CLIENT_SECRET"),
    redirect_uri: getEnv("CANVA_REDIRECT_URI"),
  });
  const res = await fetch(`${CANVA_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Canva exchangeCode ${res.status}: ${txt}`);
  }
  return res.json() as Promise<CanvaTokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<CanvaTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getEnv("CANVA_CLIENT_ID"),
    client_secret: getEnv("CANVA_CLIENT_SECRET"),
  });
  const res = await fetch(`${CANVA_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Canva refresh ${res.status}: ${txt}`);
  }
  return res.json() as Promise<CanvaTokenResponse>;
}

export async function getCanvaUserInfo(
  accessToken: string,
): Promise<{ user: { id: string; display_name?: string }; email?: string }> {
  const res = await fetch(`${CANVA_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Canva users/me ${res.status}`);
  return res.json();
}

type CanvaConnectionRow = {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string;
  canva_user_id: string | null;
};

/**
 * Retorna access token válido. Refresh automático se expirado (margem 60s).
 * Throw se não houver conexão Canva.
 */
export async function getValidAccessToken(): Promise<string> {
  const admin = createAlineClient();

  const { data, error } = await admin.rpc("get_canva_credentials");
  if (error || !data || (Array.isArray(data) && data.length === 0)) {
    throw new Error("Canva não conectado (rode /api/canva/connect primeiro)");
  }

  const row = (Array.isArray(data) ? data[0] : data) as CanvaConnectionRow;
  if (!row?.access_token) throw new Error("Canva sem access_token na DB");

  const expiraEm = new Date(row.token_expiry).getTime();
  const agora = Date.now();
  if (expiraEm - agora > 60_000) {
    return row.access_token;
  }

  if (!row.refresh_token) {
    throw new Error("Canva token expirado e sem refresh_token. Reconecte.");
  }

  const novo = await refreshAccessToken(row.refresh_token);
  const novoExpiry = new Date(Date.now() + novo.expires_in * 1000).toISOString();
  await admin.rpc("set_canva_credentials", {
    p_access_token: novo.access_token,
    p_refresh_token: novo.refresh_token ?? row.refresh_token,
    p_token_expiry: novoExpiry,
    p_canva_user_id: row.canva_user_id,
    p_canva_user_email: null,
    p_scopes: null,
    p_user_id: null,
  });
  return novo.access_token;
}

async function canvaFetch(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const token = init.token ?? (await getValidAccessToken());
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(init.headers as Record<string, string>),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${CANVA_API_BASE}${path}`, { ...init, headers });
}

export type CanvaDesignSummary = { id: string; thumbnail?: { url: string } };

export async function copyDesign(designId: string): Promise<CanvaDesignSummary> {
  const res = await canvaFetch(`/designs/${designId}/copy`, { method: "POST" });
  if (!res.ok) throw new Error(`Canva copy ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { design: CanvaDesignSummary };
  return j.design;
}

export async function uploadAssetFromBuffer(
  buf: Buffer,
  filename: string,
): Promise<{ id: string }> {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const res = await canvaFetch("/asset-uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(filename).toString("base64") }),
    },
    body: ab,
  });
  if (!res.ok) throw new Error(`Canva uploadAsset ${res.status}: ${await res.text()}`);
  const job = (await res.json()) as { job: { id: string; status: string; asset?: { id: string } } };

  // Poll até completar
  for (let i = 0; i < 30; i++) {
    if (job.job.status === "success" && job.job.asset) return { id: job.job.asset.id };
    if (job.job.status === "failed") throw new Error("Canva uploadAsset job falhou");
    await new Promise((r) => setTimeout(r, 1000));
    const st = await canvaFetch(`/asset-uploads/${job.job.id}`);
    if (!st.ok) throw new Error(`Canva poll upload ${st.status}`);
    const sj = (await st.json()) as typeof job;
    Object.assign(job, sj);
  }
  throw new Error("Canva uploadAsset timeout");
}

export type EditOp =
  | { type: "replace_text"; layer_name: string; value: string }
  | { type: "replace_image"; layer_name: string; asset_id: string };

/**
 * Aplica operações de edição num design.
 *
 * NOTA: a Canva Connect API tem múltiplas formas de editar conteúdo
 * (autofill via brand_template, edit endpoints via design tools).
 * Como pivotamos pra duplicate-and-edit em design "comum", esta função
 * usa o endpoint /designs/{id}/edits que aceita uma lista de operações
 * por nome de layer.
 */
export async function applyEdits(
  designId: string,
  ops: EditOp[],
): Promise<void> {
  const res = await canvaFetch(`/designs/${designId}/edits`, {
    method: "POST",
    body: JSON.stringify({ edits: ops }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Canva applyEdits ${res.status}: ${txt}`);
  }
}

export type ExportFormat = "png" | "jpg" | "pdf";

export async function exportDesignPng(designId: string): Promise<string> {
  const res = await canvaFetch("/exports", {
    method: "POST",
    body: JSON.stringify({
      design_id: designId,
      format: { type: "png" },
    }),
  });
  if (!res.ok) throw new Error(`Canva export ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as {
    job: { id: string; status: string; urls?: string[] };
  };

  for (let i = 0; i < 60; i++) {
    if (j.job.status === "success" && j.job.urls && j.job.urls.length > 0) {
      return j.job.urls[0];
    }
    if (j.job.status === "failed") throw new Error("Canva export falhou");
    await new Promise((r) => setTimeout(r, 1500));
    const st = await canvaFetch(`/exports/${j.job.id}`);
    if (!st.ok) throw new Error(`Canva poll export ${st.status}`);
    const sj = (await st.json()) as typeof j;
    Object.assign(j, sj);
  }
  throw new Error("Canva export timeout");
}
