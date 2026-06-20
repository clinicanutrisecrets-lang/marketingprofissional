"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  MAPEAMENTO_META,
  pausarCampanha,
  reativarCampanha,
  type ObjetivoNegocio,
} from "@/lib/meta/ads";
import { decrypt } from "@/lib/security/encrypt";
import { gerarCopyAnuncio } from "@/lib/agentes/ads";
import { agendarEmail } from "@/lib/emails/queue";
import { emailCriativoProntoParaAprovacao } from "@/lib/emails/templates";

function tokenDecrypt(raw: string): string {
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}

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
  video_url?: string;
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
      video_url: params.video_url,
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
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("meta_campaign_id")
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId)
    .maybeSingle();

  const campaignId = (anuncio as { meta_campaign_id: string | null } | null)?.meta_campaign_id;

  // Chama a Meta API antes de tocar o DB (se houver campanha real)
  if (campaignId) {
    const { data: franq } = await supabase
      .from("franqueadas")
      .select("meta_ads_access_token")
      .eq("id", franqueadaId)
      .maybeSingle();
    const tokenRaw = (franq as { meta_ads_access_token: string | null } | null)
      ?.meta_ads_access_token;
    if (tokenRaw) {
      try {
        await pausarCampanha({ campaignId, accessToken: tokenDecrypt(tokenRaw) });
      } catch (e) {
        return { ok: false, erro: `Falha ao pausar na Meta: ${(e as Error).message}` };
      }
    }
  }

  const { error } = await supabase
    .from("anuncios")
    .update({ status: "pausado_pela_nutri", pausado_em: new Date().toISOString() })
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId);

  if (error) return { ok: false, erro: error.message };

  await createAdminClient().from("ads_audit_log").insert({
    franqueada_id: franqueadaId,
    anuncio_id: anuncioId,
    ator: "nutri",
    acao: "pausar",
    meta_campaign_id: campaignId ?? null,
    estado_depois: { status: "pausado_pela_nutri" },
    motivo: "Pausa manual pela nutri",
  });

  revalidatePath("/dashboard/anuncios");
  return { ok: true };
}

export async function reativarAnuncio(anuncioId: string): Promise<{ ok: boolean; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("meta_campaign_id")
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId)
    .maybeSingle();

  const campaignId = (anuncio as { meta_campaign_id: string | null } | null)?.meta_campaign_id;

  if (campaignId) {
    const { data: franq } = await supabase
      .from("franqueadas")
      .select("meta_ads_access_token")
      .eq("id", franqueadaId)
      .maybeSingle();
    const tokenRaw = (franq as { meta_ads_access_token: string | null } | null)
      ?.meta_ads_access_token;
    if (tokenRaw) {
      try {
        await reativarCampanha({ campaignId, accessToken: tokenDecrypt(tokenRaw) });
      } catch (e) {
        return { ok: false, erro: `Falha ao reativar na Meta: ${(e as Error).message}` };
      }
    }
  }

  const { error } = await supabase
    .from("anuncios")
    .update({ status: "ativo", pausado_automaticamente: false, motivo_pausa: null })
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId);

  if (error) return { ok: false, erro: error.message };

  await createAdminClient().from("ads_audit_log").insert({
    franqueada_id: franqueadaId,
    anuncio_id: anuncioId,
    ator: "nutri",
    acao: "reativar",
    meta_campaign_id: campaignId ?? null,
    estado_depois: { status: "ativo" },
    motivo: "Reativação manual pela nutri",
  });

  revalidatePath("/dashboard/anuncios");
  return { ok: true };
}

/**
 * Gera os 3 criativos com Claude, persiste variacoes + publico_meta_json no anúncio
 * e marca como aguardando_aprovacao. Dispara email avisando a nutri.
 */
export async function gerarCriativos(briefing: {
  anuncioId?: string;
  objetivo_negocio: ObjetivoNegocio;
  dor_principal: string;
  tema_ou_hook?: string;
  publico_alvo?: string;
  budget_diario?: number;
  mecanismo_unico?: string;
  posicionamento?: string;
  depoimento_referencia?: string;
}): Promise<{ ok: boolean; anuncioId?: string; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const result = await gerarCopyAnuncio({
    franqueadaId,
    briefing: {
      objetivo_negocio: briefing.objetivo_negocio,
      dor_principal: briefing.dor_principal,
      tema_ou_hook: briefing.tema_ou_hook,
      publico_alvo: briefing.publico_alvo,
      budget_diario: briefing.budget_diario,
      mecanismo_unico: briefing.mecanismo_unico,
      posicionamento: briefing.posicionamento,
      depoimento_referencia: briefing.depoimento_referencia,
    },
  });

  if (!result.ok || !result.output) {
    return { ok: false, erro: result.erro ?? "Falha ao gerar criativos" };
  }

  const admin = createAdminClient();
  const variacoes = result.output.variacoes.map((v) => ({
    letra: v.letra,
    angulo: v.angulo,
    headline: v.headline,
    primary_text: v.primary_text,
    description: v.description,
    justificativa: v.justificativa,
    compliance_ok: v.compliance_ok,
  }));

  let anuncioId = briefing.anuncioId;

  if (anuncioId) {
    const { error } = await admin
      .from("anuncios")
      .update({
        variacoes,
        publico_meta_json: result.output.publico_sugerido,
        status: "aguardando_aprovacao",
      })
      .eq("id", anuncioId)
      .eq("franqueada_id", franqueadaId);
    if (error) return { ok: false, erro: error.message };
  } else {
    const { data, error } = await admin
      .from("anuncios")
      .insert({
        franqueada_id: franqueadaId,
        nome: briefing.tema_ou_hook ?? "Campanha automática",
        objetivo_negocio: briefing.objetivo_negocio,
        meta_objective: MAPEAMENTO_META[briefing.objetivo_negocio].campaign_objective,
        meta_optimization: MAPEAMENTO_META[briefing.objetivo_negocio].optimization_goal,
        meta_destination: MAPEAMENTO_META[briefing.objetivo_negocio].destination_type,
        budget_diario: briefing.budget_diario,
        variacoes,
        publico_meta_json: result.output.publico_sugerido,
        status: "aguardando_aprovacao",
      })
      .select("id")
      .single();
    if (error) return { ok: false, erro: error.message };
    anuncioId = (data as { id: string }).id;
  }

  // Email avisando que os criativos estão prontos pra aprovar
  const { data: franq } = await admin
    .from("franqueadas")
    .select("nome_completo, nome_comercial, email")
    .eq("id", franqueadaId)
    .maybeSingle();
  const f = franq as { nome_completo: string; nome_comercial: string | null; email: string | null } | null;
  if (f?.email) {
    const tpl = emailCriativoProntoParaAprovacao({
      nome: f.nome_comercial ?? f.nome_completo ?? "Nutri",
      qtdVariacoes: variacoes.length,
      anguloCampanha: result.output.angulo_central_campanha,
      linkAprovar: `https://app.scannerdasaude.com/dashboard/anuncios/${anuncioId}`,
    });
    await agendarEmail({
      franqueadaId,
      tipo: "criativo_pronto_aprovacao",
      toEmail: f.email,
      subject: tpl.assunto,
      html: tpl.html,
    });
  }

  revalidatePath("/dashboard/anuncios");
  return { ok: true, anuncioId };
}

/**
 * Nutri aprova uma das variações. Marca o anúncio como criativo_aprovado pra que
 * o cron criar-campanhas faça o lançamento automático.
 */
export async function aprovarCriativo(
  anuncioId: string,
  variacaoIdx: number,
): Promise<{ ok: boolean; erro?: string }> {
  const franqueadaId = await getFranqueadaDoUser();
  if (!franqueadaId) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("anuncios")
    .update({
      variacao_vencedora: variacaoIdx,
      status: "criativo_aprovado",
      criativo_aprovado_em: new Date().toISOString(),
    })
    .eq("id", anuncioId)
    .eq("franqueada_id", franqueadaId);

  if (error) return { ok: false, erro: error.message };

  await createAdminClient().from("ads_audit_log").insert({
    franqueada_id: franqueadaId,
    anuncio_id: anuncioId,
    ator: "nutri",
    acao: "aprovar_criativo",
    estado_depois: { status: "criativo_aprovado", variacao_vencedora: variacaoIdx },
    motivo: "Nutri aprovou criativo — fila de lançamento automático",
  });

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
