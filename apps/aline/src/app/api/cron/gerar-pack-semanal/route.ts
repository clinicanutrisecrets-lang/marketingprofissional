import { NextResponse } from "next/server";
import { createAlineClient } from "@/lib/supabase/server";
import { gerarPackSemanal } from "@/lib/posts/gerador-semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: toda quinta-feira 9h (UTC), gera pack semanal pra cada perfil ativo.
 * Os posts entram em status='aguardando_aprovacao' pra Aline aprovar em bloco
 * antes de sabado de manha.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }

  const aline = createAlineClient();
  const { data: perfis } = await aline
    .from("perfis")
    .select("slug, nome")
    .eq("ativo", true);

  if (!perfis || perfis.length === 0) {
    return NextResponse.json({ ok: true, geradosPara: 0 });
  }

  const resultados: Array<{
    slug: string;
    ok: boolean;
    qtd?: number;
    semanaRef?: string;
    erro?: string;
    custoUsd?: number;
  }> = [];

  for (const p of perfis as Array<{ slug: string; nome: string }>) {
    const r = await gerarPackSemanal({ perfilSlug: p.slug, qtd: 5 });
    resultados.push({
      slug: p.slug,
      ok: r.ok,
      qtd: r.postIds?.length,
      semanaRef: r.semanaRef,
      erro: r.erro,
      custoUsd: r.custoUsd,
    });
  }

  const sucesso = resultados.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    perfis: perfis.length,
    sucesso,
    falhas: perfis.length - sucesso,
    resultados,
  });
}
