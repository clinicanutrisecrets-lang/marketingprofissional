import type { createClient } from "@/lib/supabase/server";
import type { ProdutoContexto } from "@/lib/claude/prompts";
import { ehOfertaNaoVendavel } from "./foco";

/** Client do app (user ou admin — mesmo tipo, ambos vêm de lib/supabase/server). */
type DbClient = ReturnType<typeof createClient>;

/**
 * Carrega os produtos ativos da nutri (cache produtos_scanner) no formato
 * que o buildSystemPrompt injeta em TODA geração de copy — assim qualquer
 * legenda/post pode citar produto, preço e link REAIS, nunca inventados.
 *
 * Falha aqui devolve [] — geração de conteúdo nunca quebra por causa do
 * catálogo (o post só sai sem a seção de produtos).
 */
export async function carregarProdutosContexto(
  client: DbClient,
  franqueadaId: string,
): Promise<ProdutoContexto[]> {
  const { data, error } = await client
    .from("produtos_scanner")
    .select("nome, tipo, scanner_produto_id, preco_centavos, checkout_url")
    .eq("franqueada_id", franqueadaId)
    .eq("ativo", true)
    .order("nome")
    // Folga pro filtro de não vendável abaixo, que corta antes do teto de 12.
    .limit(40);

  if (error) {
    console.error("[produtos-contexto] select falhou:", error.message);
    return [];
  }

  // Compra própria, teste interno e peça de combo nunca entram em copy.
  const vendaveis = (data ?? []).filter((p) => !ehOfertaNaoVendavel(p as { nome: string; checkout_url: string }));
  return vendaveis.slice(0, 12).map((p) => {
    const row = p as {
      nome: string;
      tipo: string | null;
      scanner_produto_id: string | null;
      preco_centavos: number | null;
      checkout_url: string;
    };
    return {
      nome: row.nome,
      tipo: row.tipo ?? undefined,
      scanner_produto_id: row.scanner_produto_id ?? undefined,
      preco_texto: formatarPrecoBR(row.preco_centavos),
      checkout_url: row.checkout_url,
    };
  });
}

export function formatarPrecoBR(centavos: number | null | undefined): string | undefined {
  if (typeof centavos !== "number" || centavos <= 0) return undefined;
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
