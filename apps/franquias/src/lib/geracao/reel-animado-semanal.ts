/**
 * O reel animado da semana (Aline, 05/10/2026): o reel desenhado no estilo
 * "Detetive da Saúde" entra no pacote de domingo JUNTO com o vídeo de b-roll,
 * não no lugar dele. Um por semana, até 1 minuto.
 *
 * Funções puras (o que vira tema e em que dia ele sai); a geração mora em
 * lib/conteudo/reel-animado.ts.
 */

/** Tema do reel: a primeira queixa da rodada, contada pelo mecanismo. */
export function temaDoReelAnimado(queixas: readonly string[], nicho: string): string {
  const q = queixas.map((x) => x.trim()).find(Boolean) || nicho.replace(/_/g, " ");
  return `${q}: o mecanismo por trás (sintoma, gene, alimentos que ajudam e o que investigar)`;
}

/**
 * Dia do reel animado: o segundo dia de post da semana, pra não cair no
 * mesmo dia do reel de b-roll (que é o primeiro). Com um dia só, ele.
 */
export function diaDoReelAnimado(dias: readonly number[]): number {
  return dias[1] ?? dias[0] ?? 3;
}
