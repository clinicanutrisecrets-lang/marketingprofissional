import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAlineClient } from "@/lib/supabase/server";
import { lerSignedRequest } from "@/lib/instagram/signed-request";

export const dynamic = "force-dynamic";

/**
 * "URL de solicitação de exclusão de dados" do app da Meta.
 * A Meta manda o user_id (Instagram-scoped) de quem pediu exclusão; apagamos
 * contato, mensagens e fila dessa pessoa e devolvemos o código de confirmação
 * no formato que a Meta exige.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const sr = form?.get("signed_request");
  const payload = typeof sr === "string" ? lerSignedRequest(sr) : null;
  if (!payload) return NextResponse.json({ erro: "signed_request inválido" }, { status: 400 });

  const userId = String(payload.user_id ?? "");
  const codigo = randomUUID();
  if (userId) {
    const aline = createAlineClient();
    // ig_mensagens e ig_fila caem em cascata (FK ON DELETE CASCADE / SET NULL).
    const { data: contatos } = await aline.from("ig_contatos").select("id").eq("igsid", userId);
    for (const c of (contatos ?? []) as Array<{ id: string }>) {
      await aline.from("ig_mensagens").delete().eq("contato_id", c.id);
      await aline.from("ig_fila").delete().eq("contato_id", c.id);
    }
    await aline.from("ig_contatos").delete().eq("igsid", userId);
    // Se for a própria conta conectada, some o token também.
    await aline
      .from("perfis")
      .update({ instagram_access_token: null, instagram_token_expiry: null, webhook_assinado_em: null })
      .or(`instagram_user_id.eq.${userId},instagram_conta_id.eq.${userId}`);
    console.log("[instagram/excluir-dados] dados removidos para", userId, "código", codigo);
  }

  const base = new URL(request.url).origin;
  return NextResponse.json({
    url: `${base}/api/auth/instagram/excluir-dados?codigo=${codigo}`,
    confirmation_code: codigo,
  });
}

/** Página de status que a Meta mostra pro usuário com o código. */
export async function GET(request: Request) {
  const codigo = new URL(request.url).searchParams.get("codigo") ?? "";
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Exclusão de dados</title>
<body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto">
<h1>Exclusão de dados</h1>
<p>Sua solicitação foi processada. Os dados de interação com este perfil foram removidos.</p>
${codigo ? `<p>Código de confirmação: <code>${codigo.replace(/[^a-zA-Z0-9-]/g, "")}</code></p>` : ""}
</body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
