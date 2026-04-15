"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { buscarMelhorVideo } from "@/lib/pexels/client";
import { revalidatePath } from "next/cache";

async function getFranqueadaId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data ? (data as { id: string }).id : null;
}

export async function adicionarVideoBiblioteca(params: {
  titulo: string;
  url: string;
  tags: string[];
  fonte?: "upload" | "pexels";
  pexels_video_id?: string;
  thumbnail_url?: string;
  duracao_seg?: number;
  largura_px?: number;
  altura_px?: number;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("videos_franqueada")
    .insert({
      franqueada_id: franqueadaId,
      titulo: params.titulo,
      url: params.url,
      tags: params.tags,
      fonte: params.fonte ?? "upload",
      pexels_video_id: params.pexels_video_id,
      thumbnail_url: params.thumbnail_url,
      duracao_seg: params.duracao_seg,
      largura_px: params.largura_px,
      altura_px: params.altura_px,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/biblioteca-videos");
  return { ok: true, id: (data as { id: string }).id };
}

export async function listarBiblioteca() {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("videos_franqueada")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function removerVideoBiblioteca(videoId: string) {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { ok: false };
  const supabase = createClient();
  await supabase
    .from("videos_franqueada")
    .update({ ativo: false })
    .eq("id", videoId)
    .eq("franqueada_id", franqueadaId);
  revalidatePath("/dashboard/biblioteca-videos");
  return { ok: true };
}

export async function atualizarTagsVideo(videoId: string, tags: string[]) {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { ok: false };
  const supabase = createClient();
  await supabase
    .from("videos_franqueada")
    .update({ tags })
    .eq("id", videoId)
    .eq("franqueada_id", franqueadaId);
  revalidatePath("/dashboard/biblioteca-videos");
  return { ok: true };
}

/**
 * Busca vídeos no Pexels e retorna pra preview.
 */
export async function buscarPexels(query: string) {
  try {
    const r = await buscarMelhorVideo([query]);
    if (!r) return { ok: false, erro: "Sem resultados" };
    return { ok: true, video: r };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * LÓGICA HÍBRIDA: dada keywords, escolhe melhor vídeo:
 * 1. Procura na biblioteca da nutri (match por tags)
 * 2. Se não achar, vai pro Pexels
 *
 * Usado pelo gerador automático de reels.
 */
export async function escolherVideoParaPost(
  franqueadaId: string,
  keywords: string[],
): Promise<{
  fonte: "biblioteca" | "pexels" | "nenhum";
  url: string | null;
  thumbnail?: string;
  duracao?: number;
  videoId?: string;
}> {
  const admin = createAdminClient();

  // 1. Tenta biblioteca primeiro (usa GIN index pra match rápido)
  const { data: biblioteca } = await admin
    .from("videos_franqueada")
    .select("id, url, thumbnail_url, duracao_seg, tags, usado_quantas_vezes")
    .eq("franqueada_id", franqueadaId)
    .eq("ativo", true)
    .overlaps("tags", keywords)
    .order("usado_quantas_vezes", { ascending: true })
    .limit(5);

  if (biblioteca && biblioteca.length > 0) {
    // Score: quantas tags coincidem
    const ranked = (biblioteca as Array<Record<string, unknown>>)
      .map((v) => ({
        video: v,
        matches: ((v.tags as string[]) ?? []).filter((t) =>
          keywords.some((k) => k.toLowerCase() === t.toLowerCase()),
        ).length,
      }))
      .sort((a, b) => b.matches - a.matches);

    const escolhido = ranked[0].video;

    // Incrementa contador de uso
    await admin
      .from("videos_franqueada")
      .update({ usado_quantas_vezes: ((escolhido.usado_quantas_vezes as number) ?? 0) + 1 })
      .eq("id", escolhido.id);

    return {
      fonte: "biblioteca",
      url: escolhido.url as string,
      thumbnail: escolhido.thumbnail_url as string,
      duracao: escolhido.duracao_seg as number,
      videoId: escolhido.id as string,
    };
  }

  // 2. Fallback Pexels
  if (process.env.PEXELS_API_KEY) {
    try {
      const pexels = await buscarMelhorVideo(keywords, { duracaoMaxSeg: 30 });
      if (pexels) {
        return {
          fonte: "pexels",
          url: pexels.url,
          thumbnail: pexels.thumbnail,
          duracao: pexels.duracao,
        };
      }
    } catch (e) {
      console.warn("Pexels fallback falhou:", e);
    }
  }

  return { fonte: "nenhum", url: null };
}
