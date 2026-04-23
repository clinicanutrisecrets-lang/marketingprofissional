import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { pausarCampanha } from "@/lib/meta/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/ads/kill-switch
 *
 * Pausa TODAS as campanhas ativas da franqueada. Idempotente.
 * Funciona mesmo se Meta API estiver fora (marca local primeiro, sincroniza
 * em retry). Audit log obrigatório.
 *
 * Body: { motivo?: string }
 *
 * Use cases:
 *  - botão vermelho grande no dashboard da nutri
 *  - admin emergencial pra qualquer franqueada
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { motivo?: string; franqueadaId?: string };

  // Resolve franqueada alvo
  let franqueadaId = body.franqueadaId;
  let ator: "nutri" | "admin" = "nutri";

  if (franqueadaId) {
    const { data: a } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!a) return NextResponse.json({ erro: "Somente admin pausa pra outra" }, { status: 403 });
    ator = "admin";
  } else {
    const { data: f } = await supabase
      .from("franqueadas")
      .select("id, meta_ads_access_token, meta_ads_account_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
    franqueadaId = (f as { id: string }).id;
  }

  const admin = createAdminClient();

  const { data: franq } = await admin
    .from("franqueadas")
    .select("id, meta_ads_access_token, meta_ads_account_id")
    .eq("id", franqueadaId)
    .maybeSingle();
  if (!franq) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });

  const { data: ativos } = await admin
    .from("anuncios")
    .select("id, meta_campaign_id, status")
    .eq("franqueada_id", franqueadaId)
    .eq("status", "ativo");

  const campanhas = (ativos ?? []) as Array<{ id: string; meta_campaign_id: string | null; status: string }>;

  // 1. Marca TODAS como pausada_pela_nutri local (verdade local é o padrão)
  const agora = new Date().toISOString();
  const motivo = body.motivo ?? "Kill switch acionado";

  for (const c of campanhas) {
    await admin
      .from("anuncios")
      .update({
        status: "pausado_pela_nutri",
        pausado_automaticamente: false,
        motivo_pausa: motivo,
        pausado_em: agora,
      })
      .eq("id", c.id);

    await admin.from("ads_audit_log").insert({
      franqueada_id: franqueadaId,
      anuncio_id: c.id,
      ator,
      ator_user_id: user.id,
      acao: "kill_switch",
      estado_antes: { status: c.status },
      estado_depois: { status: "pausado_pela_nutri" },
      motivo,
    });
  }

  // 2. Sincroniza com Meta API em best-effort (job de reconciliação pega o resto)
  const token = (franq as { meta_ads_access_token: string | null; meta_ads_account_id: string | null }).meta_ads_access_token;
  const errosSync: string[] = [];

  if (token && campanhas.length > 0) {
    for (const c of campanhas) {
      if (!c.meta_campaign_id) continue;
      try {
        await pausarCampanha({
          accessToken: token,
          campaignId: c.meta_campaign_id,
        });
      } catch (e) {
        errosSync.push(`${c.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    campanhas_pausadas: campanhas.length,
    sincronizado_meta: errosSync.length === 0,
    erros_sync: errosSync,
    nota:
      errosSync.length > 0
        ? "Algumas campanhas não sincronizaram com Meta agora. Job de reconciliação vai repetir em 15min."
        : undefined,
  });
}
