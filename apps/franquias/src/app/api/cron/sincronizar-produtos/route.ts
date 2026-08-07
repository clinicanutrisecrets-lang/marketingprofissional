import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sincronizarProdutosScanner } from "@/lib/produtos/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON diário: sincroniza os produtos do Scanner Tratamentos de todas as
 * franqueadas vinculadas ao Scanner SaaS (scanner_saas_user_id preenchido).
 * Mantém o cache produtos_scanner fresco pros posts de venda e pro
 * contexto de geração — preço/link velho em post é cliente comprando errado.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: franqueadas, error } = await admin
    .from("franqueadas")
    .select("id, nome_completo")
    .not("scanner_saas_user_id", "is", null)
    .in("status", ["ativo", "onboarding"]);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const resultados: Array<{ franqueada_id: string; ok: boolean; detalhe: string }> = [];
  for (const f of franqueadas ?? []) {
    const fr = f as { id: string };
    const r = await sincronizarProdutosScanner(fr.id);
    resultados.push({
      franqueada_id: fr.id,
      ok: r.ok,
      detalhe: r.ok ? `${r.total} produtos` : r.motivo,
    });
  }

  const falhas = resultados.filter((r) => !r.ok && r.detalhe !== "sem_vinculo_scanner");
  if (falhas.length > 0) {
    console.error("[cron sincronizar-produtos] falhas:", JSON.stringify(falhas));
  }

  return NextResponse.json({
    ok: true,
    total: resultados.length,
    falhas: falhas.length,
    resultados,
  });
}
