import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarEventoCAPIComRetry } from "@/lib/ads/capi";
import {
  assinaturaValida,
  parsePayloadVenda,
  resolverEventId,
  ehReversao,
} from "@/lib/webhooks/venda";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Webhook de venda da PLATAFORMA PRÓPRIA (checkout Asaas).
 * Substitui o antigo /api/webhooks/kiwify. Ver docs/HANDOFF-PLATAFORMA-PROPRIA.md.
 *
 * Auth: header X-Plataforma-Signature = HMAC-SHA256(rawBody, PLATAFORMA_WEBHOOK_SECRET).
 *
 * Fluxo:
 *  1. Valida assinatura (timing-safe)
 *  2. Valida payload (franqueada_id + ref já vêm no corpo)
 *  3. Dedup por event_id
 *  4. venda_aprovada → registra Purchase + CAPI (com retry)
 *     venda_estornada/chargeback → registra reversão + ajusta contador
 */
export async function POST(req: Request) {
  const secret = process.env.PLATAFORMA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { erro: "PLATAFORMA_WEBHOOK_SECRET não configurado" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-plataforma-signature");
  if (!assinaturaValida(rawBody, signature, secret)) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const parsed = parsePayloadVenda(json);
  if (!parsed.ok) {
    return NextResponse.json({ erro: parsed.erro }, { status: 400 });
  }
  const venda = parsed.payload;
  const admin = createAdminClient();

  const reversao = ehReversao(venda.evento);
  // event_id distinto pra reversão não colidir com o Purchase original
  const eventId = reversao ? `${resolverEventId(venda)}_estorno` : resolverEventId(venda);
  const eventTime = venda.event_time ? new Date(venda.event_time) : new Date();
  const valorAssinado = reversao ? -Math.abs(venda.valor) : Math.abs(venda.valor);

  // Dedup
  const { data: existente } = await admin
    .from("conversoes_registradas")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ ok: true, duplicado: true, eventId });
  }

  // Resolve anúncio: usa o do payload; senão tenta casar por fbclid (mesma jornada)
  let anuncioId = venda.anuncio_id ?? null;
  if (!anuncioId && venda.fbclid) {
    const { data: anterior } = await admin
      .from("conversoes_registradas")
      .select("anuncio_id")
      .eq("fbclid", venda.fbclid)
      .not("anuncio_id", "is", null)
      .order("event_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (anterior) anuncioId = (anterior as { anuncio_id: string }).anuncio_id;
  }

  // Registra conversão (Purchase ou Refund)
  const { data: registrada } = await admin
    .from("conversoes_registradas")
    .insert({
      franqueada_id: venda.franqueada_id,
      anuncio_id: anuncioId,
      tipo: reversao ? "Refund" : "Purchase",
      event_id: eventId,
      event_time: eventTime.toISOString(),
      value: valorAssinado,
      currency: venda.currency ?? "BRL",
      fbclid: venda.fbclid,
      fbp: venda.fbp,
      origem: "plataforma_propria",
      payload_origem: json as Record<string, unknown>,
    })
    .select("id")
    .single();

  // CAPI só pra venda aprovada (Purchase). Reversões só ajustam métrica interna.
  let capiOk: boolean | null = null;
  if (!reversao) {
    const capi = await enviarEventoCAPIComRetry({
      event_name: "Purchase",
      event_id: eventId,
      event_time: Math.floor(eventTime.getTime() / 1000),
      value: venda.valor,
      currency: venda.currency ?? "BRL",
      action_source: "website",
      user_data: {
        email: venda.cliente?.email,
        phone: venda.cliente?.phone,
        fbclid: venda.fbclid ?? undefined,
        fbp: venda.fbp ?? undefined,
        external_id: venda.cliente?.email ?? venda.pedido_id,
      },
      custom_data: {
        order_id: venda.pedido_id,
        content_name: venda.produto ?? "Teste Nutrigenetico",
        content_category: "health_test",
        franqueada_id: venda.franqueada_id,
        anuncio_id: anuncioId,
      },
    });
    capiOk = capi.ok;

    if (registrada) {
      await admin
        .from("conversoes_registradas")
        .update({
          capi_enviado: capi.ok,
          capi_resposta: capi.ok
            ? { events_received: capi.events_received, fbtrace_id: capi.fbtrace_id }
            : null,
          capi_erro: capi.ok ? null : capi.erro,
          capi_tentativas: capi.tentativas,
        })
        .eq("id", (registrada as { id: string }).id);
    }
  }

  // Ajusta contador/valor no anúncio (incrementa na venda, decrementa na reversão)
  if (anuncioId) {
    await admin
      .rpc("incrementar_purchases_anuncio", {
        p_anuncio_id: anuncioId,
        p_valor: valorAssinado,
      })
      .then(
        () => {},
        () => {}, // RPC opcional — não falha o webhook se não existir
      );
  }

  return NextResponse.json({
    ok: true,
    eventId,
    tipo: reversao ? "Refund" : "Purchase",
    capi: capiOk,
    anuncioId,
  });
}
