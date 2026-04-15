"use server";

import { createClient, createAlineClient } from "@/lib/supabase/server";
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

export async function adicionarVideoBiblioteca(params: {
  perfilId: string;
  titulo: string;
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
