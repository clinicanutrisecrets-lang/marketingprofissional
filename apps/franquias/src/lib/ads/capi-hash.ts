import { createHash } from "node:crypto";

/**
 * Lógica pura de normalização de dados pro Meta CAPI.
 * Separado de capi.ts (que tem "server-only" + fetch) pra ser testável.
 */

export function sha256(v: string): string {
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

/**
 * Monta o parâmetro `fbc` no formato exigido pela Meta:
 *   fb.1.<timestamp_ms>.<fbclid>
 * O timestamp ideal é o momento do clique. Quando temos o event_time,
 * usamos ele (mais correto que "agora"); senão, caímos pro nowMs informado.
 *
 * Se o valor recebido já estiver no formato fbc completo (fb.1.*), repassa.
 */
export function montarFbc(fbclid: string, nowMs: number): string {
  if (/^fb\.\d+\.\d+\./.test(fbclid)) return fbclid; // já é um fbc completo
  return `fb.1.${nowMs}.${fbclid}`;
}

export type CAPIUserData = {
  fbclid?: string;
  fbp?: string;
  email?: string;
  phone?: string;
  external_id?: string;
  client_ip?: string;
  client_user_agent?: string;
};

/**
 * Normaliza + hasheia os dados do usuário pro formato CAPI.
 * @param nowMs timestamp em ms usado pra montar o fbc (default: Date.now()).
 */
export function normalizarUserData(
  u: CAPIUserData,
  nowMs: number = Date.now(),
): Record<string, string> {
  const out: Record<string, string> = {};
  if (u.email) out.em = sha256(u.email);
  if (u.phone) out.ph = sha256(u.phone.replace(/\D/g, ""));
  if (u.external_id) out.external_id = sha256(u.external_id);
  if (u.fbclid) out.fbc = montarFbc(u.fbclid, nowMs);
  if (u.fbp) out.fbp = u.fbp;
  if (u.client_ip) out.client_ip_address = u.client_ip;
  if (u.client_user_agent) out.client_user_agent = u.client_user_agent;
  return out;
}
