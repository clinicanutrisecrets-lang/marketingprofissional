"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { buscarNoticiasSaude } from "./news";
import { buscarPautasQuentes } from "@/lib/conteudo/trends";
import { classificarSinais, type SinalBruto } from "./classifier";

/**
 * Pipeline diário de tendências (cron 09:00 UTC).
 *
 * 🔴 Duas coisas estavam erradas aqui e o resultado ficou 4 meses parado
 * (última coleta: 2026-04-15, 5 linhas, todas de "saude_integrativa"):
 *
 *  1. **Coleta cega ao nicho.** As notícias vinham do RSS do G1 Bem-Estar, que
 *     cobre saúde em geral, e tudo era gravado sob um único nicho fixo. Isso é
 *     a MESMA raiz do post de câncer colorretal no perfil de saúde hormonal
 *     feminina (Juliana, 15/08): pauta genérica entregue como se fosse do
 *     nicho da profissional. Agora a coleta usa as buscas por nicho do
 *     `lib/conteudo/trends` (Google News RSS) e o nicho entra no prompt do
 *     classificador.
 *  2. **O endpoint de daily trends do Google morreu** (`/trends/api/dailytrends`
 *     responde 404 — conferido em 17/08/2026). A chamada era engolida por um
 *     `catch` que devolvia lista vazia, e como o Google Trends era metade dos
 *     sinais, sobrava pouco. Paramos de chamar; o Google News RSS cobre o mesmo
 *     terreno e responde.
 *
 * Silêncio também era problema: a rota devolvia HTTP 200 com `ok:false` e
 * ninguém via. Quem chama agora recebe o erro por nicho pra poder falhar alto.
 */
export async function orquestrarTendencias(
  dataRef?: string,
  nicho = "saude_integrativa",
): Promise<{ ok: boolean; salvas: number; erro?: string }> {
  const data = dataRef ?? new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();

  try {
    // 1. Coletar sinais — manchetes do NICHO + saúde geral como complemento
    const [manchetesNicho, noticias] = await Promise.all([
      buscarPautasQuentes({ nichoPrincipal: nicho }),
      buscarNoticiasSaude(),
    ]);

    const sinais: SinalBruto[] = [
      ...manchetesNicho.map((m) => ({
        fonte: `google_news_${m.fonte.toLowerCase().replace(/\s+/g, "_") || "rss"}`,
        tema: m.titulo,
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

    // 2. Classificar com Claude — filtrando pelo nicho, não por um ICP fixo
    const classificadas = await classificarSinais(sinais, nicho);

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

// Quantos dias de idade uma tendência ainda pode ter pra ser mostrada como
// atual. Fica como const local de propósito: arquivo "use server" só pode
// EXPORTAR funções async — exportar a constante quebra o build.
const TENDENCIA_VALIDADE_DIAS = 10;

/**
 * Tendências recentes do nicho, com a data do que foi encontrado.
 *
 * 🔴 O `dataRef` sai daqui de propósito: a tela dizia "Em alta hoje no seu
 * nicho · atualizado diariamente" sobre linhas de 15 de abril. Quem mostra
 * precisa saber DE QUANDO é o dado, e nada além de `TENDENCIA_VALIDADE_DIAS`
 * volta — pauta de 4 meses atrás não é "em alta".
 */
export async function listarTendenciasRecentes(
  nicho = "saude_integrativa",
  limite = 10,
  maxDiasAtras = TENDENCIA_VALIDADE_DIAS,
): Promise<{ itens: Array<Record<string, unknown>>; dataRef: string | null }> {
  const admin = createAdminClient();
  const limiteData = new Date(Date.now() - maxDiasAtras * 86400 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await admin
    .from("tendencias_diarias")
    .select("*")
    .eq("nicho", nicho)
    .gte("data_ref", limiteData)
    .order("data_ref", { ascending: false })
    .order("relevancia_icp", { ascending: false })
    .limit(limite);

  if (error) {
    console.error("[tendencias] leitura falhou:", error.message, { nicho });
    return { itens: [], dataRef: null };
  }

  const itens = (data ?? []) as Array<Record<string, unknown>>;
  // Não misturar dias: só o lote mais recente que sobreviveu ao corte.
  const dataRef = (itens[0]?.data_ref as string | undefined) ?? null;
  return {
    itens: dataRef ? itens.filter((t) => t.data_ref === dataRef) : [],
    dataRef,
  };
}

/** Compatibilidade: só os itens. */
export async function listarTendenciasDoDia(
  nicho = "saude_integrativa",
  limite = 10,
) {
  const { itens } = await listarTendenciasRecentes(nicho, limite);
  return itens;
}
