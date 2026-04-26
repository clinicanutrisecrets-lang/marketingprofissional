"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { gerarPackSemanal } from "./gerador-semanal";

async function assertAdmin(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nao autenticado");
  const { data } = await supabase
    .from("admins")
    .select("papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const a = data as { papel?: string } | null;
  if (!a || a.papel !== "super_admin") throw new Error("Apenas super_admin");
}

/**
 * Aprova em bloco todos os posts da semana_ref informada (do perfil dado).
 * Muda status pra 'aprovado' (publisher pega depois quando data_hora_agendada chegar).
 */
export async function aprovarBlocoSemanal(params: {
  perfilSlug: string;
  semanaRef: string;
}): Promise<{ ok: boolean; aprovados?: number; erro?: string }> {
  try {
    await assertAdmin();
    const aline = createAlineClient();

    const { data: perfilData } = await aline
      .from("perfis")
      .select("id")
      .eq("slug", params.perfilSlug)
      .maybeSingle();
    const perfil = perfilData as { id?: string } | null;
    if (!perfil?.id) return { ok: false, erro: "Perfil nao encontrado" };

    const { data: atualizados, error } = await aline
      .from("posts")
      .update({
        status: "aprovado",
        aprovado_em: new Date().toISOString(),
        semana_aprovada_em: new Date().toISOString(),
      })
      .eq("perfil_id", perfil.id)
      .eq("semana_ref", params.semanaRef)
      .eq("status", "aguardando_aprovacao")
      .select("id");

    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/aprovacao/${params.perfilSlug}`);
    return { ok: true, aprovados: (atualizados ?? []).length };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function editarPostAprovacao(params: {
  postId: string;
  copy_legenda?: string;
  copy_cta?: string;
  hashtags?: string[];
  data_hora_agendada?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    await assertAdmin();
    const aline = createAlineClient();
    const update: Record<string, unknown> = {};
    if (params.copy_legenda !== undefined) update.copy_legenda = params.copy_legenda;
    if (params.copy_cta !== undefined) update.copy_cta = params.copy_cta;
    if (params.hashtags !== undefined) update.hashtags = params.hashtags;
    if (params.data_hora_agendada !== undefined)
      update.data_hora_agendada = params.data_hora_agendada;

    const { error } = await aline.from("posts").update(update).eq("id", params.postId);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/aprovacao");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function cancelarPost(postId: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await assertAdmin();
    const aline = createAlineClient();
    const { error } = await aline
      .from("posts")
      .update({ status: "cancelado" })
      .eq("id", postId);
    if (error) return { ok: false, erro: error.message };
    revalidatePath("/aprovacao");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Trigger manual: gera pack semanal pra um perfil.
 * Pra usar quando nao quiser esperar a quinta-feira (lancamento, datas especiais etc.).
 */
export async function gerarPackAction(params: {
  slug: string;
  qtd?: number;
  semanaRef?: string;
}): Promise<{
  ok: boolean;
  qtd?: number;
  semanaRef?: string;
  custoUsd?: number;
  erro?: string;
}> {
  try {
    await assertAdmin();
    const r = await gerarPackSemanal({
      perfilSlug: params.slug,
      qtd: params.qtd,
      semanaRef: params.semanaRef,
    });
    if (r.ok) revalidatePath("/aprovacao");
    return {
      ok: r.ok,
      qtd: r.postIds?.length,
      semanaRef: r.semanaRef,
      custoUsd: r.custoUsd,
      erro: r.erro,
    };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
