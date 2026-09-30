"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { calcularPercentual } from "./steps";
import { revalidatePath } from "next/cache";
import { concluirOnboarding } from "./concluir";

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
 * Marca o onboarding como completo. Dispara em background:
 *  1. Geracao da primeira semana de posts (gerarPostsDaSemana)
 *  2. Email de boas-vindas com link da LP — delay aleatorio 18-24h
 *     (sensacao de "humano trabalhando", evita parecer automacao crua)
 *  3. Email "primeira semana pronta pra aprovar" — delay aleatorio 30-46h
 *  4. Callback POST pro Scanner SaaS marcando onboarding concluido
 *
 * O miolo mora em ./concluir.ts (o SSO também conclui, quando o questionário
 * do Scanner já respondeu tudo). Falhas individuais dos disparos ficam em
 * logs/email_queue e não bloqueiam a finalização.
 */
export async function finalizarOnboarding(): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const admin = createAdminClient();
  const { data: franq } = await admin
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franq) return { ok: false, erro: "Franqueada não encontrada" };

  const r = await concluirOnboarding(admin, (franq as { id: string }).id);
  if (r.ok) revalidatePath("/dashboard");
  return r;
}

