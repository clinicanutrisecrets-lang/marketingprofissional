/**
 * Regras puras do carrossel do Scanner salvo na galeria (o teste roda com
 * node --test, sem servidor). O servidor está em galeria-scanner.ts.
 */

export const MAX_SLIDES_GALERIA = 20;

/** `<franqueada>/carrossel/<lote>_slide01.png`: a pasta é da conta, o nome é previsível e ordenável. */
export function nomeDoSlide(franqueadaId: string, lote: number, i: number): string {
  return `${franqueadaId}/carrossel/${lote}_slide${String(i + 1).padStart(2, "0")}.png`;
}

/** Só aceita confirmar um caminho que este app mesmo deu para esta conta. */
export function caminhoDaGaleriaValido(franqueadaId: string, path: string): boolean {
  const esc = franqueadaId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${esc}/carrossel/\\d{10,16}_slide\\d{2}\\.png$`).test(path);
}
