/**
 * Meta Ads — wrapper sobre Marketing API.
 *
 * Abstrai objetivos técnicos em "objetivos de negócio" amigáveis
 * (ganhar seguidores, receber mensagens, vender teste, etc)
 * e traduz automaticamente pra objective + optimization_goal da Meta.
 */

export type ObjetivoNegocio =
  | "ganhar_seguidores"
  | "receber_mensagens"
  | "agendar_consultas"
  | "vender_teste_genetico"
  | "alcance"
  | "trafego_site";

export const MAPEAMENTO_OBJETIVO: Record<
  ObjetivoNegocio,
  {
    label: string;
    descricao: string;
    emoji: string;
    meta_objective: string;
    meta_optimization: string;
    destino_padrao: "whatsapp" | "link_externo" | "formulario" | "perfil";
  }
> = {
  ganhar_seguidores: {
    label: "Ganhar seguidores",
    descricao: "Quero crescer meu perfil no Instagram",
    emoji: "👥",
    meta_objective: "OUTCOME_ENGAGEMENT",
    meta_optimization: "PROFILE_VISIT",
    destino_padrao: "perfil",
  },
  receber_mensagens: {
    label: "Receber mais mensagens",
    descricao: "Quero que pessoas me mandem WhatsApp",
    emoji: "💬",
    meta_objective: "OUTCOME_ENGAGEMENT",
    meta_optimization: "MESSAGES",
    destino_padrao: "whatsapp",
  },
  agendar_consultas: {
    label: "Agendar consultas",
    descricao: "Quero que pessoas agendem consulta comigo",
    emoji: "📅",
    meta_objective: "OUTCOME_LEADS",
    meta_optimization: "LEAD_GENERATION",
    destino_padrao: "formulario",
  },
  vender_teste_genetico: {
    label: "Vender teste genético",
    descricao: "Quero vender o teste e ganhar comissão",
    emoji: "🧬",
    meta_objective: "OUTCOME_SALES",
    meta_optimization: "OFFSITE_CONVERSIONS",
    destino_padrao: "link_externo",
  },
  alcance: {
    label: "Alcance (só visualizações)",
    descricao: "Quero que mais gente veja meu conteúdo",
    emoji: "🎥",
    meta_objective: "OUTCOME_AWARENESS",
    meta_optimization: "REACH",
    destino_padrao: "perfil",
  },
  trafego_site: {
    label: "Levar pessoas pro meu site",
    descricao: "Quero cliques pra landing page",
    emoji: "🌐",
    meta_objective: "OUTCOME_TRAFFIC",
    meta_optimization: "LINK_CLICKS",
    destino_padrao: "link_externo",
  },
};
