"use server";

import { createClient, createAlineClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { CORTE_ACERVO_ANTIGO, ehAcervoAntigo, type PostFeed } from "./plano";

// 🔴 A data do corte mora em ./plano.ts, não aqui: arquivo "use server" só
// pode exportar função assíncrona. Exportar a const daqui quebrou o build
// (preview do PR #72, 06/10/2026) com "Only async functions are allowed to be
// exported in a 'use server' file".

async function assertSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data: admin } = await supabase
    .from("admins").select("papel").eq("auth_user_id", user.id).maybeSingle();
  const row = admin as { papel?: string } | null;
  if (!row || row.papel !== "super_admin") throw new Error("Só super_admin pode limpar o acervo");
  return user.id;
}

/**
 * Apaga o acervo antigo de um perfil.
 *
 * 🔴 A lista do que apagar é montada e CONFERIDA aqui, post a post, por
 * `ehAcervoAntigo` — não é um `delete ... where` solto. É o que garante que um
 * post que já foi ao ar nunca entre na conta, mesmo que alguém mude a regra de
 * status depois.
 */
export async function limparAcervoAntigo(
  perfilId: string,
): Promise<{ ok: boolean; apagados?: number; erro?: string }> {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();

    const { data, error } = await aline
      .from("posts")
      .select("id, tipo, status, semana_ref, data_hora_agendada, data_hora_postada, pilar, angulo, copy_legenda, criado_em")
      .eq("perfil_id", perfilId);
    if (error) return { ok: false, erro: error.message };

    const alvos = ((data ?? []) as PostFeed[])
      .filter((p) => ehAcervoAntigo(p, CORTE_ACERVO_ANTIGO))
      .map((p) => p.id);
    if (alvos.length === 0) return { ok: true, apagados: 0 };

    // As mídias saem primeiro: a linha de post_midias aponta pro post.
    const { error: eMid } = await aline.from("post_midias").delete().in("post_id", alvos);
    if (eMid) return { ok: false, erro: `mídias: ${eMid.message}` };

    const { error: ePost } = await aline.from("posts").delete().in("id", alvos);
    if (ePost) return { ok: false, erro: `posts: ${ePost.message}` };

    revalidatePath(`/perfis`, "layout");
    return { ok: true, apagados: alvos.length };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
