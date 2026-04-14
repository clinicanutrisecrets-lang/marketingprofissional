"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import {
  criarContainerImagem,
  criarContainerReels,
  criarContainerStories,
  criarContainerCarrossel,
  publicarContainer,
  aguardarContainerPronto,
} from "./publish";

/**
 * Publica um post agendado no Instagram da nutri.
 * Retorna o instagram_post_id ou erro.
 */
export async function publicarPost(
  postId: string,
): Promise<{ ok: boolean; instagramPostId?: string; erro?: string }> {
  const admin = createAdminClient();

  const { data: postData } = await admin
    .from("posts_agendados")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (!postData) return { ok: false, erro: "Post não encontrado" };
  const post = postData as Record<string, unknown>;

  if (post.status !== "aprovado") {
    return { ok: false, erro: `Status inválido: ${post.status}` };
  }

  const { data: fData } = await admin
    .from("franqueadas")
    .select("id, instagram_conta_id, instagram_access_token, instagram_token_expiry")
    .eq("id", post.franqueada_id)
    .maybeSingle();

  if (!fData) return { ok: false, erro: "Franqueada não encontrada" };
  const f = fData as Record<string, unknown>;

  if (!f.instagram_conta_id || !f.instagram_access_token) {
    return { ok: false, erro: "Instagram não conectado" };
  }

  // Verifica expiração
  const expiry = f.instagram_token_expiry
    ? new Date(f.instagram_token_expiry as string).getTime()
    : null;
  if (expiry && expiry < Date.now()) {
    return { ok: false, erro: "Token Instagram expirado — precisa reconectar" };
  }

  let pageToken: string;
  try {
    pageToken = decrypt(f.instagram_access_token as string);
  } catch (e) {
    return { ok: false, erro: `Falha ao decriptar token: ${(e as Error).message}` };
  }

  const igUserId = f.instagram_conta_id as string;
  const caption = montarCaption(post);
  const tipo = post.tipo_post as string;

  try {
    let containerId: string;

    if (tipo === "feed_imagem") {
      const imgUrl = (post.url_imagem_final as string) ?? (post.imagem_upload_url as string);
      if (!imgUrl) throw new Error("Post sem URL de imagem");
      const c = await criarContainerImagem({
        igUserId,
        pageToken,
        imageUrl: imgUrl,
        caption,
      });
      containerId = c.id;
    } else if (tipo === "reels") {
      const videoUrl = (post.url_video_final as string) ?? (post.video_upload_url as string);
      if (!videoUrl) throw new Error("Reels sem URL de vídeo");
      const c = await criarContainerReels({
        igUserId,
        pageToken,
        videoUrl,
        caption,
        coverUrl: (post.url_imagem_final as string) ?? undefined,
      });
      containerId = c.id;
      await aguardarContainerPronto({ creationId: c.id, pageToken });
    } else if (tipo === "stories") {
      const imgUrl = (post.url_imagem_final as string) ?? (post.imagem_upload_url as string);
      const videoUrl = (post.url_video_final as string) ?? (post.video_upload_url as string);
      const c = await criarContainerStories({
        igUserId,
        pageToken,
        imageUrl: imgUrl,
        videoUrl,
      });
      containerId = c.id;
      if (videoUrl) await aguardarContainerPronto({ creationId: c.id, pageToken });
    } else if (tipo === "feed_carrossel") {
      // Busca mídias do carrossel
      const { data: midias } = await admin
        .from("post_midias")
        .select("url, tipo")
        .eq("post_id", postId)
        .order("ordem", { ascending: true });
      const urls = ((midias ?? []) as Array<{ url: string }>).map((m) => m.url);
      if (urls.length < 2) throw new Error("Carrossel precisa de 2+ mídias");
      const c = await criarContainerCarrossel({
        igUserId,
        pageToken,
        imageUrls: urls,
        caption,
      });
      containerId = c.id;
    } else {
      return { ok: false, erro: `Tipo não suportado: ${tipo}` };
    }

    const published = await publicarContainer({
      igUserId,
      pageToken,
      creationId: containerId,
    });

    // Atualiza post com ID do Instagram
    await admin
      .from("posts_agendados")
      .update({
        status: "postado",
        instagram_post_id: published.id,
        data_hora_postado: new Date().toISOString(),
      })
      .eq("id", postId);

    return { ok: true, instagramPostId: published.id };
  } catch (e) {
    const msg = (e as Error).message;
    await admin
      .from("posts_agendados")
      .update({ status: "erro" })
      .eq("id", postId);
    return { ok: false, erro: msg };
  }
}

function montarCaption(post: Record<string, unknown>): string {
  const partes: string[] = [];
  if (post.copy_legenda) partes.push(post.copy_legenda as string);
  if (post.copy_cta) partes.push("\n" + (post.copy_cta as string));
  const hashtags = post.hashtags as string[] | undefined;
  if (hashtags && hashtags.length > 0) {
    partes.push("\n\n" + hashtags.map((h) => `#${h}`).join(" "));
  }
  return partes.join("\n").slice(0, 2200); // limite do Instagram
}
