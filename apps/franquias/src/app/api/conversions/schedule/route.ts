import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enviarEventoCAPIComRetry } from "@/lib/ads/capi";
import { identificarServico, extrairAnuncioId } from "@/lib/conversions/servico-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/conversions/schedule
 *
 * Endpoint chamado pela Sofia (ou pelo painel da secretária/nutri)
 * quando uma consulta é CONFIRMADA — dispara evento Schedule pro Meta
 * com valor = valor_consulta_inicial da nutri (default R$ 650).
 *
 * Body:
 * {
 *   franqueadaId: string,       // nutri responsável
 *   leadRef: string,             // [ref:frq_XXX...] capturado do link wa.me
 *   paciente: {
 *     email?: string,
 *     phone?: string,
 *     nome?: string,
 *   },
 *   fbclid?: string,             // se a Sofia conseguiu capturar
 *   anuncioId?: string,          // se já identificado na jornada
 *   valor?: number,              // default valor_consulta_inicial
 *   dataConsulta?: string,       // ISO
 * }
 *
 * Auth: pode ser chamado por:
 *   a) IA do WhatsApp via service token (header x-ia-token = WHATSAPP_IA_TOKEN);
 *      x-sofia-token ainda aceito (legado)
 *   b) Admin logado
 *   c) Franqueada logada (pra marcar próprios agendamentos)
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    franqueadaId?: string;
    leadRef?: string;
    paciente?: { email?: string; phone?: string; nome?: string };
    fbclid?: string;
    anuncioId?: string;
    valor?: number;
    dataConsulta?: string;
  };

  // Autenticação — serviço (IA WhatsApp/Sofia legado), admin ou franqueada
  const servico = identificarServico(
    req.headers.get("x-ia-token"),
    req.headers.get("x-sofia-token"),
    process.env.WHATSAPP_IA_TOKEN,
    process.env.SOFIA_INTERNAL_TOKEN,
  );
  const isServico = !!servico;

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

  const { data: f } = await admin
    .from("franqueadas")
    .select("valor_consulta_inicial")
    .eq("id", franqueadaId)
    .maybeSingle();

  const valor =
    body.valor ??
    ((f as { valor_consulta_inicial?: number } | null)?.valor_consulta_inicial ?? 650);

  // Resolve anúncio a partir do leadRef (formato: frq_<id>_ad_<anuncioId>)
  let anuncioId = body.anuncioId ?? extrairAnuncioId(body.leadRef);
  if (!anuncioId && body.fbclid) {
    const { data: anterior } = await admin
      .from("conversoes_registradas")
      .select("anuncio_id")
      .eq("fbclid", body.fbclid)
      .not("anuncio_id", "is", null)
      .order("event_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anterior) anuncioId = (anterior as { anuncio_id: string }).anuncio_id;
  }

  const eventId = `schedule_${randomUUID()}`;

  const { data: registrada } = await admin
    .from("conversoes_registradas")
    .insert({
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
      tipo: "Schedule",
      event_id: eventId,
      event_time: new Date().toISOString(),
      value: valor,
      currency: "BRL",
      fbclid: body.fbclid ?? null,
      origem: servico?.origem ?? "admin_manual",
      payload_origem: body as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  const capi = await enviarEventoCAPIComRetry({
    event_name: "Schedule",
    event_id: eventId,
    value: valor,
    currency: "BRL",
    action_source: isServico ? "chat" : "system_generated",
    user_data: {
      email: body.paciente?.email,
      phone: body.paciente?.phone,
      fbclid: body.fbclid,
      external_id: body.paciente?.email ?? body.paciente?.phone,
    },
    custom_data: {
      content_name: "Consulta nutricional",
      content_category: "health_consultation",
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
      data_consulta: body.dataConsulta,
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
