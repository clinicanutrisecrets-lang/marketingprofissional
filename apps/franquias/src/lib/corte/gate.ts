import "server-only";

/**
 * Edição automática de vídeo (gravação do teleprompter → reel editado, cortes,
 * vídeo curto com frase).
 *
 * Aline 13/10/2026: "leva pra todos". O padrão é ABERTO no código, e a
 * variável CORTE_IA_EMAILS virou freio no sentido INVERSO (mesmo desenho da
 * Consultoria e do Marketing): `false`, `0`, `off` ou `nao` fecha de volta
 * pra lista do TIME abaixo (+ REDEPLOY). Qualquer outro valor mantém aberto.
 *
 * A biblioteca de clipes (b-roll) NÃO segue este gate: ela é material do
 * TIME (Aline 02/10), e continua fechada em `bibliotecaDoTime`.
 */
export const PADRAO = [
  "clinicanutrisecrets@gmail.com", // Aline
  "julimendesnutri@gmail.com", // Juliana
  "suporte.vivitavares@gmail.com", // Viviane
  "demo@scannerdasaude.com", // conta demo, onde o time testa e mostra
];

function doTime(email: string | null | undefined): boolean {
  return !!email && PADRAO.includes(email.trim().toLowerCase());
}

export function corteIaFechadoParaTeste(): boolean {
  const bruto = (process.env.CORTE_IA_EMAILS ?? "").trim().toLowerCase();
  return ["false", "0", "off", "nao", "não"].includes(bruto);
}

export function corteIaLiberadoPara(email: string | null | undefined): boolean {
  if (!corteIaFechadoParaTeste()) return true;
  return doTime(email);
}

/** Biblioteca de clipes: sempre só do time, qualquer que seja o freio acima. */
export function bibliotecaDoTime(email: string | null | undefined): boolean {
  return doTime(email);
}
