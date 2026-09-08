/**
 * Leitura do código de um post a partir do link do Instagram.
 *
 * Fica em arquivo próprio, sem nenhum import com o atalho `@/`, porque a suíte
 * roda em `node --test` sem bundler e não resolve esse atalho.
 */

/** Aceita /p/, /reel/, /reels/, /tv/, com o perfil no meio, com query e com barra final. */
export function codigoDoLink(link: string): string | null {
  const m = link.trim().match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) return m[1];
  const cru = link.trim().replace(/\/+$/, "");
  return /^[A-Za-z0-9_-]{5,}$/.test(cru) ? cru : null;
}
