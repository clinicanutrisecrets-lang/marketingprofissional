"use server";

import { createClient, createAlineClient, createPublicAdminClient } from "@/lib/supabase/server";
import { buscarMelhorVideo } from "@/lib/pexels/client";
import { revalidatePath } from "next/cache";

async function assertSuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data: admin } = await supabase
    .from("admins")
    .select("papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const adminRow = admin as { papel?: string } | null;
  if (!adminRow || adminRow.papel !== "super_admin") {
    throw new Error("Sem permissão");
  }
  return user.id;
}

const BUCKET_VIDEOS = "videos-biblioteca";

/**
 * Upload de b-roll próprio do perfil. Até agora o Studio só deixava puxar do
 * Pexels; os clipes gerados por IA (Base44 e afins) não tinham onde entrar.
 */
export async function uploadVideoPerfil(
  fd: FormData,
): Promise<{ ok: boolean; url?: string; erro?: string }> {
  try {
    await assertSuperAdmin();
    const file = fd.get("file") as File | null;
    if (!file) return { ok: false, erro: "Arquivo ausente" };
    if (file.size > 50 * 1024 * 1024) return { ok: false, erro: "Arquivo muito grande (máx 50MB)" };

    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const nome = file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 40);
    const path = `aline/broll/${Date.now()}_${nome}.${ext}`;

    const storage = createPublicAdminClient().storage.from(BUCKET_VIDEOS);
    const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { ok: false, erro: error.message };

    // URL assinada de 1 ano (bucket é privado), mesmo padrão do SaaS
    const { data: signed } = await storage.createSignedUrl(path, 365 * 24 * 60 * 60);
    if (!signed?.signedUrl) return { ok: false, erro: "Falha ao assinar a URL" };
    return { ok: true, url: signed.signedUrl };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Acervo de b-roll compartilhado (public.acervo_videos) — os mesmos clipes
 * coringa que o Scanner Franquias enxerga. Só leitura aqui.
 */
export async function listarAcervoAline(limite = 60) {
  try {
    await assertSuperAdmin();
    const { data } = await createPublicAdminClient()
      .from("acervo_videos")
      .select("id, titulo, descricao, url, thumbnail_url, duracao_seg, tags, fonte")
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(limite);
    return (data ?? []) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

/**
 * Grava no acervo COMPARTILHADO (public.acervo_videos) em vez da biblioteca do
 * perfil. É a porta de entrada dos clipes coringa: sobe uma vez aqui e os dois
 * produtos passam a enxergar. Só super admin (o Studio inteiro já é).
 */
export async function adicionarAoAcervo(params: {
  titulo: string;
  descricao?: string;
  url: string;
  tags: string[];
  fonte?: "upload" | "pexels";
  pexels_video_id?: string;
  thumbnail_url?: string;
  duracao_seg?: number;
  categoria?: string;
}) {
  try {
    const userId = await assertSuperAdmin();
    const { data, error } = await createPublicAdminClient()
      .from("acervo_videos")
      .insert({
        titulo: params.titulo,
        descricao: params.descricao || null,
        categoria: params.categoria || null,
        url: params.url,
        tags: params.tags,
        fonte: params.fonte ?? "upload",
        pexels_video_id: params.pexels_video_id,
        thumbnail_url: params.thumbnail_url,
        duracao_seg: params.duracao_seg,
        criado_por: userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/perfis");
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function atualizarTagsVideoPerfil(videoId: string, tags: string[]) {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();
    await aline.from("videos_perfil").update({ tags }).eq("id", videoId);
    revalidatePath("/perfis");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function adicionarVideoBiblioteca(params: {
  perfilId: string;
  titulo: string;
  descricao?: string;
  url: string;
  tags: string[];
  fonte?: "upload" | "pexels";
  pexels_video_id?: string;
  thumbnail_url?: string;
  duracao_seg?: number;
}) {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();
    const { data, error } = await aline
      .from("videos_perfil")
      .insert({
        perfil_id: params.perfilId,
        titulo: params.titulo,
        descricao: params.descricao || null,
        url: params.url,
        tags: params.tags,
        fonte: params.fonte ?? "upload",
        pexels_video_id: params.pexels_video_id,
        thumbnail_url: params.thumbnail_url,
        duracao_seg: params.duracao_seg,
      })
      .select("id")
      .single();
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/perfis`);
    return { ok: true, id: (data as { id: string }).id };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function listarBibliotecaPerfil(perfilId: string) {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();
    const { data } = await aline
      .from("videos_perfil")
      .select("*")
      .eq("perfil_id", perfilId)
      .eq("ativo", true)
      .order("criado_em", { ascending: false });
    return (data ?? []) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

export async function removerVideoBiblioteca(videoId: string) {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();
    await aline.from("videos_perfil").update({ ativo: false }).eq("id", videoId);
    revalidatePath("/perfis");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function buscarPexelsAline(query: string) {
  try {
    await assertSuperAdmin();
    const r = await buscarMelhorVideo([query]);
    if (!r) return { ok: false, erro: "Sem resultados" };
    return { ok: true, video: r };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Lógica híbrida: biblioteca do perfil → Pexels.
 */
export async function escolherVideoParaPostAline(
  perfilId: string,
  keywords: string[],
) {
  const aline = createAlineClient();

  const { data: bib } = await aline
    .from("videos_perfil")
    .select("id, url, thumbnail_url, duracao_seg, tags, usado_quantas_vezes")
    .eq("perfil_id", perfilId)
    .eq("ativo", true)
    .overlaps("tags", keywords)
    .order("usado_quantas_vezes", { ascending: true })
    .limit(5);

  if (bib && bib.length > 0) {
    const ranked = (bib as Array<Record<string, unknown>>)
      .map((v) => ({
        v,
        matches: ((v.tags as string[]) ?? []).filter((t) =>
          keywords.some((k) => k.toLowerCase() === t.toLowerCase()),
        ).length,
      }))
      .sort((a, b) => b.matches - a.matches);
    const escolhido = ranked[0].v;
    await aline
      .from("videos_perfil")
      .update({ usado_quantas_vezes: ((escolhido.usado_quantas_vezes as number) ?? 0) + 1 })
      .eq("id", escolhido.id);
    return {
      fonte: "biblioteca" as const,
      url: escolhido.url as string,
      thumbnail: escolhido.thumbnail_url as string,
      duracao: escolhido.duracao_seg as number,
    };
  }

  if (process.env.PEXELS_API_KEY) {
    try {
      const p = await buscarMelhorVideo(keywords);
      if (p) {
        return { fonte: "pexels" as const, url: p.url, thumbnail: p.thumbnail, duracao: p.duracao };
      }
    } catch {}
  }

  return { fonte: "nenhum" as const, url: null };
}
