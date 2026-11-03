/**
 * Regras do download das artes (sem DOM: usadas pela rota e pelo botão).
 *
 * 🔴 O botão buscava a arte com `fetch` e salvava por um link `blob:` criado na
 * hora. Dentro do Scanner (iframe de outro domínio) o navegador pode descartar
 * esse download em silêncio: a Daiane (Android) clicava, nada aparecia na tela
 * e nada baixava (27/10/2026). Agora o botão aponta pra `/api/arte/baixar`, do
 * PRÓPRIO Marketing, que devolve o arquivo com `Content-Disposition:
 * attachment`. Download same-origin por link comum não depende de blob nem de
 * o clique "ainda valer" depois de uma espera.
 */

const PREFIXO_STORAGE = "/storage/v1/object/";

/**
 * A rota só busca arte do Storage do Marketing (o link assinado já é a
 * permissão de leitura). Qualquer outro endereço é recusado: sem isso a rota
 * viraria um proxy aberto pra baixar qualquer site em nome do nosso domínio.
 */
export function urlArtePermitida(url: string, supabaseUrl: string | undefined): boolean {
  if (!supabaseUrl) return false;
  try {
    const alvo = new URL(url);
    const base = new URL(supabaseUrl);
    return alvo.protocol === "https:" && alvo.host === base.host && alvo.pathname.startsWith(PREFIXO_STORAGE);
  } catch {
    return false;
  }
}

/** Nome de arquivo seguro pro cabeçalho (sem aspas, barras nem acento). */
export function nomeArquivoSeguro(nome: string | null | undefined): string {
  const limpo = (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return limpo || "arte.png";
}

/**
 * Para onde o botão aponta. Arte guardada no próprio app (caminho que começa
 * com "/", como a capa dos vídeos da marca) já é do mesmo domínio e baixa
 * direto; o resto passa pela rota.
 */
export function enderecoDeDownload(url: string, nome: string): string {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return `/api/arte/baixar?u=${encodeURIComponent(url)}&n=${encodeURIComponent(nomeArquivoSeguro(nome))}`;
}

/**
 * Várias artes de uma vez (carrossel, "Baixar as N artes") viram UM .zip.
 *
 * 🔴 Zulene, 03/11/2026: "baixa só uma arte". Dentro do Scanner (iframe de
 * outro domínio) o navegador deixa sair o PRIMEIRO download de uma sequência
 * e bloqueia os seguintes em silêncio, por mais respiro que haja entre eles.
 * Um arquivo só passa sempre.
 */
export type ItemZip = { u: string; n: string };

export const MAX_ITENS_ZIP = 80;

/** Valida o que a tela mandou: só arte do Storage do Marketing ou do próprio app. */
export function itensDoZip(raw: unknown, supabaseUrl: string | undefined): ItemZip[] {
  if (!Array.isArray(raw)) return [];
  const vistos = new Set<string>();
  const saida: ItemZip[] = [];
  for (const x of raw.slice(0, MAX_ITENS_ZIP)) {
    const u = typeof (x as ItemZip)?.u === "string" ? (x as ItemZip).u : "";
    const propria = u.startsWith("/") && !u.startsWith("//");
    if (!propria && !urlArtePermitida(u, supabaseUrl)) continue;
    // Nome repetido dentro do zip sobrescreveria: numera.
    let n = nomeArquivoSeguro((x as ItemZip).n);
    let k = 2;
    while (vistos.has(n)) n = n.replace(/(\.[a-z0-9]+)?$/i, (ext) => `-${k++}${ext}`);
    vistos.add(n);
    saida.push({ u, n });
  }
  return saida;
}
