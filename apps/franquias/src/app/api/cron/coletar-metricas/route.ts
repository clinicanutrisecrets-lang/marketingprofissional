import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import { getPostInsights } from "@/lib/instagram/publish";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: Toda sexta 18:00, coleta insights de posts publicados nos últimos 7 dias.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await admin
    .from("posts_agendados")
    .select(
      "id, tipo_post, instagram_post_id, franqueada_id, data_hora_postado",
    )
    .eq("status", "postado")
    .not("instagram_post_id", "is", null)
    .gte("data_hora_postado", seteDiasAtras);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, atualizados: 0 });
  }

  const tokensPorFranqueada = new Map<string, string>();
  let atualizados = 0;
  const erros: string[] = [];

  for (const p of posts) {
    const post = p as {
      id: string;
      tipo_post: string;
      instagram_post_id: string;
      franqueada_id: string;
    };

    // Busca token da franqueada (cache local pra economizar)
    let pageToken = tokensPorFranqueada.get(post.franqueada_id);
    if (!pageToken) {
      const { data: f } = await admin
        .from("franqueadas")
        .select("instagram_access_token")
        .eq("id", post.franqueada_id)
        .maybeSingle();
      const enc = (f as { instagram_access_token?: string } | null)?.instagram_access_token;
      if (!enc) continue;
      try {
        pageToken = decrypt(enc);
        tokensPorFranqueada.set(post.franqueada_id, pageToken);
      } catch {
        continue;
      }
    }

    try {
      const insights = await getPostInsights({
        mediaId: post.instagram_post_id,
        pageToken,
        tipo: post.tipo_post as "feed_imagem" | "feed_carrossel" | "reels" | "stories",
      });

      await admin
        .from("posts_agendados")
        .update({
          alcance: insights.reach,
          impressoes: insights.impressions,
          curtidas: insights.likes,
          comentarios: insights.comments,
          salvamentos: insights.saves,
          compartilhamentos: insights.shares,
          plays_video: insights.video_views,
          engajamento: insights.total_interactions,
          metricas_atualizadas_em: new Date().toISOString(),
        })
        .eq("id", post.id);

      atualizados += 1;
    } catch (e) {
      erros.push(`${post.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    total: posts.length,
    atualizados,
    erros: erros.length,
  });
}
