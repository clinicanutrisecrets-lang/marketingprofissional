/**
 * Endereço público do Scanner da Saúde (o SaaS-mãe), pra links que saem
 * deste app e caem lá — hoje, o "Virar e-book" do Estúdio, que abre o gerador
 * de e-book do Scanner com o tema da sugestão. `NEXT_PUBLIC_` porque o link é
 * montado no cliente.
 */
export const SCANNER_SAAS_URL = (
  process.env.NEXT_PUBLIC_SCANNER_SAAS_URL || "https://scannerdasaude.com"
).replace(/\/+$/, "");

/**
 * URL do gerador de e-book do Scanner já com o tema preenchido.
 *
 * `target="_top"` no link, sempre: quando este app está embutido no Scanner
 * (iframe), abrir dentro do iframe colocaria o Scanner dentro do Scanner.
 */
export function urlEbookNoScanner(tema: string): string {
  return `${SCANNER_SAAS_URL}/nutri/ebook?tema=${encodeURIComponent(tema.trim())}&origem=marketing`;
}
