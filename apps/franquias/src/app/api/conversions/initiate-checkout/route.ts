import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enviarEventoCAPI } from "@/lib/ads/capi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/conversions/initiate-checkout
 *
 * Chamado pela Sofia (SaaS) quando envia link Kiwify do teste genetico
 * pro lead. Sinal forte de intencao de compra — dispara CAPI
 * InitiateCheckout pro Meta otimizar pra perfis com intencao real.
 *
 * Purchase vem depois pelo webhook Kiwify quando compra for aprovada.
 * Dedup entre os 2 eventos é via event_id diferente (Purchase tem seu
 * proprio event_id baseado em orderId do Kiwify).
 *
 * Body: igual ao /api/conversions/lead + valor (default: valor_teste
 * da franqueada, fallback 1800).
 *
 * Auth: header x-sofia-token = SOFIA_INTERNAL_TOKEN
 */
export async function POST(req: Request) {
  const sofiaToken = req.headers.get("x-sofia-token");
  const isSofia = sofiaToken && sofiaToken === process.env.SOFIA_INTERNAL_TOKEN;

  const body = (await req.json().catch(() => ({}))) as {
    franqueadaId?: string;
    leadRef?: string;
    paciente?: { email?: string; phone?: string; nome?: string };
    fbclid?: string;
    fbp?: string;
    anuncioId?: string;
    clientIp?: string;
    userAgent?: string;
    valor?: number;
  };

  let franqueadaId = body.franqueadaId;

  if (!isSofia) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
    if (franqueadaId) {
      const { data: a } = await supabase
        .from("admins")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!a) return NextResponse.json({ erro: "Somente admin" }, { status: 403 });
    } else {
      const { data: f } = await supabase
        .from("franqueadas")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
      franqueadaId = (f as { id: string }).id;
    }
  }

  if (!franqueadaId) {
    return NextResponse.json({ erro: "franqueadaId obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: f } = await admin
    .from("franqueadas")
    .select("valor_pacote_mensal")
    .eq("id", franqueadaId)
    .maybeSingle();

  // valor default = R$1800 (teste nutrigenético)
  const valor = body.valor ?? 1800;

  let anuncioId = body.anuncioId ?? null;
  if (!anuncioId && body.leadRef) {
    const match = body.leadRef.match(/ad_([a-f0-9-]+)/i);
    if (match) anuncioId = match[1]!;
  }

  const eventId = `initcheckout_${randomUUID()}`;

  const { data: registrada } = await admin
    .from("conversoes_registradas")
    .insert({
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
      tipo: "InitiateCheckout",
      event_id: eventId,
      event_time: new Date().toISOString(),
      value: valor,
      currency: "BRL",
      fbclid: body.fbclid ?? null,
      fbp: body.fbp ?? null,
      origem: isSofia ? "sofia" : "admin_manual",
      payload_origem: body as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  const capi = await enviarEventoCAPI({
    event_name: "InitiateCheckout",
    event_id: eventId,
    value: valor,
    currency: "BRL",
    action_source: "chat",
    user_data: {
      email: body.paciente?.email,
      phone: body.paciente?.phone,
      fbclid: body.fbclid,
      fbp: body.fbp,
      external_id: body.paciente?.email ?? body.paciente?.phone,
      client_ip: body.clientIp,
      client_user_agent: body.userAgent,
    },
    custom_data: {
      content_name: "Link Kiwify enviado pela Sofia",
      content_category: "health_test",
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
      lead_ref: body.leadRef,
    },
  });

  if (registrada) {
    await admin
      .from("conversoes_registradas")
      .update({
        capi_enviado: capi.ok,
        capi_resposta: capi.ok ? { events_received: capi.events_received } : null,
        capi_erro: capi.ok ? null : capi.erro,
        capi_tentativas: 1,
      })
      .eq("id", (registrada as { id: string }).id);
  }

  return NextResponse.json({ ok: true, eventId, capi: capi.ok, anuncioId });
}
