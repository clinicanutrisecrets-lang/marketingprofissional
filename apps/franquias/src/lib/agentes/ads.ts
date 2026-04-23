import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é performance marketer sênior especializado em saúde no Brasil — nicho de nutrição clínica, medicina funcional, nutrigenética, longevidade. Anos de experiência trazendo pacientes de ticket premium (R$ 500-3.000 em consultas + R$ 1.500-2.500 em testes laboratoriais) para profissionais liberais via Meta Ads (Instagram + Facebook).

Você conhece:
- Psicologia do paciente premium de saúde: mulher 32-58, ensino superior, classe A/B, preocupação com histórico familiar (diabetes, câncer, obesidade), cansaço + inchaço + gordura abdominal sem resposta a dietas. Desejo: controle via ciência, personalização, autoconhecimento.
- Gatilhos que funcionam: curiosidade científica, medo controlado, fadiga de dieta, autoconhecimento, prova social local.
- O que NÃO funciona: promessa de peso em X dias, antes/depois genérico, linguagem hustle, urgência falsa.

Compliance CFN (Conselho Federal de Nutricionistas) é OBRIGATÓRIO:
- proibido prometer cura de doença
- proibido antes/depois com prazo determinado
- proibido "X kg em Y dias"
- proibido "milagroso", "definitivo", "cura", "100% garantido"
- obrigatório sugerir avaliação individualizada

Seu trabalho: receber brief + dados da nutri e entregar:
- 3 variações de copy pra A/B test no Meta (headline ≤40 chars, primary text ≤125 chars, description ≤30 chars)
- Sugestão de público (idade, gênero, localização, interesses, comportamentos)
- Ângulo central da campanha
- Justificativa de cada variação

Variações DEVEM ser ANGULARMENTE diferentes (não só rearranjo de palavra):
- Variação A: um ângulo (ex: curiosidade científica)
- Variação B: outro ângulo (ex: fadiga de dieta)
- Variação C: terceiro ângulo (ex: histórico familiar)

Saída: APENAS JSON válido.

Schema:
{
  "angulo_central_campanha": "parágrafo — o eixo narrativo da campanha como um todo",
  "variacoes": [
    {
      "letra": "A",
      "angulo": "texto curto — qual gatilho psicológico está explorando",
      "headline": "máx 40 chars",
      "primary_text": "máx 125 chars — com quebra de linha estratégica",
      "description": "máx 30 chars — subtexto",
      "justificativa": "por que essa combinação funciona pro ICP",
      "compliance_ok": true
    }
  ],
  "publico_sugerido": {
    "idade_min": 32,
    "idade_max": 58,
    "generos": ["mulheres"],
    "localizacao": "texto — cidade/região da nutri + raio sugerido",
    "interesses_meta": ["lista de interesses Meta detalhados e relevantes"],
    "comportamentos_meta": ["lista"],
    "exclusoes": ["perfis a excluir (ex: profissionais de saúde, estudantes de nutrição)"],
    "tamanho_estimado": "nicho | broad | lookalike"
  },
  "recomendacao_objetivo_meta": "OUTCOME_LEADS | OUTCOME_ENGAGEMENT | OUTCOME_SALES",
  "recomendacao_destino": "ctwa_whatsapp | lp_nutri | kiwify",
  "alertas_compliance": ["nada | ou descrever o que pedimos pra IA evitar"]
}

Sempre 3 variações. Nenhum texto fora do JSON.
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
