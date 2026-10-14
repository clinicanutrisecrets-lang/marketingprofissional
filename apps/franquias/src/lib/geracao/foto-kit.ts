/**
 * A foto do kit no post do teste (Aline, 14/10/2026): "esse é um fixo no feed
 * e tudo está na legenda; teria que no mínimo ter vídeo de coleta do teste ou
 * foto". Quem nunca viu o teste precisa VER o que chega em casa.
 *
 * As fotos moram em `public/kit/` (recorte das originais de
 * scanner-saude/data/kit, as mesmas da proposta em PDF). Só o teste GENÉTICO
 * usa: o kit do epigenético é outro, e foto do kit errado engana.
 */
import type { ProdutoDaJornada } from "./jornada.ts";

export const FOTOS_KIT_GENETICO = ["/kit/caixa-aberta.jpg", "/kit/caixa-fechada.jpg"] as const;

/** A URL pública da foto do kit pra este post, ou null quando não se aplica. */
export function fotoDoKit(
  produto: ProdutoDaJornada | null | undefined,
  base = process.env.NEXT_PUBLIC_APP_URL || "https://app.scannerdasaude.com",
  indice = 0,
): string | null {
  if (!produto || produto.scanner_produto_id !== "teste_genetico") return null;
  const caminho = FOTOS_KIT_GENETICO[indice % FOTOS_KIT_GENETICO.length]!;
  return `${base.replace(/\/+$/, "")}${caminho}`;
}
