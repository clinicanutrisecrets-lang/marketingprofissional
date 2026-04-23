import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getInsightsCampanha } from "@/lib/meta/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: coletar-metricas-ads (diário às 06:00)
 * Para cada campanha ativa, busca insights do Meta Graph API e atualiza
 * gasto_total, cpl, cpm, ctr, frequency, impressoes, cliques.
 * Também atualiza avaliacao_vs_benchmark consultando benchmarks_mercado.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: anuncios } = await admin
    .from("anuncios")
    .select("id, franqueada_id, meta_campaign_id, objetivo_negocio")
    .in("status", ["ativo", "pausado"])
    .not("meta_campaign_id", "is", null);

  const lista = (anuncios ?? []) as Array<{
    id: string;
    franqueada_id: string;
    meta_campaign_id: string;
    objetivo_negocio: string;
  }>;

  const { data: franqueadasData } = await admin
    .from("franqueadas")
    .select("id, meta_ads_access_token, nicho_principal");

  const tokens = new Map<string, { token: string; nicho: string }>();
  for (const f of (franqueadasData ?? []) as Array<{
    id: string;
    meta_ads_access_token: string | null;
    nicho_principal: string | null;
  }>) {
    if (f.meta_ads_access_token) {
      tokens.set(f.id, {
        token: f.meta_ads_access_token,
        nicho: f.nicho_principal ?? "nutricao_funcional",
      });
    }
  }

  const resultados: Array<Record<string, unknown>> = [];

  for (const a of lista) {
    const t = tokens.get(a.franqueada_id);
    if (!t) continue;

    try {
      const insights = await getInsightsCampanha({
        accessToken: t.token,
        campaignId: a.meta_campaign_id,
      });

      // Avaliar vs benchmark
      const metricaMap: Record<string, string> = {
        receber_mensagens: "cpl",
        agendar_consultas: "cpa_consulta",
        vender_teste_genetico: "cac",
      };
      const metricaBench = metricaMap[a.objetivo_negocio] ?? "cpl";

      const { data: bench } = await admin
        .from("benchmarks_mercado")
        .select("valor_excelente, valor_bom, valor_mediano, valor_ruim")
        .eq("nicho", t.nicho)
        .eq("objetivo_anuncio", a.objetivo_negocio)
        .eq("metrica", metricaBench)
        .eq("regiao", "BR_geral")
        .maybeSingle();

      let avaliacao: string | null = null;
      const cpl = insights.cpl ?? null;
      if (bench && cpl !== null) {
        const b = bench as { valor_excelente: number; valor_bom: number; valor_mediano: number; valor_ruim: number };
        if (cpl <= b.valor_excelente) avaliacao = "excelente";
        else if (cpl <= b.valor_bom) avaliacao = "bom";
        else if (cpl <= b.valor_mediano) avaliacao = "mediano";
        else avaliacao = "ruim";
      }

      await admin
        .from("anuncios")
        .update({
          gasto_total: insights.spend ?? 0,
          impressoes: insights.impressions ?? 0,
          cliques: insights.clicks ?? 0,
          leads: insights.leads ?? 0,
          cpl: insights.cpl ?? null,
          cpm: insights.cpm ?? null,
          ctr: insights.ctr ?? null,
          frequency: insights.frequency ?? null,
          avaliacao_vs_benchmark: avaliacao,
          ultima_coleta_metricas: new Date().toISOString(),
        })
        .eq("id", a.id);

      resultados.push({ id: a.id, ok: true, gasto: insights.spend, cpl, avaliacao });
    } catch (e) {
      resultados.push({
        id: a.id,
        ok: false,
        erro: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processados: lista.length,
    resultados,
  });
}
