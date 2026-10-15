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
 * Carrossel por tema do Scanner, aberto DENTRO do "Posts e Conteúdo" do
 * Scanner (Aline/Juliana 15/10: "deve abrir dentro do Marketing, e não sair
 * pro Scanner"). A página do Scanner troca o iframe pela tela do carrossel,
 * com a mesma moldura e um botão de voltar; o tema (dos temas em alta e das
 * datas) vai junto. Sem tema, abre o carrossel em branco.
 *
 * O link é sempre `target="_top"`: dentro do iframe, abrir o Scanner no
 * próprio iframe colocaria o Scanner dentro do Scanner.
 */
export function urlCarrosselNoScanner(tema?: string): string {
  const t = (tema ?? "").trim();
  const base = `${SCANNER_SAAS_URL}/nutri/marketing/posts?abrir=carrossel`;
  return t ? `${base}&tema=${encodeURIComponent(t)}` : base;
}
