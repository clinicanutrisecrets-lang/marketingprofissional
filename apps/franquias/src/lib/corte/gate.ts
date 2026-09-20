import "server-only";

/**
 * Cortes com IA (gravação do teleprompter → reel editado) está em teste
 * fechado. Só aparece pras contas listadas em CORTE_IA_EMAILS (separadas por
 * vírgula). Sem a variável, vale a lista padrão abaixo (conta da Aline).
 *
 * Quando for abrir pra todas as franqueadas: CORTE_IA_EMAILS=* na Vercel.
 */
const PADRAO = ["clinicanutrisecrets@gmail.com"];

export function corteIaLiberadoPara(email: string | null | undefined): boolean {
  const bruto = process.env.CORTE_IA_EMAILS?.trim();
  if (bruto === "*") return true;
  const lista = (bruto ? bruto.split(",") : PADRAO)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && lista.includes(email.toLowerCase());
}
