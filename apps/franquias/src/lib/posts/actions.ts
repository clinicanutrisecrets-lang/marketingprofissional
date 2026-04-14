"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { gerarMinhaSemana, gerarPostsDaSemana } from "@/lib/geracao/semanal";

async function getFranqueadaDoUser() {
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
  return data ? { userId: user.id, franqueadaId: (data as { id: string }).id } : null;
}

export async function aprovarPost(postId: string): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({ status: "aprovado", aprovado_individual: true })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

export async function aprovarSemanaToda(
  aprovacaoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();

  const { error: errPosts } = await supabase
    .from("posts_agendados")
    .update({
      status: "aprovado",
      aprovado_individual: true,
    })
    .eq("aprovacao_semanal_id", aprovacaoId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (errPosts) return { ok: false, erro: errPosts.message };

  const { error: errAprov } = await supabase
    .from("aprovacoes_semanais")
    .update({
      status: "aprovada_integral",
      aprovada_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (errAprov) return { ok: false, erro: errAprov.message };

  revalidatePath("/dashboard/aprovar");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function atualizarCopyPost(
  postId: string,
  campos: { copy_legenda?: string; copy_cta?: string; hashtags?: string[]; data_hora_agendada?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({
      ...campos,
      editado_pela_nutri: true,
    })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

export async function cancelarPost(postId: string): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({ status: "cancelado" })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

/**
 * Dispara geração manual da semana (ação da nutri pelo dashboard).
 */
export async function gerarSemanaManual() {
  return gerarMinhaSemana();
}

/**
 * Dispara geração via admin (pra qualquer franqueada).
 */
export async function gerarSemanaAdmin(franqueadaId: string, semanaRef?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) return { ok: false, erro: "Sem permissão" };

  const semana = semanaRef ?? proximaSegunda();
  return gerarPostsDaSemana(franqueadaId, semana);
}

function proximaSegunda(): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  d.setDate(d.getDate() + diasAteSegunda);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
