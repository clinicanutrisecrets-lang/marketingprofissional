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

/**
 * Carrossel por tema do Scanner já com o tema preenchido. É o caminho de um
 * tema em alta virar post COMPLETO (capa, slides e legenda); o "Post manual"
 * deste app só escreve a legenda, e era pra lá que o tema em alta mandava
 * (Juliana 14/10: "aperta o botão e ele só gera a legenda").
 */
export function urlCarrosselNoScanner(tema: string): string {
  return `${SCANNER_SAAS_URL}/nutri/conteudo/carrossel?tema=${encodeURIComponent(tema.trim())}`;
}

/** O Carrossel por tema do Scanner, sem tema (porta da tela Criar post). */
export const URL_CARROSSEL_TEMA = `${SCANNER_SAAS_URL}/nutri/conteudo/carrossel`;
