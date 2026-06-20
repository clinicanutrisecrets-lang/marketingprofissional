"use server";
import { createClient } from "@/lib/supabase/server";
import { aprovarCriativo as _aprovarCriativo } from "@/lib/anuncios/actions";

export async function aprovarCriativo(anuncioId: string, variacaoIdx: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) return { ok: false, erro: "Não autorizado" };

  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("id")
    .eq("id", anuncioId)
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .maybeSingle();
  if (!anuncio) return { ok: false, erro: "Anúncio não encontrado" };

  return _aprovarCriativo(anuncioId, variacaoIdx);
}
