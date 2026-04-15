"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { buscarTrendsSaude } from "./google-trends";
import { buscarNoticiasSaude } from "./news";
import { classificarSinais, type SinalBruto } from "./classifier";

/**
 * Pipeline diário de tendências.
 * Roda 1x/dia às 06:00 via cron.
 * Por nicho (hoje só "saude_integrativa"), coleta sinais, classifica com Claude,
 * e salva em tendencias_diarias.
 */
export async function orquestrarTendencias(
  dataRef?: string,
  nicho = "saude_integrativa",
): Promise<{ ok: boolean; salvas: number; erro?: string }> {
  const data = dataRef ?? new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  try {
    // 1. Coletar sinais em paralelo
    const [trends, noticias] = await Promise.all([
      buscarTrendsSaude(),
      buscarNoticiasSaude(),
    ]);

    const sinais: SinalBruto[] = [
      ...trends.map((t) => ({
        fonte: "google_trends",
        tema: t.termo,
        resumo: t.volume ? `Volume: ${t.volume}` : undefined,
      })),
      ...noticias.map((n) => ({
        fonte: `news_${n.fonte.toLowerCase().replace(/\s+/g, "_")}`,
        tema: n.titulo,
        resumo: n.resumo,
        url: n.url,
      })),
    ];

    if (sinais.length === 0) {
      return { ok: false, salvas: 0, erro: "Sem sinais coletados" };
    }

    // 2. Classificar com Claude
    const classificadas = await classificarSinais(sinais);

    if (classificadas.length === 0) {
      return { ok: false, salvas: 0, erro: "Nenhuma tendência relevante após filtro" };
    }

    // 3. Limpar tendências antigas do mesmo dia/nicho (idempotente)
    await admin
      .from("tendencias_diarias")
      .delete()
      .eq("data_ref", data)
      .eq("nicho", nicho);

    // 4. Inserir novas
    const rows = classificadas.map((t) => ({
      data_ref: data,
      nicho,
      fonte: t.fonte,
      tema: t.tema,
      resumo: t.resumo,
      relevancia_icp: t.relevancia_icp,
      angulo_sugerido: t.angulo_sugerido,
      hashtags_sugeridas: t.hashtags_sugeridas,
      url_referencia: t.url_referencia,
      metadata: {},
    }));

    const { error } = await admin.from("tendencias_diarias").insert(rows);
    if (error) return { ok: false, salvas: 0, erro: error.message };

    return { ok: true, salvas: rows.length };
  } catch (e) {
    return { ok: false, salvas: 0, erro: (e as Error).message };
  }
}

/**
 * Busca tendências do dia (ou mais recentes se não tiver do dia).
 */
export async function listarTendenciasDoDia(
  nicho = "saude_integrativa",
  limite = 10,
) {
  const admin = createAdminClient();
  const hoje = new Date().toISOString().slice(0, 10);

  // Tenta hoje primeiro
  const { data: hoje_data } = await admin
    .from("tendencias_diarias")
    .select("*")
    .eq("data_ref", hoje)
    .eq("nicho", nicho)
    .order("relevancia_icp", { ascending: false })
    .limit(limite);

  if (hoje_data && hoje_data.length > 0) {
    return hoje_data as Array<Record<string, unknown>>;
  }

  // Fallback: mais recente
  const { data: recente } = await admin
    .from("tendencias_diarias")
    .select("*")
    .eq("nicho", nicho)
    .order("data_ref", { ascending: false })
    .order("relevancia_icp", { ascending: false })
    .limit(limite);

  return (recente ?? []) as Array<Record<string, unknown>>;
}
