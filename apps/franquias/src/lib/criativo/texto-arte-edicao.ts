/**
 * Corrigir o texto DA ARTE de um post sugerido, antes de postar.
 *
 * Pedido da Juliana e da Aline (08/10/2026): "um botão de corrigir o texto
 * antes de gerar a imagem"; "reduz a objeção de que não dá pra mudar as
 * informações do post sugerido". O "Editar" da tela Aprovar semana só mudava
 * a legenda: o texto desenhado na arte não ficava guardado em lugar nenhum.
 *
 * Agora a geração guarda as peças em `posts_agendados.texto_arte` e a tela
 * deixa corrigir cada uma. O redesenho usa o desenhador tipográfico (o mesmo
 * da geração), então corrigir o texto NÃO chama modelo nenhum: custo zero,
 * bem mais barato que gerar o post de novo.
 *
 * Funções puras: nada de rede nem banco.
 */
import { semLink } from "./texto-arte.ts";

export type PecaArte = { headline: string; subtitle?: string; corpo?: string };

export const MAX_HEADLINE = 160;
export const MAX_SUBTITLE = 220;
export const MAX_CORPO = 600;

/** Tipos cuja arte é desenhada aqui e, portanto, pode ser redesenhada. */
export const TIPOS_COM_ARTE_EDITAVEL = ["feed_carrossel", "feed_imagem", "stories"] as const;

export function tipoTemArteEditavel(tipo: unknown): boolean {
  return (TIPOS_COM_ARTE_EDITAVEL as readonly string[]).includes(String(tipo));
}

function limpar(v: unknown, max: number): string {
  // Travessão vira vírgula (regra de texto da casa); link não vai na arte.
  return semLink(String(v ?? "").replace(/\s*[—–]\s*/g, ", "))
    .trim()
    .slice(0, max);
}

/** Lê o que está gravado em `texto_arte`. Formato estranho = null (não editável). */
export function lerTextoArte(v: unknown): PecaArte[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const pecas: PecaArte[] = [];
  for (const p of v) {
    if (!p || typeof p !== "object") return null;
    const o = p as Record<string, unknown>;
    const peca: PecaArte = { headline: typeof o.headline === "string" ? o.headline : "" };
    if (typeof o.subtitle === "string" && o.subtitle) peca.subtitle = o.subtitle;
    if (typeof o.corpo === "string" && o.corpo) peca.corpo = o.corpo;
    pecas.push(peca);
  }
  return pecas;
}

/**
 * Confere e limpa o que ela escreveu. O NÚMERO de peças é o da arte original:
 * corrigir texto não acrescenta nem tira slide (isso mudaria o carrossel que
 * ela aprovou como estrutura). Peça sem nenhum texto é recusada: viraria
 * slide em branco no Instagram.
 */
export function normalizarPecasEditadas(
  editadas: unknown,
  original: PecaArte[],
): { ok: true; pecas: PecaArte[] } | { ok: false; erro: string } {
  if (!Array.isArray(editadas) || editadas.length !== original.length) {
    return { ok: false, erro: "A arte mudou de tamanho. Recarregue a página e tente de novo." };
  }
  const pecas: PecaArte[] = [];
  for (let i = 0; i < editadas.length; i++) {
    const o = (editadas[i] ?? {}) as Record<string, unknown>;
    const headline = limpar(o.headline, MAX_HEADLINE);
    const subtitle = limpar(o.subtitle, MAX_SUBTITLE);
    const corpo = limpar(o.corpo, MAX_CORPO);
    if (!headline && !corpo) {
      return {
        ok: false,
        erro: original.length > 1 ? `O slide ${i + 1} ficou sem texto.` : "A arte ficou sem texto.",
      };
    }
    const peca: PecaArte = { headline };
    if (subtitle) peca.subtitle = subtitle;
    if (corpo) peca.corpo = corpo;
    pecas.push(peca);
  }
  return { ok: true, pecas };
}

/** Nada mudou? Então não redesenha (evita imagem nova à toa). */
export function mesmasPecas(a: PecaArte[], b: PecaArte[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Só redesenha post em revisão. "Aprovado significa que você não quer mais
 * fazer alterações" (Aline, 13/09): depois de aprovar, a arte fica como está.
 */
export function podeRedesenhar(post: { status?: unknown; data_hora_postado?: unknown; tipo_post?: unknown }): boolean {
  if (post.data_hora_postado) return false;
  if (!tipoTemArteEditavel(post.tipo_post)) return false;
  return post.status === "aguardando_aprovacao";
}
