import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { agendarPost } from "@/lib/publer/client";

/**
 * POST /api/publer/agendar
 * Agenda um post já aprovado via Publer (usado quando não tem token Instagram direto).
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { postId } = await req.json() as { postId: string };
  if (!postId) return NextResponse.json({ erro: "postId obrigatório" }, { status: 400 });

  // Busca post + franqueada
  const { data: postData } = await supabase
    .from("posts_agendados")
    .select("*, franqueadas(publer_profile_id, instagram_handle)")
    .eq("id", postId)
    .maybeSingle();

  if (!postData) return NextResponse.json({ erro: "Post não encontrado" }, { status: 404 });
  const post = postData as Record<string, unknown>;
  const fData = post.franqueadas as Record<string, unknown> | null;

  const publerAccountId = fData?.publer_profile_id as string | null;
  if (!publerAccountId) {
    return NextResponse.json(
      { erro: "Instagram não conectado ao Publer. Complete o passo de conexão." },
      { status: 422 },
    );
  }

  // Monta caption
  const partes: string[] = [];
  if (post.copy_legenda) partes.push(post.copy_legenda as string);
  if (post.copy_cta) partes.push("\n" + (post.copy_cta as string));
  const hashtags = post.hashtags as string[] | undefined;
  if (hashtags?.length) partes.push("\n\n" + hashtags.map((h) => `#${h}`).join(" "));
  const caption = partes.join("\n").slice(0, 2200);

  // Determina tipo e mídias
  const tipo = post.tipo_post as string;
  let publerTipo: "photo" | "video" | "reel" | "carousel" | "story" = "photo";
  const mediaUrls: string[] = [];

  if (tipo === "feed_imagem" || tipo === "stories") {
    publerTipo = tipo === "stories" ? "story" : "photo";
    const url = (post.url_imagem_final ?? post.imagem_upload_url) as string | null;
    if (url) mediaUrls.push(url);
  } else if (tipo === "reels") {
    publerTipo = "reel";
    const url = (post.url_video_final ?? post.video_upload_url) as string | null;
    if (url) mediaUrls.push(url);
  } else if (tipo === "feed_carrossel") {
    publerTipo = "carousel";
    const { data: midias } = await supabase
      .from("post_midias")
      .select("url")
      .eq("post_id", postId)
      .order("ordem", { ascending: true });
    for (const m of midias ?? []) mediaUrls.push((m as { url: string }).url);
  }

  if (!mediaUrls.length) {
    return NextResponse.json({ erro: "Post sem mídia anexada" }, { status: 422 });
  }

  try {
    const resultado = await agendarPost({
      publerAccountId,
      caption,
      dataHora: post.data_hora_agendada as string,
      tipo: publerTipo,
      mediaUrls,
    });

    await supabase
      .from("posts_agendados")
      .update({ status: "agendado_publer", publer_post_id: resultado.postId })
      .eq("id", postId);

    return NextResponse.json({ ok: true, publerPostId: resultado.postId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
