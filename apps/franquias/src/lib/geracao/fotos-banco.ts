/**
 * "Minhas fotos": o banco de fotos da profissional que o pacote da semana usa
 * na capa do carrossel e no post de feed.
 *
 * Por quê (Aline, 05/10/2026, depois do "achei feio a semana" da Daiane e do
 * Gleryston): desde 25/09 a arte da semana sai só tipográfica (fundo na cor da
 * marca + título). Ficou limpa, mas sem imagem fica com cara de slide. A ideia
 * da Juliana: um banco de fotos dela, dos pratos, do consultório, que o
 * pacote puxa como capa. Sem foto no banco, a arte segue tipográfica.
 *
 * A seleção é pura (dá pra testar); baixar fica em `baixarFotoDoBanco`.
 */

/**
 * O que entra no banco. `foto_post` é o tipo da tela "Minhas fotos"; as
 * fotos da clínica e a profissional, que algumas já subiram no cadastro,
 * entram junto. Logo e depoimento não.
 */
export const TIPOS_FOTO_BANCO = [
  "foto_post",
  "foto_clinica",
  "foto_atendimento",
  "foto_profissional",
] as const;

export type FotoDoBanco = { id: string; url_storage: string };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A fila de fotos da semana. A ordem de base é a de envio (mais antiga
 * primeiro); a semana decide de onde a fila começa, pra a mesma foto não abrir
 * toda semana. Os posts consomem a fila em sequência, então dentro da semana
 * não repete enquanto houver foto nova.
 */
export function filaDaSemana<T extends { id: string }>(fotos: T[], semanaRef: string): T[] {
  if (fotos.length === 0) return [];
  const inicio = hash(semanaRef) % fotos.length;
  return [...fotos.slice(inicio), ...fotos.slice(0, inicio)];
}

/** O caminho no bucket a partir da URL gravada (assinada ou pública). */
export function caminhoNoBucket(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1]!, path: decodeURIComponent(m[2]!) };
}

/** Os posts da semana que levam foto do banco. */
export function tipoLevaFotoDoBanco(tipo: string): boolean {
  return tipo === "feed_carrossel" || tipo === "feed_imagem";
}
