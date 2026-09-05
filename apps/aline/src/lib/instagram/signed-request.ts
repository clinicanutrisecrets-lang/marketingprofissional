import { createHmac, timingSafeEqual } from "crypto";

/**
 * Lê o `signed_request` que a Meta manda nos callbacks de desautorização e
 * de exclusão de dados: "<assinatura base64url>.<payload base64url>",
 * HMAC-SHA256 com o app secret. Devolve null se a assinatura não bater com
 * nenhum dos segredos configurados.
 */
export function lerSignedRequest(signedRequest: string): Record<string, unknown> | null {
  const [sigB64, payloadB64] = signedRequest.split(".");
  if (!sigB64 || !payloadB64) return null;
  const segredos = [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET].filter((s): s is string => !!s);
  const sig = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const ok = segredos.some((s) => {
    const esperado = createHmac("sha256", s).update(payloadB64).digest();
    return esperado.length === sig.length && timingSafeEqual(esperado, sig);
  });
  if (!ok) return null;
  try {
    return JSON.parse(Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}
