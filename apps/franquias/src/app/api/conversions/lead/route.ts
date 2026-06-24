import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enviarEventoCAPIComRetry } from "@/lib/ads/capi";
import { identificarServico, extrairAnuncioId } from "@/lib/conversions/servico-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/conversions/lead
 *
 * Chamado pela Sofia (SaaS) quando identifica que é um lead qualificado
 * (paciente real interessado, forneceu email/phone ou pediu agendamento).
 * Dispara evento Lead pro Meta via CAPI — sinal pro algoritmo otimizar
 * entrega dos ads pra perfis similares.
 *
 * Body:
 * {
 *   franqueadaId: string,         // nutri responsável (resolvido via slug da URL Sofia)
 *   leadRef?: string,              // parâmetro ref capturado (frq_X_ad_Y)
 *   paciente: { email?, phone?, nome? },
 *   fbclid?: string,
 *   fbp?: string,
 *   anuncioId?: string,
 *   clientIp?: string,             // user_data.client_ip_address
 *   userAgent?: string,
 * }
 *
 * Auth: header x-ia-token = WHATSAPP_IA_TOKEN (IA central no WhatsApp).
 *       x-sofia-token = SOFIA_INTERNAL_TOKEN ainda aceito (legado/transição).
 */
export async function POST(req: Request) {
  const servico = identificarServico(
    req.headers.get("x-ia-token"),
    req.headers.get("x-sofia-token"),
    process.env.WHATSAPP_IA_TOKEN,
    process.env.SOFIA_INTERNAL_TOKEN,
  );
  const isServico = !!servico;

  const body = (await req.json().catch(() => ({}))) as {
    franqueadaId?: string;
    leadRef?: string;
    paciente?: { email?: string; phone?: string; nome?: string };
    fbclid?: string;
    fbp?: string;
    anuncioId?: string;
    clientIp?: string;
    userAgent?: string;
  };

  let franqueadaId = body.franqueadaId;

  if (!isServico) {
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

  // Resolve anúncio a partir do leadRef/fbclid pra atribuição correta
  const anuncioId = body.anuncioId ?? extrairAnuncioId(body.leadRef);

  const eventId = `lead_${randomUUID()}`;

  const { data: registrada } = await admin
    .from("conversoes_registradas")
    .insert({
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
      tipo: "Lead",
      event_id: eventId,
      event_time: new Date().toISOString(),
      fbclid: body.fbclid ?? null,
      fbp: body.fbp ?? null,
      origem: servico?.origem ?? "admin_manual",
      payload_origem: body as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  const capi = await enviarEventoCAPIComRetry({
    event_name: "Lead",
    event_id: eventId,
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
      content_name: "Lead qualificado via WhatsApp IA",
      content_category: "health_consultation",
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
        capi_tentativas: capi.tentativas,
      })
      .eq("id", (registrada as { id: string }).id);
  }

  return NextResponse.json({ ok: true, eventId, capi: capi.ok, anuncioId });
}
