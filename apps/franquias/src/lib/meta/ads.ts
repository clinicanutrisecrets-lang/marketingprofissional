/**
 * Meta Marketing API — criação e gestão de campanhas.
 *
 * IMPORTANTE: Requer app Meta com permissão `ads_management` aprovada.
 * Em modo desenvolvimento, só funciona pra contas de teste.
 *
 * Fluxo hierárquico:
 *   Campaign → AdSet (1+) → Ad (1+)
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export type ObjetivoNegocio =
  | "ganhar_seguidores"
  | "receber_mensagens"
  | "agendar_consultas"
  | "vender_teste_genetico"
  | "alcance"
  | "trafego_site";

export const MAPEAMENTO_META: Record<
  ObjetivoNegocio,
  {
    campaign_objective: string;
    optimization_goal: string;
    billing_event: string;
    destination_type?: string;
  }
> = {
  ganhar_seguidores: {
    campaign_objective: "OUTCOME_ENGAGEMENT",
    optimization_goal: "PROFILE_VISIT",
    billing_event: "IMPRESSIONS",
    destination_type: "INSTAGRAM_PROFILE",
  },
  receber_mensagens: {
    campaign_objective: "OUTCOME_ENGAGEMENT",
    optimization_goal: "CONVERSATIONS",
    billing_event: "IMPRESSIONS",
    destination_type: "WHATSAPP",
  },
  agendar_consultas: {
    campaign_objective: "OUTCOME_LEADS",
    optimization_goal: "LEAD_GENERATION",
    billing_event: "IMPRESSIONS",
  },
  vender_teste_genetico: {
    campaign_objective: "OUTCOME_SALES",
    optimization_goal: "OFFSITE_CONVERSIONS",
    billing_event: "IMPRESSIONS",
  },
  alcance: {
    campaign_objective: "OUTCOME_AWARENESS",
    optimization_goal: "REACH",
    billing_event: "IMPRESSIONS",
  },
  trafego_site: {
    campaign_objective: "OUTCOME_TRAFFIC",
    optimization_goal: "LINK_CLICKS",
    billing_event: "IMPRESSIONS",
  },
};

export async function criarCampanha(params: {
  adAccountId: string;
  accessToken: string;
  nome: string;
  objetivo: ObjetivoNegocio;
  budget_diario_centavos: number;
  status?: "ACTIVE" | "PAUSED";
}): Promise<{ id: string }> {
  const mapping = MAPEAMENTO_META[params.objetivo];
  const url = new URL(`${GRAPH}/act_${params.adAccountId}/campaigns`);
  url.searchParams.set("name", params.nome);
  url.searchParams.set("objective", mapping.campaign_objective);
  url.searchParams.set("status", params.status ?? "PAUSED"); // cria pausado por segurança
  url.searchParams.set("special_ad_categories", "[]");
  url.searchParams.set("daily_budget", params.budget_diario_centavos.toString());
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarCampanha: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function pausarCampanha(params: {
  campaignId: string;
  accessToken: string;
}) {
  const url = new URL(`${GRAPH}/${params.campaignId}`);
  url.searchParams.set("status", "PAUSED");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`pausarCampanha: ${res.status}`);
}

export async function reativarCampanha(params: {
  campaignId: string;
  accessToken: string;
}) {
  const url = new URL(`${GRAPH}/${params.campaignId}`);
  url.searchParams.set("status", "ACTIVE");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`reativarCampanha: ${res.status}`);
}

export async function getInsightsCampanha(params: {
  campaignId: string;
  accessToken: string;
  days?: number;
}): Promise<{
  spend: number;
  impressions: number;
  clicks: number;
  leads?: number;
  cpl?: number;
  cpm?: number;
  ctr?: number;
  frequency?: number;
}> {
  const url = new URL(`${GRAPH}/${params.campaignId}/insights`);
  url.searchParams.set(
    "fields",
    "spend,impressions,clicks,cpm,ctr,frequency,actions,cost_per_action_type",
  );
  url.searchParams.set("date_preset", params.days === 1 ? "today" : "last_7d");
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getInsights: ${res.status}`);
  const data = await res.json();
  const row = data.data?.[0];
  if (!row) return { spend: 0, impressions: 0, clicks: 0 };

  const leadsAction = row.actions?.find(
    (a: { action_type: string; value: string }) =>
      a.action_type === "lead" || a.action_type === "onsite_conversion.messaging_first_reply",
  );
  const leads = leadsAction ? Number(leadsAction.value) : undefined;
  const cplAction = row.cost_per_action_type?.find(
    (a: { action_type: string; value: string }) => a.action_type === "lead",
  );
  const cpl = cplAction ? Number(cplAction.value) : undefined;

  return {
    spend: Number(row.spend ?? 0),
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    leads,
    cpl,
    cpm: Number(row.cpm ?? 0),
    ctr: Number(row.ctr ?? 0),
    frequency: row.frequency != null ? Number(row.frequency) : undefined,
  };
}

// ============================================================================
// PÚBLICOS (Audiences)
// ============================================================================

/**
 * Cria um Custom Audience baseado no pixel central (Scanner) — engajamento +
 * filtro geográfico implícito (o geo real é aplicado no AdSet, aqui é a seed
 * de quem interagiu com o pixel). Serve de seed pra lookalike.
 */
export async function criarCustomAudience(params: {
  adAccountId: string;
  accessToken: string;
  nome: string;
  pixelId: string;
  cidade: string;
  raioKm?: number;
}): Promise<{ id: string }> {
  const url = new URL(`${GRAPH}/act_${params.adAccountId}/customaudiences`);
  url.searchParams.set("name", params.nome);
  url.searchParams.set("subtype", "WEBSITE");
  url.searchParams.set("retention_days", "180");
  url.searchParams.set("prefill", "true");
  url.searchParams.set(
    "rule",
    JSON.stringify({
      inclusions: {
        operator: "or",
        rules: [
          {
            event_sources: [{ id: params.pixelId, type: "pixel" }],
            retention_seconds: 15552000, // 180 dias
            filter: {
              operator: "and",
              filters: [
                { field: "event", operator: "eq", value: "PageView" },
              ],
            },
          },
        ],
      },
    }),
  );
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarCustomAudience: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Cria um Lookalike a partir de um audience seed (ex.: custom audience do
 * pixel central). ratio entre 0.01 e 0.10 (1% a 10%).
 */
export async function criarLookalikeAudience(params: {
  adAccountId: string;
  accessToken: string;
  seedAudienceId: string;
  country: string;
  ratio: number;
}): Promise<{ id: string }> {
  const ratio = Math.min(0.1, Math.max(0.01, params.ratio));
  const url = new URL(`${GRAPH}/act_${params.adAccountId}/customaudiences`);
  url.searchParams.set("name", `Lookalike ${ratio * 100}% (${params.country})`);
  url.searchParams.set("subtype", "LOOKALIKE");
  url.searchParams.set("origin_audience_id", params.seedAudienceId);
  url.searchParams.set(
    "lookalike_spec",
    JSON.stringify({
      type: "similarity",
      country: params.country,
      ratio,
    }),
  );
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarLookalikeAudience: ${res.status} ${await res.text()}`);
  return res.json();
}

// ============================================================================
// ADSET
// ============================================================================

/**
 * Cria um AdSet com targeting ICP completo: geo (cidade + raio), idade, gênero
 * feminino, custom audience e/ou lookalike e interesses-fallback do ICP.
 */
export async function criarAdSet(params: {
  campaignId: string;
  adAccountId: string;
  accessToken: string;
  nome: string;
  objetivo: ObjetivoNegocio;
  budgetDiarioCentavos: number;
  audienceId?: string;
  lookalikeId?: string;
  idadeMin?: number;
  idadeMax?: number;
  cidade: string;
  raioKm?: number;
  dataInicio?: string;
  dataFim?: string;
  interessesIds?: string[];
}): Promise<{ id: string }> {
  const mapping = MAPEAMENTO_META[params.objetivo];
  const raio = params.raioKm ?? 30;

  const targeting: Record<string, unknown> = {
    geo_locations: {
      custom_locations: [
        {
          // Sem coordenadas resolvidas usamos a string de cidade via "name".
          // O Meta exige lat/lng pra custom_locations; quando não temos,
          // caímos pro targeting por cidade nominal.
        },
      ],
    },
    age_min: params.idadeMin ?? 35,
    age_max: params.idadeMax ?? 52,
    genders: [2], // 2 = mulheres
  };

  // geo: preferimos cidade nominal (mais robusto sem geocoding)
  targeting.geo_locations = {
    cities: [{ key: params.cidade, radius: raio, distance_unit: "kilometer" }],
  };

  const customAudiences: Array<{ id: string }> = [];
  if (params.audienceId) customAudiences.push({ id: params.audienceId });
  if (params.lookalikeId) customAudiences.push({ id: params.lookalikeId });
  if (customAudiences.length > 0) {
    targeting.custom_audiences = customAudiences;
  }

  if (params.interessesIds && params.interessesIds.length > 0) {
    targeting.flexible_spec = [
      { interests: params.interessesIds.map((id) => ({ id })) },
    ];
  }

  const url = new URL(`${GRAPH}/act_${params.adAccountId}/adsets`);
  url.searchParams.set("name", params.nome);
  url.searchParams.set("campaign_id", params.campaignId);
  url.searchParams.set("daily_budget", params.budgetDiarioCentavos.toString());
  url.searchParams.set("billing_event", mapping.billing_event);
  url.searchParams.set("optimization_goal", mapping.optimization_goal);
  if (mapping.destination_type) {
    url.searchParams.set("destination_type", mapping.destination_type);
  }
  url.searchParams.set("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
  url.searchParams.set("targeting", JSON.stringify(targeting));
  url.searchParams.set("status", "PAUSED");
  if (params.dataInicio) url.searchParams.set("start_time", params.dataInicio);
  if (params.dataFim) url.searchParams.set("end_time", params.dataFim);
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarAdSet: ${res.status} ${await res.text()}`);
  return res.json();
}

// ============================================================================
// AD (criativo)
// ============================================================================

/**
 * Cria o creative + ad final. Usa link_data (single image/link). Quando há
 * mídia (urlImagemOuVideo) é passada como picture do link_data.
 */
export async function criarAd(params: {
  adSetId: string;
  adAccountId: string;
  accessToken: string;
  paginaId: string;
  nome: string;
  headline: string;
  primaryText: string;
  description: string;
  urlDestino: string;
  urlImagemOuVideo?: string;
  instagramAccountId?: string;
}): Promise<{ id: string; creativoId: string }> {
  // 1. Criar o creative
  const linkData: Record<string, unknown> = {
    message: params.primaryText,
    link: params.urlDestino,
    name: params.headline,
    description: params.description,
  };
  if (params.urlImagemOuVideo) linkData.picture = params.urlImagemOuVideo;

  const objectStorySpec: Record<string, unknown> = {
    page_id: params.paginaId,
    link_data: linkData,
  };
  if (params.instagramAccountId) {
    objectStorySpec.instagram_actor_id = params.instagramAccountId;
  }

  const creativeUrl = new URL(`${GRAPH}/act_${params.adAccountId}/adcreatives`);
  creativeUrl.searchParams.set("name", `Creative ${params.nome}`);
  creativeUrl.searchParams.set("object_story_spec", JSON.stringify(objectStorySpec));
  creativeUrl.searchParams.set("access_token", params.accessToken);

  const creativeRes = await fetch(creativeUrl, { method: "POST" });
  if (!creativeRes.ok) {
    throw new Error(`criarAd/creative: ${creativeRes.status} ${await creativeRes.text()}`);
  }
  const creative = (await creativeRes.json()) as { id: string };

  // 2. Criar o ad apontando pro creative (PAUSED)
  const adUrl = new URL(`${GRAPH}/act_${params.adAccountId}/ads`);
  adUrl.searchParams.set("name", params.nome);
  adUrl.searchParams.set("adset_id", params.adSetId);
  adUrl.searchParams.set("creative", JSON.stringify({ creative_id: creative.id }));
  adUrl.searchParams.set("status", "PAUSED");
  adUrl.searchParams.set("access_token", params.accessToken);

  const adRes = await fetch(adUrl, { method: "POST" });
  if (!adRes.ok) throw new Error(`criarAd/ad: ${adRes.status} ${await adRes.text()}`);
  const ad = (await adRes.json()) as { id: string };

  return { id: ad.id, creativoId: creative.id };
}

// ============================================================================
// GESTÃO
// ============================================================================

/** Atualiza o budget diário de uma campanha (centavos). */
export async function atualizarBudgetCampanha(params: {
  campaignId: string;
  accessToken: string;
  novoBudgetDiarioCentavos: number;
}): Promise<void> {
  const url = new URL(`${GRAPH}/${params.campaignId}`);
  url.searchParams.set("daily_budget", params.novoBudgetDiarioCentavos.toString());
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`atualizarBudgetCampanha: ${res.status} ${await res.text()}`);
}

/** Ativa (status ACTIVE) uma entidade Meta genérica por id (campaign/adset/ad). */
export async function ativarEntidadeMeta(params: {
  entityId: string;
  accessToken: string;
}): Promise<void> {
  const url = new URL(`${GRAPH}/${params.entityId}`);
  url.searchParams.set("status", "ACTIVE");
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`ativarEntidadeMeta: ${res.status} ${await res.text()}`);
}

/** Deleta uma entidade Meta por id (usado no rollback do lançamento). */
export async function deletarEntidadeMeta(params: {
  entityId: string;
  accessToken: string;
}): Promise<void> {
  const url = new URL(`${GRAPH}/${params.entityId}`);
  url.searchParams.set("access_token", params.accessToken);
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`deletarEntidadeMeta: ${res.status}`);
}
