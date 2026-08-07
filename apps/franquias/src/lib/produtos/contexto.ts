import type { createClient } from "@/lib/supabase/server";
import type { ProdutoContexto } from "@/lib/claude/prompts";

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
    .select("nome, tipo, preco_centavos, checkout_url")
    .eq("franqueada_id", franqueadaId)
    .eq("ativo", true)
    .order("nome")
    .limit(12);

  if (error) {
    console.error("[produtos-contexto] select falhou:", error.message);
    return [];
  }

  return (data ?? []).map((p) => {
    const row = p as {
      nome: string;
      tipo: string | null;
      preco_centavos: number | null;
      checkout_url: string;
    };
    return {
      nome: row.nome,
      tipo: row.tipo ?? undefined,
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
