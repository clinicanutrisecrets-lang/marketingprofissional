/**
 * Vídeo curto: um clipe da biblioteca com a frase escrita em cima.
 *
 * Pedido da Aline (22/09/2026): "fazer aqueles vídeos curtinhos que é só o
 * vídeo com uma escrita em cima, que está na moda".
 *
 * 🔴 ESTA RÉGUA É ESPELHO da do worker (packages/corte-ia/clipe_frase.py).
 * Os números vivem nos dois lados porque a tela precisa recusar ANTES de
 * gastar uma rodada de worker, e o worker precisa recusar mesmo que alguém
 * chame a rota direto. Mudou aqui, muda lá — há teste comparando os dois
 * arquivos, justamente pra não divergirem calados.
 */

export const FRASE_MAX = 120;
export const DUR_MIN = 2;
export const DUR_MAX = 15;
export const DUR_PADRAO = 8;

export type Avaliacao = { ok: true; frase: string } | { ok: false; msg: string };

/** Frase pronta pra tela, ou o motivo da recusa em linguagem de quem lê. */
export function avaliarFrase(bruta: string): Avaliacao {
  const frase = (bruta || "").split(/\s+/).filter(Boolean).join(" ");
  if (!frase) return { ok: false, msg: "Escreva a frase que vai aparecer no vídeo." };
  if (frase.length > FRASE_MAX) {
    return {
      ok: false,
      msg: `A frase tem ${frase.length} caracteres e no vídeo curto cabem ${FRASE_MAX}. Corte pro essencial, que é o que faz esse formato funcionar.`,
    };
  }
  return { ok: true, frase };
}

/**
 * Duração final. Nunca passa do clipe: repetir ou congelar o último quadro
 * entrega vídeo travado, que é pior que vídeo curto.
 */
export function duracaoFinal(pedida: number | null | undefined, duracaoClipe: number | null | undefined): number {
  const d = Math.max(DUR_MIN, Math.min(DUR_MAX, pedida || DUR_PADRAO));
  const clipe = duracaoClipe && duracaoClipe > 0 ? duracaoClipe : null;
  return clipe ? Math.round(Math.min(d, clipe) * 100) / 100 : d;
}

/** De onde o clipe veio. A URL nunca sai da tela — só o id. */
export type OrigemClipe = "biblioteca" | "acervo";

export function origemValida(v: unknown): OrigemClipe {
  return v === "acervo" ? "acervo" : "biblioteca";
}
