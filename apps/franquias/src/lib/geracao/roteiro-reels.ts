/**
 * O roteiro falado do reel da semana: do JSON do modelo até o teleprompter.
 *
 * Por que isto existe: o gerador semanal sempre pediu `script_reels` ao modelo
 * e o descartava na hora de gravar o post. O reel chegava à tela Aprovar
 * semana como legenda sem vídeo (o vídeo de fundo depende do Creatomate, que
 * está sem crédito desde 13/09/2026, e a publicação pela API está parada).
 * O produto do reel da semana é a profissional gravando, com o roteiro no
 * teleprompter que já existe (`/dashboard/teleprompter?texto=`), igual ao post
 * de venda e ao Estúdio de conteúdo.
 *
 * Função pura, sem React nem Supabase: roda no teste e no navegador.
 */

/** Limite do campo do teleprompter (`maxLength` do textarea do Hub). */
export const ROTEIRO_MAX_CHARS = 4000;

/**
 * O que gravar em `posts_agendados.roteiro_reels` a partir do que o modelo
 * devolveu. Só reel tem roteiro; o resto grava nulo, nunca string vazia.
 */
export function roteiroDoReelGerado(
  tipo: string,
  gerado: { script_reels?: unknown },
): string | null {
  if (tipo !== "reels") return null;
  const bruto = gerado.script_reels;
  if (typeof bruto !== "string") return null;
  const limpo = limparRoteiro(bruto);
  return limpo.length > 0 ? limpo : null;
}

/**
 * Tira o que não é fala: marcação de cena entre colchetes ("[pausa]",
 * "[olha pra câmera]") e rótulos de bloco no começo da linha ("Hook:",
 * "CTA:"). Tudo que sobrar vai ser lido em voz alta.
 */
export function limparRoteiro(texto: string): string {
  return texto
    .replace(/\[[^\]\n]{1,60}\]/g, " ")
    .split("\n")
    .map((l) => l.replace(/^\s*(hook|gancho|cta|fechamento|abertura|virada)\s*:\s*/i, "").trim())
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, ROTEIRO_MAX_CHARS);
}

/** Link que abre o teleprompter já com o roteiro deste post. */
export function linkTeleprompter(roteiro: string): string {
  return `/dashboard/teleprompter?texto=${encodeURIComponent(roteiro)}`;
}

/** Palavras do roteiro, pra estimar a duração falada (~2,5 palavras/s). */
export function duracaoEstimadaSegundos(roteiro: string): number {
  const palavras = roteiro.split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.round(palavras / 2.5));
}
