import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { publicarPost } from "@/lib/instagram/publisher";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: A cada 15 min, publica posts aprovados cujo data_hora_agendada já chegou.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date().toISOString();

  const { data: posts } = await admin
    .from("posts_agendados")
    .select("id, franqueada_id, tipo_post, data_hora_agendada")
    .eq("status", "aprovado")
    .lte("data_hora_agendada", agora)
    .limit(20); // segurança: no máx 20 por tick

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, publicados: 0 });
  }

  // FIX 1: Bulk-update to "publicando" BEFORE processing to prevent duplicate cron runs
  const postIds = posts.map((p) => (p as { id: string }).id);
  await admin
    .from("posts_agendados")
    .update({ status: "publicando" })
    .in("id", postIds);

  const resultados: Array<{ postId: string; ok: boolean; erro?: string; instagramPostId?: string }> = [];

  for (const p of posts) {
    const post = p as { id: string };
    const r = await publicarPost(post.id);
    // FIX 3: Always update to "erro" on failure (not just thrown exceptions)
    if (!r.ok) {
      await admin
        .from("posts_agendados")
        .update({ status: "erro", erro_mensagem: r.erro ?? "Falha desconhecida" })
        .eq("id", post.id);
    }
    resultados.push({
      postId: post.id,
      ok: r.ok,
      erro: r.erro,
      instagramPostId: r.instagramPostId,
    });
  }

  const sucesso = resultados.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    total: posts.length,
    publicados: sucesso,
    falhas: posts.length - sucesso,
    detalhes: resultados,
  });
}
