import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

export type TipoTracao =
  | "7a_hooks_alta_tracao"
  | "7b_pilares_tracao"
  | "7c_plano_misto"
  | "7d_bio_destaques"
  | "7e_analise_viralidade";

/**
 * Skill 7 — Conteudo de Alta Tracao.
 * Objetivo: crescer seguidor QUALIFICADO (nao volume puro).
 * Proporcao 70% autoridade/conversao + 30% tracao, respeitando
 * posicionamento premium (nada de hustle genérico).
 *
 * REGRA DURA DE VOCABULARIO:
 * Proibido usar "protocolo" — é genérico, contradiz o diferencial
 * de personalizacao. Usar sempre vocabulario personalizado:
 * - Nutri Secrets / consulta: "sinergias", "sinergias nutricionais"
 * - Scanner da Saude / B2B: "detetive da saude", "investigacao"
 * Validador automatico bloqueia e regera output se violado.
 */

const VOCABULARIO_PROIBIDO = [
  /\bprotocolo\b/i,
  /\bprotocolos\b/i,
  /\bdieta\s+(padrao|pronta|pre-?montada)\b/i,
];

const SYSTEM_BASE = `
Você é estrategista sênior de crescimento no Instagram, especializado em nicho de saúde premium brasileiro (nutrição clínica, nutrigenética, medicina funcional). Trabalha com perfis cujo objetivo é ganhar seguidor QUALIFICADO (que vira paciente de ticket R$ 500-3.000), não volume puro.

Sua função: criar conteúdo com alta potência de share/save/reach ORGÂNICO, sem comprometer posicionamento premium. Proporção 70% autoridade/conversão + 30% tração.

REGRAS DURAS DE VOCABULÁRIO:
- **PROIBIDO** usar "protocolo" ou "protocolos" — contradiz o diferencial de personalização.
- **PROIBIDO** usar "dieta padrão", "dieta pronta", "dieta pré-montada" — idem.
- Quando o contexto for Nutri Secrets / nutrição individual: use "sinergia", "sinergias nutricionais", "sinergias entre nutrientes e genética", "personalização por DNA", "combinação estratégica".
- Quando o contexto for Scanner da Saúde / B2B / profissional: use "detetive da saúde", "detetive de saúde", "investigação", "descoberta", "conexão causal", "leitura profissional".
- Qualquer violação → output rejeitado automaticamente.

REGRAS DE TRAÇÃO:
- Hooks prendem scroll nos 3 primeiros segundos — frase curta, específica, que gera curiosidade/tensão/incongruência.
- Conteúdo que VIRALIZA em saúde premium: mito vs verdade com dado real, descoberta científica não-óbvia, desmentir "guru", bastidor real de consultório, caso qualitativo (respeitando anonimato e CFN).
- Conteúdo que CONVERTE em follow: prova de autoridade rápida, bio clara do que ensina, destaque organizado por tema.
- COMPLIANCE CFN vigente: sem promessa de cura, sem antes/depois com prazo, sem peso/medida explícitos.

Saída: APENAS JSON válido.
`.trim();

const SCHEMAS: Record<TipoTracao, string> = {
  "7a_hooks_alta_tracao": `
Input: { perfil_tipo (B2C_nutri | B2B_scanner), nicho, objetivo_crescimento }

Output JSON:
{
  "hooks": [
    {
      "ordem": 1,
      "texto": "hook de 5-12 palavras, stop-scroll garantido",
      "formato_ideal": "reels | carrossel | post",
      "emocao_gatilho": "curiosidade | indignacao | surpresa | medo | reconhecimento",
      "score_viralidade": "alto | medio",
      "explicacao": "1 frase sobre por que esse hook para o scroll",
      "cta_sugerido": "que acao o post convida (salvar, compartilhar, comentar)"
    }
  ]
}

SEMPRE 30 hooks. Varie formato e gatilho emocional. Todos respeitando vocabulário proibido.
`.trim(),

  "7b_pilares_tracao": `
Input: { perfil_tipo, nicho, posicionamento_atual, objetivos, ultimos_posts }

Output JSON:
{
  "pilares": [
    {
      "ordem": 1,
      "nome_pilar": "nome curto e marcante",
      "angulo_central": "parágrafo — qual eixo narrativo explora",
      "por_que_viraliza": "o que desse angulo gera share/save em saúde premium",
      "formato_campeao": "reels | carrossel | post",
      "frequencia_semanal_sugerida": "quantos posts desse pilar por semana",
      "exemplo_de_post": { "titulo": "", "hook": "", "estrutura_resumo": "" },
      "alinhamento_com_posicionamento": "como esse pilar reforça autoridade sem sacrificar premium"
    }
  ],
  "pilares_a_evitar": ["pilares que viralizariam mas machucam posicionamento ou vão contra vocabulário — listar com justificativa"]
}

Entregue 3-5 pilares viáveis. Cada um deve gerar pelo menos 4 posts diferentes por mês.
`.trim(),

  "7c_plano_misto": `
Input: { perfil_tipo, pilares_tracao (output do 7b), pilares_autoridade (já existentes do perfil), dias_post_semana }

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
        { "dia": "segunda", "tipo": "feed_carrossel", "categoria": "autoridade | tracao", "pilar": "nome", "hook_sugerido": "" }
      ]
    }
  ],
  "regras_execucao": ["regras do tipo 'não publicar 2 posts de tração seguidos', 'responder todo comentário em até 2h', etc"],
  "metricas_tracao_a_acompanhar": ["shares por post", "saves por post", "followers ganhos por post", "alcance organico medio"]
}

4 semanas de calendario completo. Respeita dias declarados.
`.trim(),

  "7d_bio_destaques": `
Input: { perfil_tipo, posicionamento, oferta_principal, diferenciais, proposta_unica }

Output JSON:
{
  "bio_opcoes": [
    { "ordem": 1, "texto": "bio max 150 chars", "angulo": "curiosidade | autoridade | transformacao", "converte_para": "follow | lead" }
  ],
  "destaques_sugeridos": [
    {
      "ordem": 1,
      "nome_destaque": "max 15 chars",
      "tema": "o que vai dentro",
      "tipo": "isca_de_save (vira follow) | autoridade | prova | servico",
      "sequencia_stories_inicial": ["story 1 descricao", "story 2 descricao"]
    }
  ],
  "cta_link_bio": "que link/CTA priorizar (WhatsApp, LP, site, etc)",
  "foto_perfil_diretrizes": "orientação rápida sobre foto (se humanizada, se logo, etc)"
}

3 opções de bio. 4-5 destaques. Nome curto de destaque (Instagram corta).
`.trim(),

  "7e_analise_viralidade": `
Input: { ultimos_30_posts (com metricas: alcance, saves, shares, comentarios) }

Output JSON:
{
  "top_posts_por_share": [{ "post_ref": "", "por_que_funcionou": "" }],
  "top_posts_por_save": [{ "post_ref": "", "por_que_funcionou": "" }],
  "top_posts_por_follow_conversao": [{ "post_ref": "", "por_que_funcionou": "" }],
  "padroes_que_repetem_bem": ["padrão 1: hooks que começam com 'Você sabia...'", "..."],
  "padroes_que_morreram": ["padrão 1: posts muito longos sem hook forte"],
  "recomendacoes_praticas": [
    { "acao": "fazer mais X", "justificativa": "", "esforco": "baixo|medio|alto" }
  ],
  "alerta_fadiga_criativa": "se detectou repetição estrutural causando queda de alcance"
}
`.trim(),
};

export type InputTracao = {
  franqueadaId: string;
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
  const admin = createAdminClient();

  const { data: f } = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal, publico_alvo_descricao, diferenciais, tom_comunicacao, cor_primaria_hex, palavras_evitar")
    .eq("id", params.franqueadaId)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const systemText = `${SYSTEM_BASE}\n\n=== CONTEXTO NUTRI ===\n${JSON.stringify(f, null, 2)}\n\n=== TIPO: ${params.tipo} ===\n${SCHEMAS[params.tipo]}`;
  const userMsg = `Input:\n${JSON.stringify(params.input, null, 2)}\n\nEntregue JSON conforme schema.`;

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // até 2 tentativas se violar vocabulário
  let tentativas = 0;
  let parsed: Record<string, unknown> | null = null;
  let violacoesAcumuladas: string[] = [];
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number } = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
  };

  while (tentativas < 2) {
    tentativas++;
    let responseText: string;

    try {
      const userMsgFinal =
        tentativas === 1
          ? userMsg
          : `${userMsg}\n\nIMPORTANTE: seu output anterior violou o vocabulário proibido. Violações: ${violacoesAcumuladas.join(", ")}. Regere SEM usar essas palavras.`;

      const resp = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 6000,
        system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMsgFinal }],
      });
      const block = resp.content[0];
      if (!block || block.type !== "text") return { ok: false, erro: "Resposta inesperada" };
      responseText = block.text;
      usage = {
        input_tokens: (usage.input_tokens ?? 0) + resp.usage.input_tokens,
        output_tokens: (usage.output_tokens ?? 0) + resp.usage.output_tokens,
        cache_read_input_tokens:
          (usage.cache_read_input_tokens ?? 0) + (resp.usage.cache_read_input_tokens ?? 0),
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

    // Validação vocabulário proibido
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
  const custoUsd =
    (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  const vigenteAte = new Date();
  vigenteAte.setMonth(vigenteAte.getMonth() + 3);

  const { data: salvo, error: saveErr } = await admin
    .from("tracao_conteudo")
    .insert({
      franqueada_id: params.franqueadaId,
      tipo: params.tipo,
      input: params.input,
      output: parsed,
      hooks_gerados: (parsed.hooks as unknown) ?? null,
      pilares_tracao: (parsed.pilares as unknown) ?? null,
      plano_semanal: (parsed.calendario_4_semanas as unknown) ?? null,
      ia_modelo: MODEL,
      ia_tokens_input: usage.input_tokens,
      ia_tokens_output: usage.output_tokens,
      ia_tokens_cached: usage.cache_read_input_tokens ?? 0,
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
