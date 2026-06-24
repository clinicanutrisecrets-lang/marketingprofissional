/**
 * Auth de serviço pros endpoints de conversão (lead/schedule/initiate-checkout).
 * Fonte primária: IA central no WhatsApp (x-ia-token). Mantém x-sofia-token
 * como legado durante a transição. Lógica pura → testável.
 */

export type ServicoCaller = { autorizado: true; origem: "whatsapp_ia" | "sofia" };

export function identificarServico(
  iaToken: string | null,
  sofiaToken: string | null,
  envIa: string | undefined,
  envSofia: string | undefined,
): ServicoCaller | null {
  if (envIa && iaToken && iaToken === envIa) return { autorizado: true, origem: "whatsapp_ia" };
  if (envSofia && sofiaToken && sofiaToken === envSofia) return { autorizado: true, origem: "sofia" };
  return null;
}

/** Extrai anuncioId de um leadRef no formato frq_<id>_ad_<anuncioId>. */
export function extrairAnuncioId(leadRef: string | undefined | null): string | null {
  if (!leadRef) return null;
  const match = leadRef.match(/ad_([a-f0-9-]+)/i);
  return match ? match[1]! : null;
}
