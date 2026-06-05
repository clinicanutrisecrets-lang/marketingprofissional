import "server-only";
import { createClaude, CLAUDE_MODEL } from "@/lib/claude/client";
import { createAdminClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/security/encrypt";
import { pausarCampanha, atualizarBudgetCampanha } from "@/lib/meta/ads";
import { ICP_TICKET_ALTO_NUTRI_PREMIUM } from "./_icp";

function tokenDecrypt(raw: string): string {
  try {
    return decrypt(raw);
  } catch {
    return raw;
  }
}
import {
  FRAMEWORK_PEDRO_SOBRAL,
  FRAMEWORK_MOLLY_PITTMAN,
  FRAMEWORK_DEPESH_MANDALIA,
  COMPLIANCE_CFN_2026_RESUMO,
} from "./_frameworks";

type Anuncio = {
  id: string;
  nome: string;
  status: string;
  objetivo_negocio: string | null;
  budget_diario: number | null;
  gasto_total: number | null;
  impressoes: number | null;
  cliques: number | null;
  ctr: number | null;
  cpm: number | null;
  cpl: number | null;
  leads: number | null;
  frequency: number | null;
  data_inicio: string | null;
  meta_campaign_id: string | null;
};

type Recomendacao = {
  prioridade: "alta" | "media" | "baixa";
  acao: string;
  campanha: string;
  justificativa: string;
  impacto_estimado: string;
};

type Alerta = {
  tipo: "cpl_alto" | "frequency_alta" | "ctr_baixo" | "gasto_sem_resultado" | "outro";
  mensagem: string;
  campanha: string;
};

type Revisao = {
  status_geral: "excelente" | "bom" | "mediano" | "preocupante" | "critico" | "sem_dados";
  resumo_executivo: string;
  recomendacoes: Recomendacao[];
  alertas: Alerta[];
};

const SYSTEM_PROMPT = `Voce e gestor de trafego senior especializado em saude no Brasil — nicho de nutricao clinica, medicina funcional, nutrigenetica. Anos de experiencia analisando campanhas Meta Ads pra atrair pacientes de TICKET ALTO (R$ 4.000-7.000 anuais).

Use os frameworks abaixo (Pedro Sobral, Molly Pittman, Depesh Mandalia) como base mental pra suas analises e recomendacoes.

${ICP_TICKET_ALTO_NUTRI_PREMIUM}

${FRAMEWORK_PEDRO_SOBRAL}

${FRAMEWORK_MOLLY_PITTMAN}

${FRAMEWORK_DEPESH_MANDALIA}

${COMPLIANCE_CFN_2026_RESUMO}

REGRAS DE RECOMENDACAO LIGADAS AO CODIGO DE ETICA:
- NUNCA recomendar criar criativo com antes/depois, balanca, medida, exame
- NUNCA recomendar criativo com IA simulando paciente ou resultado clinico
- NUNCA recomendar associar a marca de alimento/bebida/suplemento/fitoterapico
- Se identificar criativo ja ativo violando essas regras, ALERTAR como "alerta_compliance" prioridade ALTA — agir imediatamente

VOCE RECEBE:
- Periodo analisado (datas)
- Lista de campanhas ativas com metricas dos ultimos 7 dias
- Benchmarks de mercado pra comparacao

VOCE DEVE:
1. Atribuir um STATUS GERAL pro conjunto: excelente | bom | mediano | preocupante | critico | sem_dados
2. Escrever resumo executivo de 2-4 frases (linguagem direta, sem jargao excessivo)
3. Entregar ate 5 RECOMENDACOES priorizadas (alta > media > baixa)
4. Levantar ALERTAS quando algo merece atencao imediata

REGRAS DE ANALISE:
- CPL > 1.8x do benchmark = preocupante; > 2.5x = critico
- Frequency > 2.5 em <7 dias = saturacao, sugerir trocar criativo
- CTR < 0.8% = criativo fraco
- Gasto > R$ 200 sem nenhum lead em 5+ dias = pausar
- Frequency 1.5-2.0 com CPL bom = escalar (+20-30% budget)
- Campanha < 3 dias rodando = "aguardar mais dados", nao agir ainda

FORMATO RECOMENDACAO:
- prioridade: "alta" | "media" | "baixa"
- acao: comando direto e ESPECIFICO ("pausar campanha X", "aumentar budget de Y em 25%", "trocar criativo da Z")
- campanha: nome da campanha
- justificativa: 1 frase com numeros
- impacto_estimado: o que esperar ("reduz desperdicio em ~R$ 50/dia", "potencializa CPL atual de R$ 12")

FORMATO ALERTA:
- tipo: "cpl_alto" | "frequency_alta" | "ctr_baixo" | "gasto_sem_resultado" | "outro"
- mensagem: 1 frase clara
- campanha: nome da campanha

Devolva APENAS JSON valido no schema:
{
  "status_geral": "...",
  "resumo_executivo": "...",
  "recomendacoes": [...],
  "alertas": [...]
}`;

/**
 * Revisa as campanhas Meta Ads ativas de UMA franqueada e gera recomendacoes IA.
 * Salva em franqueadas_revisoes_ads + retorna o registro pra dispatch de email.
 */
export async function revisarAdsFranqueada(params: {
  franqueadaId: string;
}): Promise<{
  ok: boolean;
  revisaoId?: string;
  pulada?: boolean;
  motivo?: string;
  custoUsd?: number;
  erro?: string;
}> {
  try {
    const admin = createAdminClient();

    const { data: anunciosData } = await admin
      .from("anuncios")
      .select(
        "id, nome, status, objetivo_negocio, budget_diario, gasto_total, impressoes, cliques, ctr, cpm, cpl, leads, frequency, data_inicio, meta_campaign_id",
      )
      .eq("franqueada_id", params.franqueadaId)
      .in("status", ["ativo", "pausado"])
      .not("meta_campaign_id", "is", null);

    const anuncios = (anunciosData ?? []) as Anuncio[];
    if (anuncios.length === 0) {
      return { ok: true, pulada: true, motivo: "sem campanhas ativas" };
    }

    // Periodo: ultimos 7 dias
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    const periodoInicio = inicio.toISOString().slice(0, 10);
    const periodoFim = fim.toISOString().slice(0, 10);

    // Evita rodar 2x na mesma janela (idempotencia)
    const { data: jaExiste } = await admin
      .from("franqueadas_revisoes_ads")
      .select("id")
      .eq("franqueada_id", params.franqueadaId)
      .eq("periodo_inicio", periodoInicio)
      .maybeSingle();

    if (jaExiste) {
      return {
        ok: true,
        pulada: true,
        motivo: `revisao ${periodoInicio} ja existe`,
        revisaoId: (jaExiste as { id: string }).id,
      };
    }

    // Snapshot agregado
    const gastoTotal = sum(anuncios.map((a) => a.gasto_total ?? 0));
    const leadsTotais = sum(anuncios.map((a) => a.leads ?? 0));
    const cplMedio = leadsTotais > 0 ? gastoTotal / leadsTotais : null;

    // Pega benchmarks do nicho da franqueada
    const { data: franqData } = await admin
      .from("franqueadas")
      .select("nome_completo, nome_comercial, nicho_principal")
      .eq("id", params.franqueadaId)
      .maybeSingle();
    const franq = franqData as {
      nome_completo: string;
      nome_comercial: string | null;
      nicho_principal: string | null;
    } | null;
    const nicho = franq?.nicho_principal ?? "nutricao_funcional";

    const { data: benchmarks } = await admin
      .from("benchmarks_mercado")
      .select("metrica, valor_referencia, descricao")
      .eq("nicho", nicho);
    const benchTexto =
      (benchmarks ?? [])
        .map(
          (b) =>
            `  - ${(b as { metrica: string }).metrica}: ${(b as { valor_referencia: number }).valor_referencia} (${(b as { descricao: string }).descricao})`,
        )
        .join("\n") || "  (sem benchmarks cadastrados pra esse nicho)";

    // Monta input do Claude
    const userPrompt = montarUserPrompt({
      franqueadaNome: franq?.nome_comercial ?? franq?.nome_completo ?? "Nutri",
      nicho,
      anuncios,
      benchTexto,
      periodoInicio,
      periodoFim,
    });

    const claude = createClaude();
    const resp = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 3500,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ] as never,
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = resp.content
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { type: string; text?: string }) => c.text ?? "")
      .join("\n");

    const revisao = parseRevisao(texto);
    if (!revisao) {
      return { ok: false, erro: "Claude nao retornou JSON valido" };
    }

    const custoUsd =
      (resp.usage.input_tokens / 1_000_000) * 3 +
      (resp.usage.output_tokens / 1_000_000) * 15;

    const { data: inserted, error } = await admin
      .from("franqueadas_revisoes_ads")
      .insert({
        franqueada_id: params.franqueadaId,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        campanhas_analisadas: anuncios.length,
        gasto_total: gastoTotal,
        leads_totais: leadsTotais,
        cpl_medio: cplMedio,
        status_geral: revisao.status_geral,
        resumo_executivo: revisao.resumo_executivo,
        recomendacoes: revisao.recomendacoes,
        alertas: revisao.alertas,
        ia_model_usado: CLAUDE_MODEL,
        ia_tokens_input: resp.usage.input_tokens,
        ia_tokens_output: resp.usage.output_tokens,
        ia_custo_usd: custoUsd,
      })
      .select("id")
      .single();

    if (error) return { ok: false, erro: `Insert: ${error.message}` };

    // ===== AUTO-EXECUÇÃO DE RECOMENDAÇÕES DE PRIORIDADE ALTA =====
    await autoExecutarRecomendacoes({
      franqueadaId: params.franqueadaId,
      recomendacoes: revisao.recomendacoes,
      anuncios,
    });

    return { ok: true, revisaoId: (inserted as { id: string }).id, custoUsd };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

// ============== HELPERS ==============

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + (b ?? 0), 0);
}

/**
 * Pausa automática + ajuste de budget sem confirmação humana, conforme as
 * recomendações de prioridade ALTA do revisor. Pausa quando a ação menciona
 * "pausar"; aumenta budget (respeitando budget_diario_maximo) quando menciona
 * "aumentar budget". Tudo logado em ads_audit_log com ator='agente_revisor_ia'.
 */
async function autoExecutarRecomendacoes(params: {
  franqueadaId: string;
  recomendacoes: Recomendacao[];
  anuncios: Anuncio[];
}): Promise<void> {
  const altas = params.recomendacoes.filter((r) => r.prioridade === "alta");
  if (altas.length === 0) return;

  const admin = createAdminClient();

  const { data: franqData } = await admin
    .from("franqueadas")
    .select("meta_ads_access_token, budget_diario_maximo")
    .eq("id", params.franqueadaId)
    .maybeSingle();
  const franq = franqData as {
    meta_ads_access_token: string | null;
    budget_diario_maximo: number | null;
  } | null;
  if (!franq?.meta_ads_access_token) return;
  const accessToken = tokenDecrypt(franq.meta_ads_access_token);

  // mapeia nome da campanha -> anuncio (com meta_campaign_id)
  const porNome = new Map<string, Anuncio>();
  for (const a of params.anuncios) {
    porNome.set(a.nome.trim().toLowerCase(), a);
  }

  function acharAnuncio(nomeCampanha: string): Anuncio | undefined {
    const alvo = (nomeCampanha ?? "").trim().toLowerCase();
    if (porNome.has(alvo)) return porNome.get(alvo);
    // fallback: match parcial
    for (const [nome, a] of porNome) {
      if (alvo && (nome.includes(alvo) || alvo.includes(nome))) return a;
    }
    return undefined;
  }

  for (const rec of altas) {
    const acao = (rec.acao ?? "").toLowerCase();
    const anuncio = acharAnuncio(rec.campanha);
    if (!anuncio?.meta_campaign_id) continue;

    try {
      if (acao.includes("pausar")) {
        await pausarCampanha({ campaignId: anuncio.meta_campaign_id, accessToken });
        await admin
          .from("anuncios")
          .update({
            status: "pausado_por_performance_ruim",
            pausado_automaticamente: true,
            motivo_pausa: rec.justificativa,
            pausado_em: new Date().toISOString(),
          })
          .eq("id", anuncio.id);

        await admin.from("ads_audit_log").insert({
          franqueada_id: params.franqueadaId,
          anuncio_id: anuncio.id,
          ator: "agente_revisor_ia",
          acao: "pausa_auto_performance",
          meta_campaign_id: anuncio.meta_campaign_id,
          estado_antes: { status: anuncio.status },
          estado_depois: { status: "pausado_por_performance_ruim" },
          motivo: rec.justificativa,
          detalhes: { recomendacao: rec },
        });
      } else if (acao.includes("aumentar budget") || acao.includes("aumentar o budget")) {
        // extrai % de aumento da ação (default 25%)
        const m = acao.match(/(\d+)\s*%/);
        const pct = m ? Number(m[1]) : 25;
        const atual = anuncio.budget_diario ?? 0;
        const novo = atual * (1 + pct / 100);
        const capDiario = franq.budget_diario_maximo ?? Infinity;

        if (atual > 0 && novo <= capDiario) {
          await atualizarBudgetCampanha({
            campaignId: anuncio.meta_campaign_id,
            accessToken,
            novoBudgetDiarioCentavos: Math.round(novo * 100),
          });
          await admin
            .from("anuncios")
            .update({ budget_diario: novo })
            .eq("id", anuncio.id);

          await admin.from("ads_audit_log").insert({
            franqueada_id: params.franqueadaId,
            anuncio_id: anuncio.id,
            ator: "agente_revisor_ia",
            acao: "ajustar_budget_auto",
            meta_campaign_id: anuncio.meta_campaign_id,
            estado_antes: { budget_diario: atual },
            estado_depois: { budget_diario: novo },
            motivo: rec.justificativa,
            detalhes: { pct, recomendacao: rec },
          });
        } else {
          // ultrapassaria o cap — não executa, só registra
          await admin.from("ads_audit_log").insert({
            franqueada_id: params.franqueadaId,
            anuncio_id: anuncio.id,
            ator: "agente_revisor_ia",
            acao: "ajustar_budget_bloqueado_cap",
            meta_campaign_id: anuncio.meta_campaign_id,
            motivo: `Aumento sugerido (R$${novo.toFixed(2)}) ultrapassaria budget_diario_maximo (R$${capDiario === Infinity ? "∞" : capDiario.toFixed(2)})`,
            detalhes: { pct, atual, novo, capDiario: franq.budget_diario_maximo },
          });
        }
      }
    } catch (e) {
      await admin.from("ads_audit_log").insert({
        franqueada_id: params.franqueadaId,
        anuncio_id: anuncio.id,
        ator: "agente_revisor_ia",
        acao: "auto_execucao_falhou",
        meta_campaign_id: anuncio.meta_campaign_id,
        motivo: e instanceof Error ? e.message : String(e),
        detalhes: { recomendacao: rec },
      });
    }
  }
}

function montarUserPrompt(params: {
  franqueadaNome: string;
  nicho: string;
  anuncios: Anuncio[];
  benchTexto: string;
  periodoInicio: string;
  periodoFim: string;
}): string {
  const tabela = params.anuncios
    .map(
      (a) => `
- ${a.nome} [${a.status}]
  objetivo: ${a.objetivo_negocio ?? "?"} · iniciada: ${a.data_inicio ?? "?"}
  budget diario: R$ ${a.budget_diario?.toFixed(2) ?? "?"} · gasto total: R$ ${a.gasto_total?.toFixed(2) ?? "0"}
  impressoes: ${a.impressoes ?? 0} · cliques: ${a.cliques ?? 0} · CTR: ${a.ctr?.toFixed(2) ?? "?"}%
  CPM: R$ ${a.cpm?.toFixed(2) ?? "?"} · frequency: ${a.frequency?.toFixed(2) ?? "?"}
  leads: ${a.leads ?? 0} · CPL: R$ ${a.cpl?.toFixed(2) ?? "?"}`,
    )
    .join("\n");

  return `Franqueada: ${params.franqueadaNome}
Nicho: ${params.nicho}
Periodo analisado: ${params.periodoInicio} a ${params.periodoFim} (ultimos 7 dias)

CAMPANHAS ATIVAS/PAUSADAS:
${tabela}

BENCHMARKS DE MERCADO (${params.nicho}):
${params.benchTexto}

Faca a analise e devolva o JSON conforme schema do system prompt.`;
}

function parseRevisao(texto: string): Revisao | null {
  try {
    const limpo = texto
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const match = limpo.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as Revisao;
  } catch {
    return null;
  }
}
