import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/onboarding/iniciar
 *
 * Chamado pelo Scanner SaaS quando uma nutri clica "Virar franqueada"
 * no painel dela (após ter plano Premium). SaaS:
 *  1. Gera token UUID único
 *  2. Atualiza plano dela pra 'franquia' lá
 *  3. Chama este endpoint
 *  4. Envia link app.scannerdasaude.com/onboarding/{token} pra nutri
 *
 * Marketing grava em franquia_onboardings, dispara email de boas-vindas
 * com o link (o link /onboarding/[token] deve validar o token antes de
 * liberar o wizard).
 *
 * Auth: HMAC SHA256 do body com SCANNER_WEBHOOK_SECRET.
 *
 * Body:
 * {
 *   scanner_user_id: string,
 *   onboarding_token: string (UUID),
 *   nome: string,
 *   email: string,
 *   whatsapp?: string,
 *   plano_anterior?: string,
 * }
 */
export async function POST(req: Request) {
  const secret = process.env.SCANNER_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "SCANNER_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-scanner-signature") ?? req.headers.get("x-signature");
  if (!signature) return NextResponse.json({ erro: "Assinatura ausente" }, { status: 401 });

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature !== expected && signature !== `sha256=${expected}`) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let body: {
    scanner_user_id?: string;
    onboarding_token?: string;
    nome?: string;
    email?: string;
    whatsapp?: string;
    plano_anterior?: string;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (!body.scanner_user_id || !body.onboarding_token || !body.nome || !body.email) {
    return NextResponse.json(
      { erro: "scanner_user_id, onboarding_token, nome e email obrigatórios" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Dedup — se já existe onboarding com esse scanner_user_id, atualiza token
  const { data: existente } = await admin
    .from("franquia_onboardings")
    .select("id, status")
    .eq("scanner_user_id", body.scanner_user_id)
    .maybeSingle();

  let registroId: string;

  if (existente) {
    const ex = existente as { id: string; status: string };
    await admin
      .from("franquia_onboardings")
      .update({
        onboarding_token: body.onboarding_token,
        nome: body.nome,
        email: body.email.toLowerCase().trim(),
        whatsapp: body.whatsapp ?? null,
        plano_anterior: body.plano_anterior ?? null,
        status: "token_gerado",
        origem_payload: body as unknown as Record<string, unknown>,
      })
      .eq("id", ex.id);
    registroId = ex.id;
  } else {
    const { data: novo, error } = await admin
      .from("franquia_onboardings")
      .insert({
        scanner_user_id: body.scanner_user_id,
        onboarding_token: body.onboarding_token,
        nome: body.nome,
        email: body.email.toLowerCase().trim(),
        whatsapp: body.whatsapp ?? null,
        plano_anterior: body.plano_anterior ?? null,
        origem_payload: body as unknown as Record<string, unknown>,
        status: "token_gerado",
      })
      .select("id")
      .single();
    if (error || !novo) {
      return NextResponse.json({ erro: error?.message ?? "insert falhou" }, { status: 500 });
    }
    registroId = (novo as { id: string }).id;
  }

  // TODO quando email queue estiver pronta: enviar pra fila ao invés de tentar direto
  // Por enquanto apenas registra — email manual ou cron simples envia depois
  const publicUrl =
    process.env.NEXT_PUBLIC_APP_URL_FRANQUIAS ?? "https://app.scannerdasaude.com";
  const linkOnboarding = `${publicUrl}/onboarding?token=${body.onboarding_token}`;

  return NextResponse.json({
    ok: true,
    franquia_onboarding_id: registroId,
    link_onboarding: linkOnboarding,
    status: "token_gerado",
  });
}
