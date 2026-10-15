/**
 * Rede de segurança de acento no texto que o modelo escreve e vira post.
 *
 * Pedido da Aline (15/10/2026): "arrumar todos os caminhos que possam dar erro
 * de acento". A regra de escrever com acento está no prompt, mas prompt é
 * pedido, não garantia: esta passada é a trava que vale quando o modelo
 * escorrega ("voce", "nao", "saude").
 *
 * Só acentua palavra SEM ambiguidade (a lista mora em `lib/acentos-ptbr.ts`,
 * espelho do scanner-saude). E nunca encosta em:
 *   - link (https://…, www.…, dominio.com/caminho): "consulta-nutrigenetica"
 *     num endereço viraria outro endereço;
 *   - hashtag (#saude é proposital: Instagram não usa acento em hashtag);
 *   - @perfil e e-mail;
 *   - id interno com sublinhado ("saude_feminina").
 * No objeto, os campos de link, hashtag, id e enum também ficam de fora.
 */

import { acentuar } from "../acentos-ptbr.ts";

// O que não se mexe, na ordem em que aparece no texto.
const PROTEGIDO = new RegExp(
  [
    String.raw`(?:https?:\/\/|www\.)\S+`,
    String.raw`[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[a-z]{2,}`,
    String.raw`[#@][\p{L}\p{N}_.]+`,
    String.raw`[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:com|br|net|org|io|app|me|ly|site|link)(?:\.br)?(?![\p{L}\p{N}])(?:\/\S*)?`,
    String.raw`[\p{L}\p{N}]*_[\p{L}\p{N}_]*`,
  ].join("|"),
  "giu",
);

/** Acentua o texto, deixando link, hashtag, @perfil e id interno como estão. */
export function acentuarVisivel(texto: string): string {
  if (!texto) return texto;
  let saida = "";
  let ultimo = 0;
  for (const m of texto.matchAll(PROTEGIDO)) {
    const i = m.index ?? 0;
    saida += acentuar(texto.slice(ultimo, i)) + m[0];
    ultimo = i + m[0].length;
  }
  return saida + acentuar(texto.slice(ultimo));
}

// Campo de link, hashtag, id e valor de enum: nunca é texto pra pessoa ler.
const CAMPO_NAO_TEXTO = /url|link|href|hashtag|slug|^id$|_id$|chave|^tipo$|angulo|consciencia|status|formato|^modelo$|glifo|icone|^cor$/i;

/** Aplica acentuarVisivel em todas as strings de um valor (arrays e objetos). */
export function acentuarFundo<T>(valor: T): T {
  if (typeof valor === "string") return acentuarVisivel(valor) as unknown as T;
  if (Array.isArray(valor)) return valor.map((v) => acentuarFundo(v)) as unknown as T;
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      saida[k] = CAMPO_NAO_TEXTO.test(k) ? v : acentuarFundo(v);
    }
    return saida as unknown as T;
  }
  return valor;
}
