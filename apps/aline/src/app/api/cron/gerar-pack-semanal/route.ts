import { NextResponse } from "next/server";
import { createAlineClient } from "@/lib/supabase/server";
import { gerarPackSemanal } from "@/lib/posts/gerador-semanal";
import { lerConfig } from "@/lib/automacao/config";

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
  // Chave-geral por perfil (automacao_config.gerar_posts_semanal), DESLIGADA
  // por padrão desde 05/09: a Aline pausou a geração pra repensar a estratégia.
  const { data: perfisBrutos } = await aline
    .from("perfis")
    .select("slug, nome, automacao_config")
    .eq("ativo", true);
  const perfis = ((perfisBrutos ?? []) as Array<{ slug: string; nome: string; automacao_config: unknown }>).filter(
    (p) => lerConfig(p.automacao_config).gerar_posts_semanal,
  );

  if (perfis.length === 0) {
    return NextResponse.json({ ok: true, geradosPara: 0, motivo: "geração semanal desligada em todos os perfis" });
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
