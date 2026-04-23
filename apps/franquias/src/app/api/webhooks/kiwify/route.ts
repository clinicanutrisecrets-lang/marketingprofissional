import { NextResponse } from "next/server";
import { createHmac, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarEventoCAPI } from "@/lib/ads/capi";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Webhook Kiwify — recebe notificação de venda e dispara CAPI Purchase.
 *
 * Configuração no painel Kiwify:
 * - Destino: POST https://[seu-dominio]/api/webhooks/kiwify
 * - Header secret: x-kiwify-signature (HMAC-SHA256 do body)
 * - Events: pedido_aprovado, pedido_reembolsado, chargeback
 *
 * Env vars:
 * - KIWIFY_WEBHOOK_SECRET
 *
 * Fluxo:
 * 1. Valida assinatura HMAC
 * 2. Parseia payload
 * 3. Se pedido_aprovado: dispara Purchase pro Meta CAPI
 * 4. Salva em conversoes_registradas pra audit
 * 5. Atualiza contador de purchases no anuncio (via custom_fields.anuncio_id)
 */
export async function POST(req: Request) {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "KIWIFY_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-kiwify-signature") ?? req.headers.get("x-signature");

  if (!signature) {
    return NextResponse.json({ erro: "Assinatura ausente" }, { status: 401 });
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature !== expected && signature !== `sha256=${expected}`) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const evento = (payload.event || payload.webhook_event_type) as string | undefined;
  const dados = (payload.data || payload) as Record<string, unknown>;

  if (evento !== "pedido_aprovado" && evento !== "order_approved") {
    // outros eventos (reembolso, chargeback) logamos mas não enviamos Purchase
    return NextResponse.json({ ok: true, ignorado: true, evento });
  }

  const admin = createAdminClient();

  // Dados do pedido
  const orderId = (dados.order_id ?? dados.id) as string | undefined;
  const value = Number((dados.total ?? dados.amount ?? dados.Commissions?.product_base_price) as number ?? 0);
  const customerEmail = (dados.customer?.email ?? dados.Customer?.email ?? dados.email) as string | undefined;
  const customerPhone = (dados.customer?.phone ?? dados.Customer?.mobile) as string | undefined;
  const customFields = (dados.custom_fields ?? dados.Commissions?.tracking_parameters ?? {}) as Record<string, unknown>;

  const fbclid = (customFields.fbclid ?? customFields.fbc) as string | undefined;
  const franqueadaId = customFields.franqueada_id as string | undefined;
  const anuncioIdPassado = customFields.anuncio_id as string | undefined;

  // Dedup por orderId (event_id único)
  const eventId = `kiwify_${orderId ?? randomUUID()}`;

  const { data: existente } = await admin
    .from("conversoes_registradas")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ ok: true, duplicado: true });
  }

  // Resolve anúncio a partir do fbclid quando custom_fields não tem anuncio_id
  let anuncioId = anuncioIdPassado ?? null;
  if (!anuncioId && fbclid) {
    // Busca evento Lead ou Schedule anterior com mesmo fbclid (mesma jornada)
    const { data: lead } = await admin
      .from("conversoes_registradas")
      .select("anuncio_id, franqueada_id")
      .eq("fbclid", fbclid)
      .not("anuncio_id", "is", null)
      .order("event_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead) {
      anuncioId = (lead as { anuncio_id: string }).anuncio_id;
    }
  }

  // Registra conversão
  const { data: registrada } = await admin
    .from("conversoes_registradas")
    .insert({
      franqueada_id: franqueadaId ?? null,
      anuncio_id: anuncioId,
      tipo: "Purchase",
      event_id: eventId,
      event_time: new Date().toISOString(),
      value,
      currency: "BRL",
      fbclid,
      origem: "kiwify_webhook",
      payload_origem: payload,
    })
    .select("id")
    .single();

  // Dispara CAPI
  const capiResult = await enviarEventoCAPI({
    event_name: "Purchase",
    event_id: eventId,
    value,
    currency: "BRL",
    action_source: "website",
    user_data: {
      email: customerEmail,
      phone: customerPhone,
      fbclid,
      external_id: customerEmail ?? orderId,
    },
    custom_data: {
      order_id: orderId,
      content_name: "Teste Nutrigenetico",
      content_category: "health_test",
      franqueada_id: franqueadaId,
      anuncio_id: anuncioId,
    },
  });

  if (registrada) {
    await admin
      .from("conversoes_registradas")
      .update({
        capi_enviado: capiResult.ok,
        capi_resposta: capiResult.ok ? { events_received: capiResult.events_received, fbtrace_id: capiResult.fbtrace_id } : null,
        capi_erro: capiResult.ok ? null : capiResult.erro,
        capi_tentativas: 1,
      })
      .eq("id", (registrada as { id: string }).id);
  }

  // Atualiza contador no anúncio
  if (anuncioId) {
    await admin.rpc("incrementar_purchases_anuncio", {
      p_anuncio_id: anuncioId,
      p_valor: value,
    }).catch(() => {
      // Fallback se RPC não existir: update manual
    });
  }

  // Repassa venda pro Scanner SaaS (CRM interno + dashboard nutri)
  // Fire-and-forget: se SaaS estiver fora, não trava resposta pro Kiwify.
  const scannerUrl = process.env.SCANNER_SAAS_URL;
  const scannerSecret = process.env.SCANNER_WEBHOOK_SECRET;
  let saasSyncOk: boolean | null = null;

  if (scannerUrl && scannerSecret) {
    try {
      const saasBody = JSON.stringify({
        kiwify_product_id: (dados.product_id ?? (dados as Record<string, unknown>).Product_id) ?? null,
        kiwify_order_id: orderId,
        franqueada_id: franqueadaId,
        anuncio_id: anuncioId,
        valor: value,
        currency: "BRL",
        customer_email: customerEmail,
        customer_name: (dados.customer as { name?: string } | undefined)?.name,
        customer_phone: customerPhone,
        fbclid,
        event_time: new Date().toISOString(),
      });
      const saasSig = (await import("node:crypto"))
        .createHmac("sha256", scannerSecret)
        .update(saasBody)
        .digest("hex");
      const resp = await fetch(`${scannerUrl}/api/webhooks/venda-externa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Marketing-Signature": saasSig,
        },
        body: saasBody,
        signal: AbortSignal.timeout(8_000),
      });
      saasSyncOk = resp.ok;
    } catch {
      saasSyncOk = false;
    }
  }

  return NextResponse.json({
    ok: true,
    eventId,
    capi: capiResult.ok,
    saas_sync: saasSyncOk,
    anuncioId,
  });
}
