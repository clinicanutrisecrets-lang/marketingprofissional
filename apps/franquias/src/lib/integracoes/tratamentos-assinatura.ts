import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC SHA256 (hex) do corpo cru, igual ao canal Scanner → Marketing
 * (app/api/integrations/scanner/conteudo-pronto). Aceita "sha256=" na frente.
 * Arquivo puro: o teste roda com node --test.
 */
export function assinar(corpo: string, secret: string): string {
  return createHmac("sha256", secret).update(corpo).digest("hex");
}

export function assinaturaConfere(corpo: string, recebida: string, secret: string): boolean {
  if (!recebida || !secret) return false;
  const limpa = recebida.startsWith("sha256=") ? recebida.slice(7) : recebida;
  const a = Buffer.from(limpa);
  const b = Buffer.from(assinar(corpo, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
