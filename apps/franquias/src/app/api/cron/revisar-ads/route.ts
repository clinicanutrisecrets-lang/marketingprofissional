import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { revisarAdsFranqueada } from "@/lib/agentes/revisor-ads";
import { enviarEmail } from "@/lib/emails/client";
import { emailRevisaoAdsPronta } from "@/lib/emails/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: revisar-ads (segunda + quinta 08h UTC)
 * Pra cada franqueada com campanhas Meta Ads ativas, gera revisao IA dos
 * ultimos 7 dias e envia email com link.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Pega franqueadas com pelo menos 1 anuncio ativo/pausado com meta_campaign_id
  const { data: anunciosFranqs } = await admin
    .from("anuncios")
    .select("franqueada_id")
    .in("status", ["ativo", "pausado"])
    .not("meta_campaign_id", "is", null);

  const franqueadaIds = Array.from(
    new Set(
      ((anunciosFranqs ?? []) as Array<{ franqueada_id: string }>).map(
        (a) => a.franqueada_id,
      ),
    ),
  );

  if (franqueadaIds.length === 0) {
    return NextResponse.json({ ok: true, revisadas: 0, motivo: "sem campanhas ativas" });
  }

  const resultados: Array<{
    franqueadaId: string;
    ok: boolean;
    pulada?: boolean;
    motivo?: string;
    erro?: string;
    custoUsd?: number;
  }> = [];

  for (const franqueadaId of franqueadaIds) {
    const r = await revisarAdsFranqueada({ franqueadaId });
    resultados.push({ franqueadaId, ...r });

    // Dispara email se gerou nova revisao
    if (r.ok && !r.pulada && r.revisaoId) {
      try {
        await enviarEmailRevisao(franqueadaId, r.revisaoId);
      } catch (e) {
        console.warn("[revisar-ads] email falhou:", e);
      }
    }
  }

  const sucesso = resultados.filter((r) => r.ok && !r.pulada).length;
  const puladas = resultados.filter((r) => r.pulada).length;
  const falhas = resultados.filter((r) => !r.ok).length;

  return NextResponse.json({
    ok: true,
    total: franqueadaIds.length,
    revisadas: sucesso,
    puladas,
    falhas,
    custoTotalUsd: resultados.reduce((s, r) => s + (r.custoUsd ?? 0), 0),
    detalhes: resultados,
  });
}

async function enviarEmailRevisao(franqueadaId: string, revisaoId: string) {
  const admin = createAdminClient();

  const { data: revData } = await admin
    .from("franqueadas_revisoes_ads")
    .select("status_geral, resumo_executivo, recomendacoes, alertas, enviado_email")
    .eq("id", revisaoId)
    .maybeSingle();
  const rev = revData as {
    status_geral: string;
    resumo_executivo: string;
    recomendacoes: unknown[] | null;
    alertas: unknown[] | null;
    enviado_email: boolean;
  } | null;
  if (!rev || rev.enviado_email) return;

  const { data: franqData } = await admin
    .from("franqueadas")
    .select("nome_comercial, nome_completo, email")
    .eq("id", franqueadaId)
    .maybeSingle();
  const franq = franqData as {
    nome_comercial: string | null;
    nome_completo: string;
    email: string;
  } | null;
  if (!franq?.email) return;

  const nome =
    franq.nome_comercial || franq.nome_completo.split(" ")[0] || "Dra.";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com";
  const linkRevisao = `${baseUrl}/dashboard/revisoes-ads/${revisaoId}`;

  const tpl = emailRevisaoAdsPronta({
    nome,
    statusGeral: rev.status_geral,
    resumoExecutivo: rev.resumo_executivo,
    qtdRecomendacoes: (rev.recomendacoes ?? []).length,
    qtdAlertas: (rev.alertas ?? []).length,
    linkRevisao,
  });

  await enviarEmail({
    para: franq.email,
    assunto: tpl.assunto,
    html: tpl.html,
    texto: tpl.texto,
  });

  await admin
    .from("franqueadas_revisoes_ads")
    .update({ enviado_email: true, enviado_em: new Date().toISOString() })
    .eq("id", revisaoId);
}
