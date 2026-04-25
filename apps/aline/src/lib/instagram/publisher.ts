"use server";

import { createAlineClient, createPublicAdminClient } from "@/lib/supabase/server";
import {
  criarContainerImagem,
  criarContainerReels,
  criarContainerStories,
  criarContainerCarrossel,
  publicarContainer,
  aguardarContainerPronto,
} from "./publish";

type PerfilPublicacao = {
  id: string;
  slug: string;
  nome: string;
  instagram_handle: string;
  instagram_conta_id: string | null;
  access_token: string | null;
  token_expiry: string | null;
};

/**
 * Publica um post do Studio Aline no Instagram.
 * - Le post em aline.posts (status='aprovado' ou 'agendado').
 * - Le midias de aline.post_midias.
 * - Pega credenciais via RPC aline.get_perfil_publicacao (decrypta token).
 * - Atualiza status pra 'postado' ou 'erro'.
 */
export async function publicarPost(
  postId: string,
): Promise<{ ok: boolean; instagramPostId?: string; erro?: string }> {
  const aline = createAlineClient();

  const { data: postData } = await aline
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (!postData) return { ok: false, erro: "Post nao encontrado" };
  const post = postData as Record<string, unknown>;

  if (post.status !== "aprovado" && post.status !== "agendado") {
    return { ok: false, erro: `Status invalido: ${post.status}` };
  }

  // Pega perfil + token decryptado via RPC
  const adminPublic = createPublicAdminClient();
  const { data: perfilRows } = await adminPublic.rpc("get_perfil_publicacao", {
    p_slug: await getPerfilSlug(post.perfil_id as string),
  });
  const perfil = (perfilRows as PerfilPublicacao[] | null)?.[0];

  if (!perfil) return { ok: false, erro: "Perfil nao encontrado" };
  if (!perfil.instagram_conta_id || !perfil.access_token) {
    return { ok: false, erro: "Instagram nao conectado" };
  }

  if (perfil.token_expiry && new Date(perfil.token_expiry).getTime() < Date.now()) {
    return { ok: false, erro: "Token Instagram expirado — reconectar" };
  }

  const igUserId = perfil.instagram_conta_id;
  const pageToken = perfil.access_token;
  const tipo = post.tipo as string;
  const caption = montarCaption(post);

  // Busca midias ordenadas
  const { data: midiasData } = await aline
    .from("post_midias")
    .select("url, tipo, ordem")
    .eq("post_id", postId)
    .order("ordem", { ascending: true });

  const midias = (midiasData ?? []) as Array<{ url: string; tipo: string; ordem: number }>;

  try {
    let containerId: string;

    if (tipo === "feed_imagem") {
      const img = midias.find((m) => m.tipo === "imagem");
      if (!img) throw new Error("feed_imagem precisa de 1 midia tipo imagem");
      const c = await criarContainerImagem({
        igUserId,
        pageToken,
        imageUrl: img.url,
        caption,
      });
      containerId = c.id;
    } else if (tipo === "reels") {
      const video = midias.find((m) => m.tipo === "video");
      if (!video) throw new Error("reels precisa de 1 midia tipo video");
      const cover = midias.find((m) => m.tipo === "imagem")?.url;
      const c = await criarContainerReels({
        igUserId,
        pageToken,
        videoUrl: video.url,
        caption,
        coverUrl: cover,
      });
      containerId = c.id;
      await aguardarContainerPronto({ creationId: c.id, pageToken });
    } else if (tipo === "stories") {
      const img = midias.find((m) => m.tipo === "imagem")?.url;
      const video = midias.find((m) => m.tipo === "video")?.url;
      if (!img && !video) throw new Error("stories precisa de imagem ou video");
      const c = await criarContainerStories({
        igUserId,
        pageToken,
        imageUrl: img,
        videoUrl: video,
      });
      containerId = c.id;
      if (video) await aguardarContainerPronto({ creationId: c.id, pageToken });
    } else if (tipo === "feed_carrossel") {
      const urls = midias.filter((m) => m.tipo === "imagem").map((m) => m.url);
      if (urls.length < 2) throw new Error("feed_carrossel precisa de 2+ imagens");
      const c = await criarContainerCarrossel({
        igUserId,
        pageToken,
        imageUrls: urls,
        caption,
      });
      containerId = c.id;
    } else {
      return { ok: false, erro: `Tipo nao suportado: ${tipo}` };
    }

    const published = await publicarContainer({
      igUserId,
      pageToken,
      creationId: containerId,
    });

    await aline
      .from("posts")
      .update({
        status: "postado",
        instagram_post_id: published.id,
        data_hora_postada: new Date().toISOString(),
      })
      .eq("id", postId);

    return { ok: true, instagramPostId: published.id };
  } catch (e) {
    const msg = (e as Error).message;
    await aline.from("posts").update({ status: "erro" }).eq("id", postId);
    return { ok: false, erro: msg };
  }
}

async function getPerfilSlug(perfilId: string): Promise<string> {
  const aline = createAlineClient();
  const { data } = await aline
    .from("perfis")
    .select("slug")
    .eq("id", perfilId)
    .maybeSingle();
  const row = data as { slug?: string } | null;
  if (!row?.slug) throw new Error(`Perfil ${perfilId} sem slug`);
  return row.slug;
}

function montarCaption(post: Record<string, unknown>): string {
  const partes: string[] = [];
  if (post.copy_legenda) partes.push(post.copy_legenda as string);
  if (post.copy_cta) partes.push("\n" + (post.copy_cta as string));
  const hashtags = post.hashtags as string[] | undefined;
  if (hashtags && hashtags.length > 0) {
    partes.push("\n\n" + hashtags.map((h) => `#${h}`).join(" "));
  }
  return partes.join("\n").slice(0, 2200);
}
