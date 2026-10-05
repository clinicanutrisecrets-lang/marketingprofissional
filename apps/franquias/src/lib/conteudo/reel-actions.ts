"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { produzirReelAnimado, type DuracaoReel, type FranqueadaReel } from "./reel-animado";

/**
 * Botão "Reel animado" em Conteúdo. O miolo (agente + worker) mora em
 * reel-animado.ts, o mesmo que o pacote de domingo usa.
 * Requer GITHUB_ACTIONS_TOKEN (PAT com Actions:write neste repo) na Vercel.
 */
export async function gerarReelAnimadoAction(
  tema: string,
  duracao: DuracaoReel,
): Promise<{ ok: boolean; msg: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: "sessão inválida" };

  const { data: fr } = await supabase
    .from("franqueadas")
    .select("id, instagram_handle, nome_completo, crn_numero, crn_estado, nicho_principal, publico_alvo_descricao")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!fr) return { ok: false, msg: "perfil não encontrado" };

  const r = await produzirReelAnimado(createAdminClient(), {
    franqueada: fr as FranqueadaReel,
    tema,
    duracao: duracao === "30s" ? "30s" : "60s",
  });
  if (!r.ok) return r;
  revalidatePath("/dashboard/conteudo");
  return {
    ok: true,
    msg: "🎬 Reel em produção! Fica pronto em ~10 minutos, recarregue a página pra acompanhar.",
  };
}
