"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { criarPostTemaEmAlta } from "@/lib/arte-post/actions";
import { coletarTemasDoPerfil, manchetesDoMomento } from "./coletar";
import { temaParaPost } from "./radar";

async function exigirSuperAdmin(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data } = await supabase.from("admins").select("papel").eq("auth_user_id", user.id).maybeSingle();
  if ((data as { papel?: string } | null)?.papel !== "super_admin") throw new Error("Só super_admin");
}

/** Vira post: o fato e a leitura do radar entram como o tema, e a arte sai na hora. */
export async function fazerPostDoTemaEmAlta(temaId: string, dia: string): Promise<
  { ok: true; arte: boolean; aviso?: string } | { ok: false; erro: string }
> {
  try {
    await exigirSuperAdmin();
    const aline = createAlineClient();
    const { data, error } = await aline
      .from("temas_em_alta").select("id, perfil_id, fato, angulo, assunto, post_id").eq("id", temaId).maybeSingle();
    if (error || !data) return { ok: false, erro: "Tema não encontrado." };
    const t = data as { id: string; perfil_id: string; fato: string; angulo: string; assunto: string; post_id: string | null };
    if (t.post_id) return { ok: false, erro: "Este tema já virou post." };
    const { data: perfil } = await aline.from("perfis").select("slug").eq("id", t.perfil_id).maybeSingle();
    const slug = (perfil as { slug?: string } | null)?.slug;
    if (!slug) return { ok: false, erro: "Perfil não encontrado." };

    const r = await criarPostTemaEmAlta({ perfilSlug: slug, tema: temaParaPost(t), assunto: t.assunto, dia });
    if (!r.ok) return r;
    await aline.from("temas_em_alta").update({ post_id: r.postId }).eq("id", t.id);
    revalidatePath(`/perfis/${slug}/feed`);
    return { ok: true, arte: r.arte, ...(r.aviso ? { aviso: r.aviso } : {}) };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}

export async function descartarTemaEmAlta(temaId: string, perfilSlug: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await exigirSuperAdmin();
    const { error } = await createAlineClient()
      .from("temas_em_alta").update({ descartado_em: new Date().toISOString() }).eq("id", temaId);
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/perfis/${perfilSlug}/feed`);
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}

/** "Procurar agora": o mesmo radar do cron, só pra este perfil. */
export async function procurarTemasAgora(perfilSlug: string): Promise<{ ok: true; novos: number } | { ok: false; erro: string }> {
  try {
    await exigirSuperAdmin();
    const aline = createAlineClient();
    const { data } = await aline.from("perfis").select("id, slug, publico_alvo").eq("slug", perfilSlug).maybeSingle();
    if (!data) return { ok: false, erro: "Perfil não encontrado." };
    const r = await coletarTemasDoPerfil(data as { id: string; slug: string; publico_alvo: string | null }, await manchetesDoMomento());
    revalidatePath(`/perfis/${perfilSlug}/feed`);
    return r;
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}
