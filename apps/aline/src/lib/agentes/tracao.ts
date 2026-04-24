import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";
import { icpParaPerfil, perfilContexto } from "./_icp";

const MODEL = "claude-sonnet-4-5";

export type TipoTracao =
  | "7a_hooks_alta_tracao"
  | "7b_pilares_tracao"
  | "7c_plano_misto"
  | "7d_bio_destaques"
  | "7e_analise_viralidade"
  | "7f_compartilhamento_lateral"
  | "7g_plano_reativacao";

const VOCABULARIO_PROIBIDO = [
  /\bprotocolo\b/i,
  /\bprotocolos\b/i,
  /\bdieta\s+(padrao|pronta|pre-?montada)\b/i,
];

function buildSystemBase(perfilSlug: string, perfilCtx: "B2B_nutris" | "B2C_paciente"): string {
  const icp = icpParaPerfil(perfilSlug);

  return `
Você é estrategista sênior de crescimento ORGÂNICO no Instagram, especializado em saúde premium brasileira.

PERFIL TARGET: ${perfilCtx === "B2B_nutris" ? "@scannerdasaude (B2B — nutricionistas)" : "@nutrisecrets (B2C — paciente final premium)"}

${icp}

**Conteúdo deve AUTO-QUALIFICAR:** linguagem técnica que atrai quem está no nível e afasta quem não entende.

**PRIORIDADE #1: CONTEÚDO COMPARTILHÁVEL.**
Sem budget de ads, crescimento depende de 1 seguidor → N compartilhamentos. Share e save valem mais que like.

Proporção 70% autoridade/conversão + 30% tração.

REGRAS DURAS DE VOCABULÁRIO:
- **PROIBIDO** usar "protocolo" ou "protocolos" — contradiz o diferencial de personalização
- **PROIBIDO** usar "dieta padrão", "dieta pronta", "dieta pré-montada"
- Para @nutrisecrets: use "sinergia", "sinergias nutricionais", "mapa metabólico", "personalização por DNA"
- Para @scannerdasaude: use "detetive da saúde", "investigação clínica", "raciocínio diagnóstico", "causa raiz"

MECÂNICAS DE COMPARTILHAMENTO POR CONTEXTO:

${perfilCtx === "B2B_nutris" ? `
**B2B (Scanner da Saúde — nutri compartilha com nutri):**
- Nutri compartilha no grupo WhatsApp/Telegram profissional quando o conteúdo ESCALA o trabalho dela ou AJUDA a ganhar mais.
- "5 perguntas de anamnese que a faculdade não ensina"
- "O cálculo que eliminou 90% dos erros no meu consultório"
- Polêmica respeitosa com dado ("por que parei de prescrever X")
- Bastidor premium (como conduzir anamnese de R\$ 650)
- Sem compliance CFN restrito (não é paciente final)
` : `
**B2C (Nutri Secrets — mulher compartilha com amiga):**
- Mulher compartilha com amiga quando conteúdo NOMEIA dor específica dela.
- "5 sinais que seu intestino está pedindo ajuda"
- Carrossel-referência ("salva pra quando precisar")
- Stories com enquete "você ou uma amiga vive isso?"
- Histórias qualitativas anonimizadas
- Compliance CFN OBRIGATÓRIO: sem cura, sem antes/depois, sem peso/medida explícitos.
`}

Saída: APENAS JSON válido.
`.trim();
}

const SCHEMAS: Record<TipoTracao, string> = {
  "7a_hooks_alta_tracao": `
Input: { nicho, objetivo_crescimento }
Output JSON:
{
  "hooks": [
    {
      "ordem": 1,
      "texto": "hook 5-12 palavras stop-scroll",
      "formato_ideal": "reels | carrossel | post",
      "emocao_gatilho": "curiosidade | reconhecimento | indignacao | surpresa",
      "score_viralidade": "alto | medio",
      "explicacao": "por que para o scroll",
      "cta_sugerido": "salvar | compartilhar | comentar"
    }
  ]
}
SEMPRE 30 hooks. Varie formato e gatilho.
`.trim(),

  "7b_pilares_tracao": `
Input: { posicionamento_atual, objetivos, ultimos_posts }
Output JSON:
{
  "pilares": [
    {
      "ordem": 1,
      "nome_pilar": "",
      "angulo_central": "",
      "por_que_viraliza": "",
      "formato_campeao": "",
      "frequencia_semanal_sugerida": 2,
      "exemplo_de_post": { "titulo": "", "hook": "", "estrutura_resumo": "" },
      "alinhamento_com_posicionamento": ""
    }
  ],
  "pilares_a_evitar": []
}
3-5 pilares viáveis.
`.trim(),

  "7c_plano_misto": `
Input: { pilares_tracao, pilares_autoridade, dias_post_semana }
Output JSON:
{
  "distribuicao_semanal_ideal": {
    "total_posts_semana": 6,
    "posts_autoridade_conversao_70pct": 4,
    "posts_tracao_30pct": 2
  },
  "calendario_4_semanas": [
    {
      "semana": 1,
      "posts": [
        { "dia": "segunda", "tipo": "", "categoria": "autoridade | tracao", "pilar": "", "hook_sugerido": "" }
      ]
    }
  ],
  "regras_execucao": [],
  "metricas_tracao_a_acompanhar": []
}
4 semanas completas.
`.trim(),

  "7d_bio_destaques": `
Input: { posicionamento, oferta_principal, diferenciais }
Output JSON:
{
  "bio_opcoes": [
    { "ordem": 1, "texto": "max 150 chars", "angulo": "", "converte_para": "follow | lead" }
  ],
  "destaques_sugeridos": [
    {
      "ordem": 1,
      "nome_destaque": "max 15 chars",
      "tema": "",
      "tipo": "isca_de_save | autoridade | prova | servico",
      "sequencia_stories_inicial": []
    }
  ],
  "cta_link_bio": "",
  "foto_perfil_diretrizes": ""
}
3 bios. 4-5 destaques.
`.trim(),

  "7e_analise_viralidade": `
Input: { ultimos_30_posts (com metricas) }
Output JSON:
{
  "top_posts_por_share": [{ "post_ref": "", "por_que_funcionou": "" }],
  "top_posts_por_save": [{ "post_ref": "", "por_que_funcionou": "" }],
  "top_posts_por_follow_conversao": [{ "post_ref": "", "por_que_funcionou": "" }],
  "padroes_que_repetem_bem": [],
  "padroes_que_morreram": [],
  "recomendacoes_praticas": [{ "acao": "", "justificativa": "", "esforco": "baixo|medio|alto" }],
  "alerta_fadiga_criativa": ""
}
`.trim(),

  "7f_compartilhamento_lateral": `
Input: { dor_ou_assunto_especifico, formato_alvo, contexto_compartilhamento }
Output JSON:
{
  "titulo_do_post": "",
  "hook_magnetico": "5-12 palavras",
  "por_que_vao_compartilhar": "",
  "para_quem_sera_compartilhado": "arquetipo do destinatario",
  "estrutura_conteudo": {
    "abertura_3s": "",
    "desenvolvimento_core": "",
    "virada": "",
    "fechamento_compartilhavel": ""
  },
  "copy_legenda": "",
  "cta_compartilhamento_explicito": "",
  "angulo_psicologico": "reconhecimento | utilidade_pratica | indignacao_construtiva | humor_profissional",
  "metricas_esperadas": { "saves_ratio_alvo": "0.15", "shares_ratio_alvo": "0.08", "observacao": "" }
}
`.trim(),

  "7g_plano_reativacao": `
Input: { historico_engajamento, ultimos_posts_fracos, melhor_post_historico }
Output JSON:
{
  "diagnostico_queda": "",
  "dia_1_3_pattern_interrupt": [{ "dia": 1, "acao": "", "descricao": "", "objetivo": "" }],
  "dia_4_7_ressuscitar_audiencia_dormente": [{ "dia": 4, "acao": "", "descricao": "", "objetivo": "" }],
  "dia_8_14_consolidar_novo_ritmo": [{ "dia": 8, "acao": "", "descricao": "", "objetivo": "" }],
  "acoes_diarias_paralelas": [],
  "meta_14_dias": "",
  "post_ancora_recomendado": ""
}
`.trim(),
};

export type InputTracao = {
  perfilSlug: string;
  tipo: TipoTracao;
  input: Record<string, unknown>;
};

export type ResultTracao = {
  ok: boolean;
  tracaoId?: string;
  output?: Record<string, unknown>;
  violacoes?: string[];
  erro?: string;
};

export async function executarTracao(params: InputTracao): Promise<ResultTracao> {
  const aline = createAlineClient();

  const { data: p } = await aline
    .from("perfis")
    .select("id, slug, nome, objetivo, tom, pilares, regras_especiais, nicho_principal, publico_alvo, diferenciais")
    .eq("slug", params.perfilSlug)
    .maybeSingle();
  if (!p) return { ok: false, erro: "Perfil não encontrado" };

  const perfilRow = p as Record<string, unknown>;
  const perfilId = perfilRow.id as string;
  const perfilCtx = perfilContexto(params.perfilSlug);
  const systemBase = buildSystemBase(params.perfilSlug, perfilCtx);

  const systemText = `${systemBase}\n\n=== CONTEXTO PERFIL ===\n${JSON.stringify(perfilRow, null, 2)}\n\n=== TIPO: ${params.tipo} ===\n${SCHEMAS[params.tipo]}`;
  const userMsg = `Input:\n${JSON.stringify(params.input, null, 2)}\n\nEntregue JSON conforme schema.`;

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let tentativas = 0;
  let parsed: Record<string, unknown> | null = null;
  let violacoesAcumuladas: string[] = [];
  let usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0 };

  while (tentativas < 2) {
    tentativas++;
    let responseText: string;
    try {
      const userMsgFinal =
        tentativas === 1
          ? userMsg
          : `${userMsg}\n\nIMPORTANTE: seu output anterior violou vocabulário proibido: ${violacoesAcumuladas.join(", ")}. Regere SEM essas palavras.`;

      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 6000,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }] as never,
        messages: [{ role: "user", content: userMsgFinal }],
      });
      const block = resp.content[0];
      if (!block || block.type !== "text") return { ok: false, erro: "Resposta inesperada" };
      responseText = block.text;
      usage = {
        input_tokens: usage.input_tokens + resp.usage.input_tokens,
        output_tokens: usage.output_tokens + resp.usage.output_tokens,
        cache_read_input_tokens:
          usage.cache_read_input_tokens + ((resp.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0),
      };
    } catch (e) {
      return { ok: false, erro: `Claude: ${e instanceof Error ? e.message : String(e)}` };
    }

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

    const textoCompleto = JSON.stringify(parsed);
    const violacoes: string[] = [];
    for (const regex of VOCABULARIO_PROIBIDO) {
      const match = textoCompleto.match(regex);
      if (match) violacoes.push(match[0]);
    }
    if (violacoes.length === 0) break;
    violacoesAcumuladas = [...new Set([...violacoesAcumuladas, ...violacoes])];
  }

  if (!parsed) return { ok: false, erro: "Output vazio após tentativas" };

  const latencia = Date.now() - inicio;
  const custoUsd = (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  const vigenteAte = new Date();
  vigenteAte.setMonth(vigenteAte.getMonth() + 3);

  const { data: salvo, error: saveErr } = await aline
    .from("tracao_conteudo")
    .insert({
      perfil_id: perfilId,
      tipo: params.tipo,
      input: params.input,
      output: parsed,
      hooks_gerados: (parsed.hooks as unknown) ?? null,
      pilares_tracao: (parsed.pilares as unknown) ?? null,
      plano_semanal: (parsed.calendario_4_semanas as unknown) ?? null,
      ia_modelo: MODEL,
      ia_tokens_input: usage.input_tokens,
      ia_tokens_output: usage.output_tokens,
      ia_tokens_cached: usage.cache_read_input_tokens,
      ia_custo_usd: custoUsd,
      latencia_ms: latencia,
      vocabulario_violacoes: violacoesAcumuladas,
      regerado_apos_violacao: tentativas > 1,
      status: violacoesAcumuladas.length > 0 && tentativas === 2 ? "rejeitado_vocabulario" : "novo",
      vigente_ate: vigenteAte.toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (saveErr) return { ok: false, erro: saveErr.message };

  return {
    ok: true,
    tracaoId: (salvo as { id: string }).id,
    output: parsed,
    violacoes: violacoesAcumuladas,
  };
}
