"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function franqueadaDoUsuario() {
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
  return (data as { id: string } | null)?.id ?? null;
}

export async function excluirArteGaleria(id: string): Promise<{ ok: boolean }> {
  const franqueadaId = await franqueadaDoUsuario();
  if (!franqueadaId) return { ok: false };
  const supabase = createClient();
  const { data: row } = await supabase
    .from("artes_geradas")
    .select("path")
    .eq("id", id)
    .eq("franqueada_id", franqueadaId)
    .maybeSingle();
  const path = (row as { path?: string } | null)?.path;
  const { error } = await supabase
    .from("artes_geradas")
    .delete()
    .eq("id", id)
    .eq("franqueada_id", franqueadaId);
  if (!error && path) {
    await supabase.storage.from("franqueadas-assets").remove([path]);
  }
  revalidatePath("/dashboard/conteudo/galeria");
  return { ok: !error };
}

export async function marcarStatusSugestao(
  id: string,
  status: "baixado" | "gravado" | "descartado",
): Promise<{ ok: boolean }> {
  const franqueadaId = await franqueadaDoUsuario();
  if (!franqueadaId) return { ok: false };
  const supabase = createClient();
  const { error } = await supabase
    .from("sugestoes_conteudo")
    .update({ status } as never) // tabela nova — fora dos types gerados
    .eq("id", id)
    .eq("franqueada_id", franqueadaId);
  revalidatePath("/dashboard/conteudo");
  revalidatePath("/dashboard");
  return { ok: !error };
}
