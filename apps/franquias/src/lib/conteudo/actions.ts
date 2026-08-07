"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarSugestoesSemana } from "./gerador-sugestoes";

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

/** Segunda-feira da próxima semana (fuso America/Sao_Paulo aproximado por UTC-3). */
function proximaSegunda(): string {
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  const dow = agora.getUTCDay(); // 0=dom
  const diasAteSegunda = ((8 - dow) % 7) || 7;
  const seg = new Date(agora.getTime() + diasAteSegunda * 86400 * 1000);
  return seg.toISOString().slice(0, 10);
}

export async function gerarSugestoesAction(): Promise<{ ok: boolean; msg: string }> {
  const franqueadaId = await franqueadaDoUsuario();
  if (!franqueadaId) return { ok: false, msg: "sessão inválida" };

  const semanaRef = proximaSegunda();
  const r = await gerarSugestoesSemana({ franqueadaId, semanaRef });
  revalidatePath("/dashboard/conteudo");
  if (r.erro) return { ok: r.criadas > 0, msg: r.erro };
  return { ok: true, msg: `${r.criadas} sugestões criadas para a semana de ${semanaRef}` };
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
  return { ok: !error };
}
