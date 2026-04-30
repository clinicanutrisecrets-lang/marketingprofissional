import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { ICP_TICKET_ALTO_NUTRI_PREMIUM, ICP_EXCLUSOES_META, ICP_INTERESSES_META } from "./_icp";
import {
  FRAMEWORK_MOLLY_PITTMAN,
  FRAMEWORK_EUGENE_SCHWARTZ,
  FRAMEWORK_SABRI_SUBY,
  FRAMEWORK_CALPES_HEADLINES,
  FRAMEWORK_CIALDINI_GATILHOS,
} from "./_frameworks";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é performance marketer sênior especializado em saúde no Brasil — nicho de nutrição clínica, medicina funcional, nutrigenética. Anos de experiência trazendo pacientes de TICKET ALTO (R$ 4.000-7.000 em tratamento anual completo) para profissionais liberais via Meta Ads.

Frameworks de copy/oferta (use como base mental pra construir cada variacao):

${FRAMEWORK_EUGENE_SCHWARTZ}

${FRAMEWORK_MOLLY_PITTMAN}

${FRAMEWORK_SABRI_SUBY}

${FRAMEWORK_CALPES_HEADLINES}

${FRAMEWORK_CIALDINI_GATILHOS}

${ICP_TICKET_ALTO_NUTRI_PREMIUM}

ESTRATÉGIA DE SEGMENTAÇÃO META (use isso como base — adaptar por contexto da nutri):

Inclusões obrigatórias:
- Idade 35-52, gênero feminino
- Interesses: ${ICP_INTERESSES_META.interesses_principais.slice(0, 6).join(", ")}, etc
- Comportamentos: ${ICP_INTERESSES_META.comportamentos_principais.slice(0, 2).join(", ")}
- Escolaridade: ensino superior completo / pós-graduação

EXCLUSÕES OBRIGATÓRIAS (critico — sem isso atrai lead errado):
- ${ICP_EXCLUSOES_META.comportamentos_excluir.join("\n- ")}
- ${ICP_EXCLUSOES_META.interesses_excluir.join("\n- ")}

Compliance CFN OBRIGATÓRIO:
- proibido prometer cura
- proibido antes/depois com prazo
- proibido "X kg em Y dias"
- proibido "milagroso", "definitivo", "100% garantido"
- obrigatório sugerir avaliação individualizada

Seu trabalho: entregar 3 variações de copy ANGULARMENTE DIFERENTES (não rearranjo de palavra) + sugestão de público específica + ângulo central.

Variações DEVEM atrair o ICP definido (auto-qualificação) e AFASTAR perfil errado:
- Variação A: ângulo "frustração com nutris anteriores" (pra quem já tentou tudo)
- Variação B: ângulo "curiosidade científica" (pra quem lê e estuda)
- Variação C: ângulo "histórico familiar / preventivo" (pra quem tem medo embasado)

Saída: APENAS JSON válido.

Schema:
{
  "angulo_central_campanha": "parágrafo — eixo narrativo da campanha",
  "icp_target": "resumo curto do ICP que essa campanha busca atrair",
  "variacoes": [
    {
      "letra": "A",
      "angulo": "qual gatilho psicológico explora",
      "headline": "máx 40 chars",
      "primary_text": "máx 125 chars",
      "description": "máx 30 chars",
      "justificativa": "por que essa combinação atrai ICP e afasta perfil errado",
      "compliance_ok": true
    }
  ],
  "publico_sugerido": {
    "idade_min": 35,
    "idade_max": 52,
    "generos": ["mulheres"],
    "localizacao": "cidade/região da nutri + raio sugerido",
    "interesses_meta": ["lista detalhada Meta"],
    "comportamentos_meta": ["lista"],
    "exclusoes": ["lista de exclusões obrigatórias do ICP"],
    "tamanho_estimado": "nicho | broad | lookalike",
    "publico_lookalike_sugerido": "fonte ideal de seed (ex: 'pacientes que compraram pacote anual')"
  },
  "recomendacao_objetivo_meta": "OUTCOME_LEADS | OUTCOME_SALES",
  "recomendacao_destino": "ctwa_whatsapp | sofia_url | lp_nutri | kiwify",
  "alertas_compliance": []
}

Sempre 3 variações. Sempre exclusões na sugestão de público.
`.trim();

export type GerarCopyInput = {
  franqueadaId: string;
  briefing: {
    objetivo_negocio: string;
    publico_alvo?: string;
    dor_principal: string;
    tema_ou_hook?: string;
    budget_diario?: number;
    mecanismo_unico?: string;          // opcional: nome do mecanismo (Skill 2)
    posicionamento?: string;           // opcional: angulo central (Skill 3)
    depoimento_referencia?: string;    // opcional: storytelling (Skill 6)
  };
};

export type CopyVariacao = {
  letra: string;
  angulo: string;
  headline: string;
  primary_text: string;
  description: string;
  justificativa: string;
  compliance_ok: boolean;
};

export type GerarCopyOutput = {
  angulo_central_campanha: string;
  variacoes: CopyVariacao[];
  publico_sugerido: {
    idade_min: number;
    idade_max: number;
    generos: string[];
    localizacao: string;
    interesses_meta: string[];
    comportamentos_meta: string[];
    exclusoes: string[];
    tamanho_estimado: string;
  };
  recomendacao_objetivo_meta: string;
  recomendacao_destino: string;
  alertas_compliance: string[];
};

export type GerarCopyResult = {
  ok: boolean;
  output?: GerarCopyOutput;
  tokensUsados?: number;
  custoUsd?: number;
  latenciaMs?: number;
  erro?: string;
};

export async function gerarCopyAnuncio(
  input: GerarCopyInput,
): Promise<GerarCopyResult> {
  const admin = createAdminClient();

  const { data: f } = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal, publico_alvo_descricao, diferenciais, tom_comunicacao, cidade, estado, valor_consulta_inicial, palavras_chave_usar, palavras_evitar")
    .eq("id", input.franqueadaId)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const userMsg = [
    "=== CONTEXTO DA NUTRI ===",
    JSON.stringify(f, null, 2),
    "",
    "=== BRIEFING DA CAMPANHA ===",
    JSON.stringify(input.briefing, null, 2),
    "",
    "Entregue o JSON conforme schema. 3 variações angularmente diferentes, compliance CFN obrigatório.",
  ].join("\n");

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });
    const block = resp.content[0];
    if (!block || block.type !== "text") return { ok: false, erro: "Resposta inesperada" };
    responseText = block.text;
    usage = {
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      cache_read_input_tokens: resp.usage.cache_read_input_tokens ?? 0,
    };
  } catch (e) {
    return { ok: false, erro: `Claude: ${e instanceof Error ? e.message : String(e)}` };
  }

  const latenciaMs = Date.now() - inicio;

  let parsed: GerarCopyOutput;
  try {
    const jsonLimpo = responseText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonLimpo);
  } catch {
    return { ok: false, erro: `JSON inválido: ${responseText.slice(0, 300)}` };
  }

  // validador anti-CFN: bloqueia palavras proibidas
  const TERMOS_PROIBIDOS = [
    /\bcura\b/i, /\bcurar\b/i, /milagre|milagros/i, /\bdefinitiv/i,
    /100%\s*garantido/i, /emagrec(a|er)\s+\d+\s*kg/i, /\bantes\s*e\s*depois\b/i,
  ];
  for (const v of parsed.variacoes) {
    const tudo = `${v.headline} ${v.primary_text} ${v.description}`;
    for (const t of TERMOS_PROIBIDOS) {
      if (t.test(tudo)) {
        v.compliance_ok = false;
        parsed.alertas_compliance ??= [];
        parsed.alertas_compliance.push(
          `Variação ${v.letra} bloqueada: termo '${t.source}' violaria CFN. Regerar.`,
        );
      }
    }
  }

  const custoUsd =
    (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  return {
    ok: true,
    output: parsed,
    tokensUsados: usage.input_tokens + usage.output_tokens,
    custoUsd,
    latenciaMs,
  };
}
