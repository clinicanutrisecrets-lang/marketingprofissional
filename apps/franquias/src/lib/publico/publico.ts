/**
 * lib/publico/publico.ts — a forma do público, sem servidor.
 *
 * Separado de `sync.ts` de propósito: aquele fala com o banco e com o Hub e
 * carrega `server-only`; este é função pura, e por isso roda no teste e também
 * no navegador (a tela de aprovação valida o público espelhado pra montar o
 * contexto do revisor).
 */

import type { PublicoDaCopy } from "@/lib/claude/copy-agent";

/**
 * Aceita só o que tem forma de público, e descarta o resto.
 *
 * 🔴 O que chega é JSON de outro serviço. Gravar sem conferir faria o prompt
 * carregar qualquer coisa que viesse do outro lado — e prompt é onde texto
 * estranho vira instrução.
 */
export function validarPublico(bruto: unknown): PublicoDaCopy | null {
  if (!bruto || typeof bruto !== "object") return null;
  const p = bruto as Record<string, unknown>;

  const textos = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim().slice(0, 120))
          .slice(0, 30)
      : [];
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 120 ? v : null;

  const queixas = textos(p.queixas);
  const naoAtende =
    typeof p.nao_atende === "string" && p.nao_atende.trim()
      ? p.nao_atende.trim().slice(0, 600)
      : null;

  // Mesma regra do Hub: sem queixa e sem "não atende" não há fronteira, e um
  // público vazio faria a trava do emagrecimento disparar por omissão.
  if (queixas.length === 0 && !naoAtende) return null;

  return {
    quem: textos(p.quem),
    idade_min: num(p.idade_min),
    idade_max: num(p.idade_max),
    queixas,
    nao_atende: naoAtende,
    como_chega: textos(p.como_chega),
    trata_peso: p.trata_peso === true,
  };
}
