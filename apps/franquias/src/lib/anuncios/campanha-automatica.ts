import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import {
  criarCustomAudience,
  criarLookalikeAudience,
  criarCampanha,
  criarAdSet,
  criarAd,
  ativarEntidadeMeta,
  deletarEntidadeMeta,
  type ObjetivoNegocio,
} from "@/lib/meta/ads";

/**
 * Orquestrador do lançamento automático de uma campanha Meta Ads.
 *
 * Recebe um anuncioId já com criativo aprovado pela nutri (status='criativo_aprovado')
 * e executa o pipeline completo: público customizado + lookalike (pixel central Scanner),
 * campanha (PAUSED), adset (targeting ICP), ad (variação aprovada) e só então ativa tudo.
 *
 * Tratamento de erro: se qualquer passo falhar, tenta deletar/pausar o que já foi criado
 * na Meta e devolve o anúncio pro status 'rascunho' com o motivo.
 */

type LancarResultado = {
  ok: boolean;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  audienceId?: string;
  lookalikeId?: string;
  erro?: string;
};

function tokenDecrypt(raw: string): string {
  // Em dev o token pode estar sem encrypt — tenta decrypt, se falhar usa cru.
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}

export async function lancarCampanha(anuncioId: string): Promise<LancarResultado> {
  const admin = createAdminClient();

  const { data: anuncioData } = await admin
    .from("anuncios")
    .select(
      "id, franqueada_id, nome, objetivo_negocio, budget_diario, data_inicio, data_fim, variacoes, variacao_vencedora, publico_meta_json, url_midia, url_destino, status",
    )
    .eq("id", anuncioId)
    .maybeSingle();

  if (!anuncioData) return { ok: false, erro: "Anúncio não encontrado" };
  const anuncio = anuncioData as {
    id: string;
    franqueada_id: string;
    nome: string;
    objetivo_negocio: ObjetivoNegocio | null;
    budget_diario: number | null;
    data_inicio: string | null;
    data_fim: string | null;
    variacoes: Array<Record<string, unknown>> | null;
    variacao_vencedora: number | null;
    publico_meta_json: Record<string, unknown> | null;
    url_midia: string | null;
    url_destino: string | null;
    status: string;
  };

  const { data: franqData } = await admin
    .from("franqueadas")
    .select(
      "id, email, nome_completo, meta_ads_account_id, meta_ads_access_token, facebook_pagina_id, instagram_conta_id, cidade, modalidade_atendimento, valor_consulta_inicial, budget_diario_maximo",
    )
    .eq("id", anuncio.franqueada_id)
    .maybeSingle();

  if (!franqData) return { ok: false, erro: "Franqueada não encontrada" };
  const franq = franqData as {
    meta_ads_account_id: string | null;
    meta_ads_access_token: string | null;
    facebook_pagina_id: string | null;
    instagram_conta_id: string | null;
    cidade: string | null;
    modalidade_atendimento: string | null;
    valor_consulta_inicial: number | null;
    budget_diario_maximo: number | null;
  };

  // --- Pré-condições obrigatórias ---
  if (!franq.meta_ads_account_id || !franq.meta_ads_access_token) {
    return await abortar(anuncioId, "Conta Meta Ads não conectada (account_id/token ausente)");
  }
  if (!franq.facebook_pagina_id) {
    return await abortar(anuncioId, "Página do Facebook não conectada (facebook_pagina_id ausente)");
  }
  if (!anuncio.objetivo_negocio) {
    return await abortar(anuncioId, "Objetivo de negócio ausente");
  }

  const modalidade = franq.modalidade_atendimento ?? "presencial";
  const cidade = franq.cidade ?? "";
  if (!cidade && modalidade !== "online") {
    return await abortar(anuncioId, "Cidade da franqueada ausente — geo targeting impossível");
  }

  // --- Variação aprovada ---
  const idx = anuncio.variacao_vencedora;
  if (idx == null || !anuncio.variacoes || !anuncio.variacoes[idx]) {
    return await abortar(anuncioId, "Variação vencedora não definida ou inexistente");
  }
  const v = anuncio.variacoes[idx] as {
    headline?: string;
    primary_text?: string;
    description?: string;
  };

  const accessToken = tokenDecrypt(franq.meta_ads_access_token);
  const adAccountId = franq.meta_ads_account_id;
  const budgetCentavos = Math.round((anuncio.budget_diario ?? 0) * 100);
  const pixelId = process.env.SCANNER_META_PIXEL_ID;

  // raio do público sugerido (default 30km)
  const publico = anuncio.publico_meta_json ?? {};
  const raioKm = Number((publico as { raio_km?: number }).raio_km ?? 30);
  const idadeMin = Number((publico as { idade_min?: number }).idade_min ?? 35);
  const idadeMax = Number((publico as { idade_max?: number }).idade_max ?? 52);
  const interessesIds = ((publico as { interesses_ids?: string[] }).interesses_ids ?? []).filter(
    Boolean,
  );

  // marca como lançando (lock transitório)
  await admin.from("anuncios").update({ status: "lancando" }).eq("id", anuncioId);

  let audienceId: string | undefined;
  let lookalikeId: string | undefined;
  let campaignId: string | undefined;
  let adSetId: string | undefined;
  let adId: string | undefined;

  try {
    // 1+2. Custom audience + lookalike (só se houver pixel central)
    if (pixelId) {
      const ca = await criarCustomAudience({
        adAccountId,
        accessToken,
        nome: `Scanner Pixel · ${modalidade === "online" ? "BR" : cidade} · ${anuncio.nome}`.slice(0, 100),
        pixelId,
        cidade: modalidade === "online" ? undefined : cidade,
        raioKm: modalidade === "online" ? undefined : raioKm,
      });
      audienceId = ca.id;

      try {
        const la = await criarLookalikeAudience({
          adAccountId,
          accessToken,
          seedAudienceId: audienceId,
          country: "BR",
          ratio: 0.03,
        });
        lookalikeId = la.id;
      } catch {
        // lookalike pode falhar se seed ainda pequena — segue só com custom audience
        lookalikeId = undefined;
      }
    }

    // 3. Campanha (PAUSED)
    const camp = await criarCampanha({
      adAccountId,
      accessToken,
      nome: anuncio.nome,
      objetivo: anuncio.objetivo_negocio,
      budget_diario_centavos: budgetCentavos,
      status: "PAUSED",
    });
    campaignId = camp.id;

    // 4. AdSet (targeting ICP)
    const adset = await criarAdSet({
      campaignId,
      adAccountId,
      accessToken,
      nome: `${anuncio.nome} · AdSet`,
      objetivo: anuncio.objetivo_negocio,
      budgetDiarioCentavos: budgetCentavos,
      audienceId,
      lookalikeId,
      idadeMin,
      idadeMax,
      cidade: modalidade === "online" ? undefined : cidade,
      raioKm: modalidade === "online" ? undefined : raioKm,
      dataInicio: anuncio.data_inicio ?? undefined,
      dataFim: anuncio.data_fim ?? undefined,
      // Fallback de interesses ICP só quando não há lookalike (sem pixel central)
      interessesIds: !lookalikeId && !audienceId ? interessesIds : undefined,
    });
    adSetId = adset.id;

    // 5. Ad (variação aprovada)
    const ad = await criarAd({
      adSetId,
      adAccountId,
      accessToken,
      paginaId: franq.facebook_pagina_id,
      nome: `${anuncio.nome} · ${v.headline ?? "Ad"}`.slice(0, 100),
      headline: v.headline ?? anuncio.nome,
      primaryText: v.primary_text ?? "",
      description: v.description ?? "",
      urlDestino: anuncio.url_destino ?? "",
      urlImagemOuVideo: anuncio.url_midia ?? undefined,
      instagramAccountId: franq.instagram_conta_id ?? undefined,
    });
    adId = ad.id;

    // 6. Ativar tudo (adset → ad → campaign)
    await ativarEntidadeMeta({ entityId: adSetId, accessToken });
    await ativarEntidadeMeta({ entityId: adId, accessToken });
    await ativarEntidadeMeta({ entityId: campaignId, accessToken });

    // 7. Persistir DB
    await admin
      .from("anuncios")
      .update({
        meta_campaign_id: campaignId,
        meta_adset_id: adSetId,
        meta_ad_id: adId,
        meta_audience_id: audienceId ?? null,
        meta_lookalike_id: lookalikeId ?? null,
        status: "ativo",
        pausado_automaticamente: false,
        motivo_pausa: null,
        data_inicio: anuncio.data_inicio ?? new Date().toISOString().slice(0, 10),
      })
      .eq("id", anuncioId);

    await admin.from("ads_audit_log").insert({
      franqueada_id: anuncio.franqueada_id,
      anuncio_id: anuncioId,
      ator: "sistema_cron",
      acao: "lancar_campanha",
      meta_campaign_id: campaignId,
      estado_antes: { status: "criativo_aprovado" },
      estado_depois: { status: "ativo", campaignId, adSetId, adId },
      motivo: "Lançamento automático após aprovação do criativo",
      detalhes: { audienceId, lookalikeId, usouPixelCentral: Boolean(pixelId) },
    });

    return { ok: true, campaignId, adSetId, adId, audienceId, lookalikeId };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);

    // rollback best-effort: deleta o que já criou (ordem inversa)
    for (const id of [adId, adSetId, campaignId]) {
      if (id) {
        try {
          await deletarEntidadeMeta({ entityId: id, accessToken });
        } catch {
          /* best-effort */
        }
      }
    }
    for (const id of [lookalikeId, audienceId]) {
      if (id) {
        try {
          await deletarEntidadeMeta({ entityId: id, accessToken });
        } catch {
          /* best-effort */
        }
      }
    }

    await admin.from("ads_audit_log").insert({
      franqueada_id: anuncio.franqueada_id,
      anuncio_id: anuncioId,
      ator: "sistema_cron",
      acao: "lancar_campanha_falhou",
      meta_campaign_id: campaignId ?? null,
      motivo: erro,
      detalhes: { audienceId, lookalikeId, campaignId, adSetId, adId },
    });

    return await abortar(anuncioId, erro);
  }
}

async function abortar(anuncioId: string, motivo: string): Promise<LancarResultado> {
  const admin = createAdminClient();
  await admin
    .from("anuncios")
    .update({ status: "rascunho", motivo_pausa: motivo })
    .eq("id", anuncioId);
  return { ok: false, erro: motivo };
}
