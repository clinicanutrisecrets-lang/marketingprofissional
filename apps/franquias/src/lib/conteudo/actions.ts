"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gerarSugestoesSemana } from "./gerador-sugestoes";
import { semanaAlvo, formatarSemana } from "./semana";
import { traduzirErroClaude } from "@/lib/claude/erros";

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

export async function gerarSugestoesAction(regerar = false): Promise<{ ok: boolean; msg: string }> {
  const franqueadaId = await franqueadaDoUsuario();
  if (!franqueadaId) return { ok: false, msg: "sessão inválida" };

  // 🔴 A MESMA semana que o Estúdio lista e que o painel conta (lib/conteudo/
  // semana.ts). Antes era `proximaSegunda()` aqui e no painel: numa segunda,
  // gerava pra uma semana futura vazia — a nutri via "0 sugestões", o aviso
  // "semana já tem sugestões" nunca aparecia e o 🔄 Regerar ficava inalcançável.
  const semanaRef = semanaAlvo();
  // Sem este try/catch, uma falha da API do Claude sobe como exceção do
  // server action e o Next troca a TELA INTEIRA pelo "Ops, algo deu errado"
  // — a nutri perde o contexto e não sabe o que aconteceu.
  try {
    const r = await gerarSugestoesSemana({ franqueadaId, semanaRef, regerar });
    revalidatePath("/dashboard/conteudo");
    revalidatePath("/dashboard");
    if (r.erro) return { ok: r.criadas > 0, msg: r.erro };
    return {
      ok: true,
      msg: `${r.criadas} sugestões criadas para a semana de ${formatarSemana(semanaRef)}`,
    };
  } catch (e) {
    console.error("[gerarSugestoesAction] falhou:", e);
    return { ok: false, msg: traduzirErroClaude(e).mensagem };
  }
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
  return { ok: !error };
}
