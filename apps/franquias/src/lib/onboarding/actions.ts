"use server";

import { createClient } from "@/lib/supabase/server";
import { calcularPercentual } from "./steps";
import { revalidatePath } from "next/cache";

/**
 * Salva um conjunto de campos da franqueada no banco.
 * Chamada a cada blur de campo (ou com debounce) pelo wizard.
 * Recalcula o percentual automaticamente.
 */
export async function salvarCamposFranqueada(
  campos: Record<string, unknown>,
): Promise<{ ok: boolean; percentual?: number; erro?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Não autenticado" };
  }

  // Busca dados atuais pra calcular percentual após o merge
  const { data: atual, error: erroBusca } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (erroBusca) {
    return { ok: false, erro: erroBusca.message };
  }

  const dadosMesclados = { ...(atual ?? {}), ...campos };
  const percentual = calcularPercentual(dadosMesclados);

  const updatePayload = {
    ...campos,
    onboarding_percentual: percentual,
    atualizado_em: new Date().toISOString(),
  };

  let resultado;
  if (atual) {
    resultado = await supabase
      .from("franqueadas")
      .update(updatePayload)
      .eq("auth_user_id", user.id);
  } else {
    resultado = await supabase.from("franqueadas").insert({
      auth_user_id: user.id,
      email: user.email ?? "",
      nome_completo: (campos.nome_completo as string) ?? user.email ?? "Nova nutri",
      ...updatePayload,
    });
  }

  if (resultado.error) {
    return { ok: false, erro: resultado.error.message };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { ok: true, percentual };
}

/**
 * Marca o onboarding como completo (dispara fluxos da Sprint 3+).
 */
export async function finalizarOnboarding(): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { error } = await supabase
    .from("franqueadas")
    .update({
      onboarding_completo: true,
      status: "ativo",
      data_inicio_servico: new Date().toISOString().slice(0, 10),
    })
    .eq("auth_user_id", user.id);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}
