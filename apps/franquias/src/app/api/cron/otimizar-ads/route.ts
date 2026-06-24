import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pausarCampanha, atualizarBudgetCampanha } from "@/lib/meta/ads";
import { decrypt } from "@/lib/security/encrypt";
import { decidirAcaoAnuncio } from "@/lib/ads/otimizacao";

function tokenDecrypt(raw: string): string {
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * CRON: otimizar-ads (diário 06:30, logo após coletar-metricas-ads das 06:00).
 *
 * Lê as métricas já gravadas em `anuncios` e EXECUTA automaticamente:
 *   - pausa anúncio em desperdício claro (R$200+ sem lead, ou CPL > 2.5x mercado)
 *   - escala budget (+25%) de vencedores (CPL bom + frequência saudável + leads)
 * Tudo auditado em ads_audit_log. Decisão é pura (lib/ads/otimizacao.ts).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const hoje = new Date();

  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id, nicho_principal, budget_anuncio_mensal, meta_ads_access_token")
    .eq("status", "ativo")
    .eq("faz_anuncio_pago", true);

  const resultados: Array<Record<string, unknown>> = [];

  for (const franq of (franqueadas ?? []) as Array<Record<string, unknown>>) {
    const fid = franq.id as string;
    const tokenRaw = franq.meta_ads_access_token as string | null;
    if (!tokenRaw) continue;
    const accessToken = tokenDecrypt(tokenRaw);
    const nicho = (franq.nicho_principal as string) ?? "nutricao_funcional";
    const budgetMensal = Number(franq.budget_anuncio_mensal ?? 0);

    const { data: ativos } = await admin
      .from("anuncios")
      .select(
        "id, meta_campaign_id, objetivo_negocio, budget_diario, gasto_total, leads, cpl, ctr, frequency, data_inicio",
      )
      .eq("franqueada_id", fid)
      .eq("status", "ativo");

    const lista = (ativos ?? []) as Array<Record<string, unknown>>;
    const gastoMes = lista.reduce((s, a) => s + Number(a.gasto_total ?? 0), 0);
    const capMensalRestante = Math.max(0, budgetMensal - gastoMes);

    for (const a of lista) {
      const cpl = a.cpl != null ? Number(a.cpl) : null;

      // benchmark mediano do nicho/objetivo
      const { data: bench } = await admin
        .from("benchmarks_mercado")
        .select("valor_mediano")
        .eq("nicho", nicho)
        .eq("objetivo_anuncio", a.objetivo_negocio as string)
        .eq("regiao", "BR_geral")
        .maybeSingle();
      const cplBenchmarkMediano =
        bench != null ? Number((bench as { valor_mediano: number }).valor_mediano) : null;

      const dataInicio = a.data_inicio ? new Date(a.data_inicio as string) : hoje;
      const diasAtivo = Math.max(
        0,
        Math.floor((hoje.getTime() - dataInicio.getTime()) / 86_400_000),
      );

      const decisao = decidirAcaoAnuncio({
        diasAtivo,
        gastoTotal: Number(a.gasto_total ?? 0),
        leads: Number(a.leads ?? 0),
        cpl,
        ctr: a.ctr != null ? Number(a.ctr) : null,
        frequency: a.frequency != null ? Number(a.frequency) : null,
        budgetDiario: Number(a.budget_diario ?? 0),
        cplBenchmarkMediano,
        capMensalRestante,
      });

      const campId = a.meta_campaign_id as string | null;

      if (decisao.acao === "pausar") {
        if (campId) {
          try {
            await pausarCampanha({ accessToken, campaignId: campId });
          } catch {
            /* sync best-effort — reconcile job pega */
          }
        }
        await admin
          .from("anuncios")
          .update({
            status: "pausado_por_performance_ruim",
            pausado_automaticamente: true,
            motivo_pausa: decisao.motivo,
            pausado_em: new Date().toISOString(),
          })
          .eq("id", a.id as string);
        await admin.from("ads_audit_log").insert({
          franqueada_id: fid,
          anuncio_id: a.id,
          ator: "sistema_cron",
          acao: "pausa_auto_performance",
          estado_antes: { status: "ativo", cpl },
          estado_depois: { status: "pausado_por_performance_ruim" },
          motivo: decisao.motivo,
        });
      } else if (decisao.acao === "escalar" && decisao.novoBudgetDiario) {
        if (campId) {
          try {
            await atualizarBudgetCampanha({
              accessToken,
              campaignId: campId,
              novoBudgetDiarioCentavos: Math.round(decisao.novoBudgetDiario * 100),
            });
          } catch {
            /* best-effort */
          }
        }
        await admin
          .from("anuncios")
          .update({ budget_diario: decisao.novoBudgetDiario })
          .eq("id", a.id as string);
        await admin.from("ads_audit_log").insert({
          franqueada_id: fid,
          anuncio_id: a.id,
          ator: "sistema_cron",
          acao: "escala_auto_budget",
          estado_antes: { budget_diario: Number(a.budget_diario ?? 0) },
          estado_depois: { budget_diario: decisao.novoBudgetDiario },
          motivo: decisao.motivo,
        });
      }

      resultados.push({
        anuncioId: a.id,
        acao: decisao.acao,
        motivo: decisao.motivo,
        ...(decisao.alertaSaturacao ? { saturacao: true } : {}),
      });
    }
  }

  return NextResponse.json({ ok: true, processados: resultados.length, acoes: resultados });
}
