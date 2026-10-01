import "server-only";

/**
 * Edição automática de vídeo (gravação do teleprompter → reel editado) está
 * em teste fechado. Aparece pras contas da lista abaixo SOMADAS às de
 * CORTE_IA_EMAILS (separadas por vírgula). A lista do código vale sempre: a
 * sessão que liberou a Juliana e a Viviane (01/10/2026) não tinha acesso às
 * variáveis da Vercel, e uma variável já preenchida apagaria a lista daqui.
 *
 * Quando for abrir pra todas as franqueadas: CORTE_IA_EMAILS=* na Vercel.
 */
export const PADRAO = [
  "clinicanutrisecrets@gmail.com", // Aline
  "julimendesnutri@gmail.com", // Juliana
  "suporte.vivitavares@gmail.com", // Viviane
  "demo@scannerdasaude.com", // conta demo, onde o time testa e mostra
];

export function corteIaLiberadoPara(email: string | null | undefined): boolean {
  const bruto = process.env.CORTE_IA_EMAILS?.trim();
  if (bruto === "*") return true;
  const lista = [...PADRAO, ...(bruto ? bruto.split(",") : [])]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && lista.includes(email.trim().toLowerCase());
}
