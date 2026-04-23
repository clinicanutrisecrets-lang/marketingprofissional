import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { pausarCampanha } from "@/lib/meta/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * CRON: verificar-budget-ads (roda a cada 1h)
 * Circuit breakers automáticos:
 *   1. Cap mensal duro: gasto_mes >= 98% budget_mensal → pausa TODAS
 *   2. Cap diário duro: gasto_hoje >= budget_diario_maximo → pausa dia
 *   3. Alerta em 80%, 95% (email) — sem pausa, só aviso
 *
 * Nunca quebra silencioso: audit_log registra tudo.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();

  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id, nome_completo, budget_anuncio_mensal, budget_diario_maximo, budget_alerta_percentual, meta_ads_access_token, email")
    .eq("status", "ativo")
    .eq("faz_anuncio_pago", true);

  const resultados: Array<Record<string, unknown>> = [];

  for (const franq of (franqueadas ?? []) as Array<Record<string, unknown>>) {
    const fid = franq.id as string;
    const budgetMensal = Number(franq.budget_anuncio_mensal ?? 0);
    const alertaPct = Number(franq.budget_alerta_percentual ?? 80);
    const token = franq.meta_ads_access_token as string | null;

    if (!budgetMensal || !token) continue;

    const { data: anunciosAtivos } = await admin
      .from("anuncios")
      .select("id, meta_campaign_id, gasto_total, gasto_hoje, cpl, status")
      .eq("franqueada_id", fid)
      .in("status", ["ativo"]);

    const ativos = (anunciosAtivos ?? []) as Array<Record<string, unknown>>;
    const gastoMes = ativos.reduce((s, a) => s + Number(a.gasto_total ?? 0), 0);
    const gastoHoje = ativos.reduce((s, a) => s + Number(a.gasto_hoje ?? 0), 0);
    const pctUsado = (gastoMes / budgetMensal) * 100;

    // 1. Cap mensal duro: 98%
    if (pctUsado >= 98 && ativos.length > 0) {
      for (const a of ativos) {
        if (a.meta_campaign_id) {
          try {
            await pausarCampanha({
              accessToken: token,
              campaignId: a.meta_campaign_id as string,
            });
          } catch {
            // falha sync — job de reconcile pega
          }
        }
        await admin
          .from("anuncios")
          .update({
            status: "pausado_pelo_budget_cap",
            pausado_automaticamente: true,
            motivo_pausa: `Cap mensal atingido: R$${gastoMes.toFixed(2)} de R$${budgetMensal.toFixed(2)} (${pctUsado.toFixed(1)}%)`,
            pausado_em: new Date().toISOString(),
          })
          .eq("id", a.id as string);

        await admin.from("ads_audit_log").insert({
          franqueada_id: fid,
          anuncio_id: a.id,
          ator: "sistema_kill_switch",
          acao: "pausa_auto_budget",
          estado_antes: { status: "ativo" },
          estado_depois: { status: "pausado_pelo_budget_cap" },
          motivo: `gasto_mes ${gastoMes.toFixed(2)} / ${budgetMensal.toFixed(2)} = ${pctUsado.toFixed(1)}%`,
        });
      }
      resultados.push({
        franqueadaId: fid,
        acao: "pausa_mensal_98pct",
        pct: pctUsado,
        campanhas_pausadas: ativos.length,
      });
      continue;
    }

    // 2. Cap diário (se configurado)
    const capDiario = Number(franq.budget_diario_maximo ?? 0);
    if (capDiario > 0 && gastoHoje >= capDiario) {
      for (const a of ativos) {
        if (a.meta_campaign_id) {
          try {
            await pausarCampanha({
              accessToken: token,
              campaignId: a.meta_campaign_id as string,
            });
          } catch {}
        }
        await admin
          .from("anuncios")
          .update({
            status: "pausado_pelo_budget_cap",
            pausado_automaticamente: true,
            motivo_pausa: `Cap diário atingido: R$${gastoHoje.toFixed(2)} de R$${capDiario.toFixed(2)}`,
            pausado_em: new Date().toISOString(),
          })
          .eq("id", a.id as string);

        await admin.from("ads_audit_log").insert({
          franqueada_id: fid,
          anuncio_id: a.id,
          ator: "sistema_kill_switch",
          acao: "pausa_auto_cap_diario",
          estado_antes: { status: "ativo" },
          estado_depois: { status: "pausado_pelo_budget_cap" },
          motivo: `gasto_hoje ${gastoHoje.toFixed(2)} >= cap_diario ${capDiario.toFixed(2)}`,
        });
      }
      resultados.push({
        franqueadaId: fid,
        acao: "pausa_diaria",
        gasto_hoje: gastoHoje,
        cap: capDiario,
      });
      continue;
    }

    // 3. Alertas (sem pausa)
    if (pctUsado >= alertaPct) {
      resultados.push({
        franqueadaId: fid,
        acao: "alerta",
        pct: pctUsado,
        nivel: pctUsado >= 95 ? "urgente_95pct" : `alerta_${alertaPct}pct`,
      });
      // TODO: disparar email via Resend quando tabela de emails estiver pronta
    }
  }

  return NextResponse.json({
    ok: true,
    processados: (franqueadas ?? []).length,
    acoes: resultados,
  });
}
