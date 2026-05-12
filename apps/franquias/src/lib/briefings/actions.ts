"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FormatoPreferido =
  | "feed_imagem"
  | "feed_carrossel"
  | "reels"
  | "stories"
  | "sem_preferencia";

export type StatusBriefing = "pendente" | "usado" | "cancelado" | "expirado";

export type Briefing = {
  id: string;
  franqueada_id: string;
  tema: string;
  angulo_sugerido: string | null;
  formato_preferido: FormatoPreferido | null;
  observacoes: string | null;
  status: StatusBriefing;
  semana_alvo: string | null;
  post_gerado_id: string | null;
  criado_em: string;
  usado_em: string | null;
  cancelado_em: string | null;
};

async function getFranqueadaId(): Promise<string | null> {
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

  return (data as { id?: string } | null)?.id ?? null;
}

export async function criarBriefing(input: {
  tema: string;
  angulo_sugerido?: string;
  formato_preferido?: FormatoPreferido;
  observacoes?: string;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const tema = input.tema?.trim();
  if (!tema || tema.length < 4) {
    return { ok: false, erro: "Descreva o tema com pelo menos 4 caracteres." };
  }
  if (tema.length > 500) {
    return { ok: false, erro: "Tema muito longo (máx 500 caracteres)." };
  }

  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("briefings_franqueada")
    .insert({
      franqueada_id: franqueadaId,
      tema,
      angulo_sugerido: input.angulo_sugerido?.trim() || null,
      formato_preferido: input.formato_preferido || "sem_preferencia",
      observacoes: input.observacoes?.trim() || null,
      status: "pendente",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, erro: error?.message ?? "Erro ao salvar pedido" };
  }

  revalidatePath("/dashboard/briefings");
  revalidatePath("/dashboard");
  return { ok: true, id: (data as { id: string }).id };
}

export async function cancelarBriefing(
  id: string,
): Promise<{ ok: boolean; erro?: string }> {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("briefings_franqueada")
    .update({ status: "cancelado", cancelado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("franqueada_id", franqueadaId)
    .eq("status", "pendente");

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/dashboard/briefings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function listarBriefings(): Promise<{
  pendentes: Briefing[];
  recentes: Briefing[];
  erro?: string;
}> {
  const franqueadaId = await getFranqueadaId();
  if (!franqueadaId) return { pendentes: [], recentes: [], erro: "Não autenticado" };

  const admin = createAdminClient();

  const { data: pendentes, error: e1 } = await admin
    .from("briefings_franqueada")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });

  if (e1) return { pendentes: [], recentes: [], erro: e1.message };

  const { data: recentes, error: e2 } = await admin
    .from("briefings_franqueada")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .in("status", ["usado", "cancelado", "expirado"])
    .order("criado_em", { ascending: false })
    .limit(20);

  if (e2) return { pendentes: (pendentes as Briefing[]) ?? [], recentes: [], erro: e2.message };

  return {
    pendentes: (pendentes as Briefing[]) ?? [],
    recentes: (recentes as Briefing[]) ?? [],
  };
}

/**
 * Usado pelo gerador semanal (server-side, admin). Retorna briefings pendentes
 * da franqueada criados nos últimos `diasJanela` dias.
 */
export async function buscarBriefingsPendentes(
  franqueadaId: string,
  diasJanela = 7,
): Promise<Briefing[]> {
  const admin = createAdminClient();
  const desde = new Date();
  desde.setDate(desde.getDate() - diasJanela);

  const { data } = await admin
    .from("briefings_franqueada")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .eq("status", "pendente")
    .gte("criado_em", desde.toISOString())
    .order("criado_em", { ascending: true });

  return (data as Briefing[]) ?? [];
}

/**
 * Marca um briefing como usado e linka ao post gerado.
 */
export async function marcarBriefingUsado(
  briefingId: string,
  postId: string,
  semanaRef: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("briefings_franqueada")
    .update({
      status: "usado",
      usado_em: new Date().toISOString(),
      post_gerado_id: postId,
      semana_alvo: semanaRef,
    })
    .eq("id", briefingId);
}
