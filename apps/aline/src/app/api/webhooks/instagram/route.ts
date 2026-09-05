import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { processarWebhook } from "@/lib/automacao/processar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Webhook do Instagram (comentários, DMs, stories).
 *
 * URL pra colar no painel da Meta (produto Instagram → Configurar webhooks):
 *   https://studio.scannerdasaude.com/api/webhooks/instagram
 * Verificar token: o valor de INSTAGRAM_WEBHOOK_VERIFY_TOKEN.
 *
 * GET  = verificação da Meta (hub.challenge).
 * POST = eventos; assinatura X-Hub-Signature-256 conferida com o app secret
 *        (aceita o do produto Instagram OU o do app da Meta — os dois logins
 *        passam por aqui).
 *
 * ⚠️ A Meta só entrega webhook com o app PUBLICADO (status "ao vivo").
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const esperado = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  if (!esperado) return NextResponse.json({ erro: "INSTAGRAM_WEBHOOK_VERIFY_TOKEN não configurado" }, { status: 500 });
  if (mode === "subscribe" && token === esperado && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ erro: "verificação inválida" }, { status: 403 });
}

export async function POST(request: Request) {
  const corpo = await request.text();
  const assinatura = request.headers.get("x-hub-signature-256") ?? "";
  if (!assinaturaValida(corpo, assinatura)) {
    console.warn("[webhook/instagram] assinatura inválida");
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "json inválido" }, { status: 400 });
  }

  try {
    const resumo = await processarWebhook(payload);
    console.log("[webhook/instagram]", JSON.stringify(resumo));
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    // 200 mesmo assim: a Meta reenviaria o lote inteiro e a dedup já segurou
    // o que foi processado. O motivo fica no log.
    console.error("[webhook/instagram] erro:", (e as Error).message);
    return NextResponse.json({ ok: false, erro: (e as Error).message });
  }
}

function assinaturaValida(corpo: string, header: string): boolean {
  const segredos = [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET].filter(
    (s): s is string => !!s,
  );
  if (segredos.length === 0) {
    console.error("[webhook/instagram] nenhum app secret configurado");
    return false;
  }
  if (!header.startsWith("sha256=")) return false;
  const recebida = Buffer.from(header.slice(7), "hex");
  return segredos.some((s) => {
    const esperada = createHmac("sha256", s).update(corpo, "utf8").digest();
    return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
  });
}
