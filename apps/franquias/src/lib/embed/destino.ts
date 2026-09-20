/**
 * Modo EMBUTIDO: o app de Marketing rodando dentro do Scanner da Saúde.
 *
 * Pedido da Aline (09/09/2026): a nutri do Consultório de Precisão Avançado
 * ficava confusa com "duas fontes de marketing" — a seção de Marketing do
 * Scanner e este app, aberto por SSO numa aba separada, com cara de outro
 * sistema. A decisão foi trazer este app PARA DENTRO do Scanner, no item
 * "Posts e Conteúdo", num iframe autenticado pelo mesmo SSO de sempre — sem
 * segundo login e sem a nutri perceber que trocou de sistema.
 *
 * Duas coisas moram aqui, puras e testáveis:
 *   • `destinoSeguro` — o `?next=` que o SSO aceita. Só caminho RELATIVO das
 *     áreas logadas; qualquer coisa que pudesse virar redirect aberto
 *     (`//outro.site`, `https:`, `\`) é descartada e cai no /dashboard.
 *   • `EMBED_COOKIE` — o cookie que diz ao layout "estamos dentro do Scanner":
 *     esconde a barra lateral (o Scanner já tem a dele), o botão Sair (sair
 *     de dentro de um iframe deixaria a tela do Scanner com um login do
 *     Marketing no meio) e o rodapé. Vida curta e sem httpOnly de propósito:
 *     o `EmbedGuard` do cliente apaga o cookie se a página for aberta FORA
 *     de um iframe, senão quem entrasse direto em app.scannerdasaude.com
 *     depois de usar o Scanner ficaria sem menu.
 */

export const EMBED_COOKIE = "mp_embed";

/** Segundos de vida do cookie de embed — meio dia cobre a sessão de trabalho. */
export const EMBED_COOKIE_MAX_AGE = 60 * 60 * 12;

const PREFIXOS_PERMITIDOS = ["/dashboard", "/onboarding"];

/**
 * Devolve o caminho se ele for um destino interno legítimo; `null` caso
 * contrário. A regra é estreita de propósito: começa com um dos prefixos
 * logados, é relativo (uma barra só) e não carrega barra invertida nem
 * esquema. Query string e hash são preservados — é por eles que o Scanner
 * abre "Posts de venda" já no produto certo.
 */
export function destinoSeguro(next: string | null | undefined): string | null {
  if (!next) return null;
  const s = next.trim();
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//") || s.includes("\\")) return null;
  if (/^\/[^/?#]*:/.test(s)) return null; // "/javascript:" e afins
  const caminho = s.split(/[?#]/, 1)[0];
  const permitido = PREFIXOS_PERMITIDOS.some(
    (p) => caminho === p || caminho.startsWith(`${p}/`),
  );
  return permitido ? s : null;
}

/** `?embed=1` (ou `true`) liga o modo embutido; qualquer outra coisa, não. */
export function pediuEmbed(valor: string | null | undefined): boolean {
  const v = (valor ?? "").trim().toLowerCase();
  return v === "1" || v === "true";
}
