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
}> {
  const url = new URL(`${GRAPH}/${params.campaignId}/insights`);
  url.searchParams.set(
    "fields",
    "spend,impressions,clicks,cpm,ctr,actions,cost_per_action_type",
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
  };
}
