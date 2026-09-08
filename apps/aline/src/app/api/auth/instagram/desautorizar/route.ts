import { NextResponse } from "next/server";
import { createAlineClient } from "@/lib/supabase/server";
import { lerSignedRequest } from "@/lib/instagram/signed-request";

export const dynamic = "force-dynamic";

/**
 * "URL de callback de cancelamento de autorização" do app da Meta.
 * A Meta chama quando a conta remove o app: apagamos o token do perfil.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const sr = form?.get("signed_request");
  const payload = typeof sr === "string" ? lerSignedRequest(sr) : null;
  if (!payload) return NextResponse.json({ erro: "signed_request inválido" }, { status: 400 });

  const userId = String(payload.user_id ?? "");
  if (userId) {
    const aline = createAlineClient();
    await aline
      .from("perfis")
      .update({ instagram_access_token: null, instagram_token_expiry: null, webhook_assinado_em: null })
      .or(`instagram_user_id.eq.${userId},instagram_conta_id.eq.${userId}`);
    console.log("[instagram/desautorizar] token removido para", userId);
  }
  return NextResponse.json({ ok: true });
}
