import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarProdutosScanner } from "@/lib/produtos/actions";
import { PostsVendaClient } from "./PostsVendaClient";

export const dynamic = "force-dynamic";

/**
 * Posts de venda — lista os produtos que a nutri vende no Scanner
 * Tratamentos (cache produtos_scanner) e gera post de venda por produto,
 * com descrição, preço e link REAIS de checkout.
 */
export default async function PostsVendaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resultado = await listarProdutosScanner();

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>

        <h1 className="text-2xl font-bold text-brand-text">Posts de venda</h1>
        <p className="mt-1 text-sm text-brand-text/60">
          Seus produtos do Scanner Tratamentos viram post — com descrição no seu tom,
          preço real e o link verdadeiro do seu checkout. Recomendação: no máximo 1 post
          de venda a cada 5 posts de conteúdo.
        </p>

        <div className="mt-6">
          {resultado.ok ? (
            <PostsVendaClient
              produtosIniciais={resultado.produtos}
              temVinculo={resultado.temVinculo}
            />
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Erro ao carregar seus produtos — recarregue a página. ({resultado.erro})
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
