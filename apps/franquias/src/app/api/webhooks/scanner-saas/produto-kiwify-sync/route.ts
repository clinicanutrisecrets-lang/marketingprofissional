import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/webhooks/scanner-saas/produto-kiwify-sync
 *
 * Chamado pelo Scanner SaaS (scannerdasaude.com/admin) quando o time
 * interno (Aline) ativa o produto Kiwify de uma nutri na tela
 * "Gerenciar Exames de Precisão".
 *
 * Marketing guarda localmente em franqueadas.kiwify_product_id pra
 * resolver a nutri no webhook Kiwify sem hit cross-DB.
 *
 * Auth: HMAC SHA256 do body com SCANNER_WEBHOOK_SECRET (compartilhado).
 *
 * Body esperado:
 * {
 *   scanner_user_id: string,
 *   email: string,              // chave de matching com franqueadas
 *   kiwify_product_id: string | null,
 *   exame_precisao_ativo: boolean,
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
    email?: string;
    kiwify_product_id?: string | null;
    exame_precisao_ativo?: boolean;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ erro: "email obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve franqueada por email (source of truth)
  const { data: franq } = await admin
    .from("franqueadas")
    .select("id")
    .eq("email", body.email.toLowerCase().trim())
    .maybeSingle();

  if (!franq) {
    // Nutri ainda não finalizou onboarding no Marketing — guarda pra sync futura
    return NextResponse.json(
      {
        ok: false,
        motivo: "franqueada_nao_encontrada",
        email: body.email,
        nota: "Nutri ainda nao finalizou onboarding no Marketing. Reenvie este webhook quando ela completar.",
      },
      { status: 404 },
    );
  }

  const { error } = await admin
    .from("franqueadas")
    .update({
      kiwify_product_id: body.kiwify_product_id ?? null,
      scanner_saas_user_id: body.scanner_user_id ?? null,
      exame_precisao_ativo: body.exame_precisao_ativo ?? false,
      kiwify_product_synced_em: new Date().toISOString(),
    })
    .eq("id", (franq as { id: string }).id);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    franqueada_id: (franq as { id: string }).id,
    kiwify_product_id: body.kiwify_product_id,
    exame_precisao_ativo: body.exame_precisao_ativo,
  });
}
