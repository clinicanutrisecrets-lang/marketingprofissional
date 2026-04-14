"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MAPEAMENTO_META, type ObjetivoNegocio } from "@/lib/meta/ads";

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
  return data ? (data as { id: string }).id : null;
}

export async function criarAnuncioDraft(params: {
  nome: string;
  objetivo_negocio: ObjetivoNegocio;
  tema_criativo: string;
  funil_destino_id?: string;
  publico_descricao?: string;
  budget_diario: number;
  budget_total?: number;
  data_inicio?: string;
  data_fim?: string;
  copy_headline?: string;
  copy_texto?: string;
  copy_cta_botao?: string;
}): Promise<{ ok: boolean; anuncioId?: string; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const mapping = MAPEAMENTO_META[params.objetivo_negocio];
  const supabase = createClient();

  const { data, error } = await supabase
    .from("anuncios")
    .insert({
      franqueada_id: franqueadaId,
      nome: params.nome,
      objetivo_negocio: params.objetivo_negocio,
      tema_criativo: params.tema_criativo,
      funil_destino_id: params.funil_destino_id,
      meta_objective: mapping.campaign_objective,
      meta_optimization: mapping.optimization_goal,
      meta_destination: mapping.destination_type,
      status: "rascunho",
      publico_descricao: params.publico_descricao,
      budget_diario: params.budget_diario,
      budget_total: params.budget_total,
      data_inicio: params.data_inicio,
      data_fim: params.data_fim,
      copy_headline: params.copy_headline,
      copy_texto: params.copy_texto,
      copy_cta_botao: params.copy_cta_botao,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/dashboard/anuncios");
  return { ok: true, anuncioId: (data as { id: string }).id };
}

export async function pausarAnuncio(anuncioId: string): Promise<{ ok: boolean; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("anuncios")
    .update({ status: "pausado" })
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/anuncios");
  return { ok: true };
}

export async function reativarAnuncio(anuncioId: string): Promise<{ ok: boolean; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("anuncios")
    .update({ status: "ativo" })
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/anuncios");
  return { ok: true };
}

/**
 * Busca benchmark pra objetivo + nicho pra mostrar UI de performance.
 */
export async function buscarBenchmark(
  nicho: string,
  objetivoNegocio: ObjetivoNegocio,
  regiao: string = "BR_geral",
) {
  const admin = createAdminClient();
  const metrica =
    objetivoNegocio === "receber_mensagens"
      ? "cpl"
      : objetivoNegocio === "agendar_consultas"
        ? "cpa_consulta"
        : objetivoNegocio === "ganhar_seguidores"
          ? "custo_seguidor"
          : objetivoNegocio === "vender_teste_genetico"
            ? "cac"
            : "cpl";

  const { data } = await admin
    .from("benchmarks_mercado")
    .select("*")
    .eq("nicho", nicho)
    .eq("objetivo_anuncio", objetivoNegocio)
    .or(`regiao.eq.${regiao},regiao.eq.BR_geral`)
    .eq("metrica", metrica)
    .limit(1)
    .maybeSingle();

  return data as
    | {
        valor_excelente: number;
        valor_bom: number;
        valor_mediano: number;
        valor_ruim: number;
        metrica: string;
        regiao: string;
      }
    | null;
}
