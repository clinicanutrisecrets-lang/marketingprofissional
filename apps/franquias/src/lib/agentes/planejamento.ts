import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

export type TipoPlanejamento =
  | "skill_2_mecanismo_unico"
  | "skill_3_posicionamento_oferta"
  | "skill_5_funil_organico";

const SYSTEM_BASE = `
Você é estrategista sênior de marketing direto para nicho de saúde premium (nutrição clínica, medicina funcional, nutrigenética). Domina copywriting, posicionamento, funil orgânico, criação de mecanismos únicos de oferta.

Trabalha com profissionais brasileiros de ticket premium (R$ 500 - R$ 3.000 por atendimento) que vendem consultas + testes laboratoriais.

Regras duras:
- Compliance CFN quando for nutri: zero promessa de cura, zero antes/depois com prazo, zero linguagem milagreira.
- Estratégia brutalmente honesta, específica, defensável em conteúdo e em anúncio.
- Sem copiar fórmulas genéricas de infoproduto hustle — o público premium de saúde lê isso e foge.
- Priorize mecanismos que criam PERCEPÇÃO DE VALOR baseada em ciência, diagnóstico e personalização.

Saída: APENAS JSON válido.
`.trim();

const SCHEMAS: Record<TipoPlanejamento, string> = {
  skill_2_mecanismo_unico: `
Input: { produto, publico, dor_principal, promessa, diferenciais, objecoes, concorrentes }.

Output JSON:
{
  "mecanismos": [
    {
      "ordem": 1,
      "nome": "nome forte e vendável do mecanismo (2-4 palavras, tipo marca)",
      "logica": "explicação da mecânica em 2-3 frases",
      "por_que_parece_novo": "o que o diferencia das ofertas comuns do mercado",
      "como_aumenta_valor_percebido": "texto",
      "qual_objecao_quebra": "objeção específica que derruba",
      "facilidade_comunicar": "alto | medio | baixo",
      "defensibilidade": "alto | medio | baixo"
    }
  ],
  "top_3": [1, 5, 9],
  "justificativa_top_3": "por que esses 3 são os mais promissores"
}

SEMPRE exatamente 10 mecanismos. top_3 com os 3 índices vencedores.
`.trim(),

  skill_3_posicionamento_oferta: `
Input: { produto, preco, publico, transformacao_prometida, provas, objecoes, concorrentes, formato_entrega }.

Output JSON:
{
  "novo_posicionamento": "parágrafo — como esse produto deve ser percebido",
  "promessa_principal": "frase única",
  "promessa_secundaria": "frase complementar",
  "angulo_central_venda": "o eixo narrativo que amarra tudo",
  "inimigo_comum": "o que o público e a nutri combatem juntos",
  "diferenciacao_real": "o que realmente separa dessa concorrência",
  "bullets_valor": ["7-10 bullets curtos que martelam valor"],
  "stack_oferta": ["o que o cliente leva (com e sem precificar)"],
  "bonus_ideais": ["3-5 bônus que elevam o percebido sem virar tchotchke"],
  "garantia_sugerida": "garantia defensável (saúde tem limite — evitar 'ou devolvo em 30d')",
  "urgencia_justificavel": "razão real pra agir agora (agenda, vaga, janela)",
  "headlines": ["5 versões de headline prontas pra hero/ad/landing"]
}
`.trim(),

  skill_5_funil_organico: `
Input: { produto, publico, ticket, consciencia_audiencia, tipo_conteudo_atual, tempo_disponivel_semanal, canal_principal }.

Output JSON:
{
  "estrutura_funil": "parágrafo descrevendo o arco de atenção → interesse → desejo → ação",
  "conteudo_topo": [{"formato": "reels|carrossel|post", "angulo": "texto", "frequencia_semanal": 2}],
  "conteudo_meio": [{"formato": "texto", "angulo": "texto", "frequencia_semanal": 1}],
  "conteudo_fundo": [{"formato": "texto", "angulo": "texto", "frequencia_semanal": 1}],
  "iscas_digitais": [{"nome": "ideia de isca", "formato": "pdf|quiz|checklist", "publico_alvo": "texto"}],
  "cta_ideal": "qual CTA priorizar (ex: 'falar com a Sofia no WhatsApp')",
  "estrategia_comentario_dm": "texto — quando e como responder",
  "sequencia_aquecimento": ["dia 1-X: posts de aquecimento descritos"],
  "sequencia_oferta": ["dia 1-Y: pico de oferta"],
  "calendario_semanal_simples": {
    "segunda": "",
    "terca": "",
    "quarta": "",
    "quinta": "",
    "sexta": "",
    "sabado": "",
    "domingo": ""
  },
  "metricas_acompanhar": [{"metrica": "texto", "meta": "texto", "onde_ver": "texto"}]
}
`.trim(),
};

export type ExecutarInput = {
  franqueadaId: string;
  tipo: TipoPlanejamento;
  input: Record<string, unknown>;
};

export type ExecutarResult = {
  ok: boolean;
  planejamentoId?: string;
  output?: Record<string, unknown>;
  erro?: string;
};

export async function executarPlanejamento(
  params: ExecutarInput,
): Promise<ExecutarResult> {
  const admin = createAdminClient();

  const { data: f } = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal, publico_alvo_descricao, diferenciais, tom_comunicacao, valor_consulta_inicial, palavras_evitar")
    .eq("id", params.franqueadaId)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const systemText = `${SYSTEM_BASE}\n\n=== CONTEXTO NUTRI ===\n${JSON.stringify(f, null, 2)}\n\n=== TIPO: ${params.tipo} ===\n${SCHEMAS[params.tipo]}`;
  const userMsg = `Input:\n${JSON.stringify(params.input, null, 2)}\n\nEntregue JSON conforme schema.`;

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
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

  const latencia = Date.now() - inicio;

  let parsed: Record<string, unknown>;
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

  const custoUsd =
    (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  const vigenteAte = new Date();
  vigenteAte.setMonth(vigenteAte.getMonth() + 3);

  const { data: salvo, error: saveErr } = await admin
    .from("planejamentos_estrategicos")
    .insert({
      franqueada_id: params.franqueadaId,
      tipo: params.tipo,
      input: params.input,
      output: parsed,
      ia_modelo: MODEL,
      ia_tokens_input: usage.input_tokens,
      ia_tokens_output: usage.output_tokens,
      ia_tokens_cached: usage.cache_read_input_tokens ?? 0,
      ia_custo_usd: custoUsd,
      latencia_ms: latencia,
      status: "novo",
      vigente_ate: vigenteAte.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (saveErr) return { ok: false, erro: saveErr.message };

  return {
    ok: true,
    planejamentoId: (salvo as { id: string }).id,
    output: parsed,
  };
}
