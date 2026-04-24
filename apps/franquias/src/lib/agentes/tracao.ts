import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { ICP_TICKET_ALTO_NUTRI_PREMIUM } from "./_icp";

const MODEL = "claude-sonnet-4-5";

export type TipoTracao =
  | "7a_hooks_alta_tracao"
  | "7b_pilares_tracao"
  | "7c_plano_misto"
  | "7d_bio_destaques"
  | "7e_analise_viralidade"
  | "7f_compartilhamento_lateral"
  | "7g_plano_reativacao";

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
Você é estrategista sênior de crescimento ORGÂNICO no Instagram, especializado em nicho de saúde premium brasileiro (nutrição clínica, nutrigenética, medicina funcional). Trabalha com perfis sem budget de ads — ou com budget mínimo — cujo objetivo é ganhar seguidor QUALIFICADO (que vira paciente de ticket alto, R$ 4.000-7.000 em tratamento anual), não volume puro.

${ICP_TICKET_ALTO_NUTRI_PREMIUM}

**Conteúdo deve AUTO-QUALIFICAR:** linguagem técnica que atrai quem entende e afasta quem não entende. Não é pra ser explicativo de tudo — é pra criar reconhecimento em quem já tá no nível, e provocar curiosidade em quem está chegando.

**PRIORIDADE #1 EM TODAS AS SUB-ROTINAS: CONTEÚDO COMPARTILHÁVEL.**
Sem budget, a mecânica de crescimento é 1 seguidor → N compartilhamentos. O leitor precisa querer MANDAR esse post pra alguém específico (amiga, colega profissional, família). Share e save valem mais que like.

Proporção 70% autoridade/conversão + 30% tração — mas tração no orgânico puro significa conteúdo que VAI SER COMPARTILHADO, não apenas visto.

REGRAS DURAS DE VOCABULÁRIO:
- **PROIBIDO** usar "protocolo" ou "protocolos" — contradiz o diferencial de personalização.
- **PROIBIDO** usar "dieta padrão", "dieta pronta", "dieta pré-montada" — idem.
- Quando o contexto for Nutri Secrets / nutrição individual / B2C: use "sinergia", "sinergias nutricionais", "sinergias entre nutrientes e genética", "personalização por DNA", "combinação estratégica", "plano feito pra você".
- Quando o contexto for Scanner da Saúde / B2B / profissional: use "detetive da saúde", "detetive de saúde", "investigação clínica", "descoberta", "conexão causal", "leitura profissional", "raciocínio clínico".
- Qualquer violação → output rejeitado automaticamente.

MECÂNICAS DE COMPARTILHAMENTO POR CONTEXTO:

**B2C (Nutri Secrets, paciente final):**
- Mulher compartilha com amiga quando o conteúdo RESOLVE ou NOMEIA a dor dela. Ex: *"5 sinais que seu intestino está pedindo ajuda (e você confundiu com ansiedade)"*.
- Carrosséis-referência ("salva pra quando precisar") funcionam forte.
- Stories com enquetes "você ou uma amiga vive isso?" geram DM → seguidores novos.

**B2B (Scanner, nutricionistas):**
- Nutri compartilha no grupo de WhatsApp/Telegram profissional quando o conteúdo ESCALA O TRABALHO dela ou AJUDA a ganhar mais. Ex: *"O cálculo que eu passei a usar que elimina 90% dos erros de anamnese"*.
- Posts "nutri-pra-nutri" são o vetor mais barato de crescimento em B2B.
- Polêmica respeitosa com dado ("por que parei de prescrever X") gera compartilhamento + discussão.

REGRAS DE TRAÇÃO (atualizado pra orgânico puro):
- Hook nos 3 primeiros segundos — mas prioriza frase que gera RECONHECIMENTO ou CURIOSIDADE ESPECÍFICA, não sensacionalismo.
- Métrica #1: share count + save rate. Like é vaidade.
- Pattern interrupt: se perfil tá em fadiga, primeiros 3-5 posts da retomada devem ser VISUALMENTE e NARRATIVAMENTE diferentes do histórico (reboo de algoritmo).
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

  "7f_compartilhamento_lateral": `
Gera conteúdo específico pra **ser compartilhado lateralmente** (sem budget de ads).
Contexto crítico no input: perfil_tipo = "B2C_nutri_secrets" OU "B2B_scanner_nutris".

Input: {
  perfil_tipo,
  dor_ou_assunto_especifico,   // ex: "ansiedade + intestino", "anamnese que escala consultorio"
  formato_alvo,                 // "carrossel" | "reels" | "post_longo"
  contexto_compartilhamento     // "mulher manda pra amiga" | "nutri posta no grupo WhatsApp"
}

Output JSON:
{
  "titulo_do_post": "nome interno do material",
  "hook_magnetico": "frase de 5-12 palavras que faz parar scroll — testada contra nicho",
  "por_que_vao_compartilhar": "frase direta — o que essa pessoa ganha compartilhando",
  "para_quem_sera_compartilhado": "arquétipo do destinatário (ex: 'amiga que reclama de cansaço', 'colega nutri que tá começando consultorio')",
  "estrutura_conteudo": {
    "abertura_3s": "",
    "desenvolvimento_core": "",
    "virada": "",
    "fechamento_compartilhavel": "frase que faz o leitor clicar em 'enviar pra...'"
  },
  "copy_legenda": "legenda pronta pra publicar",
  "cta_compartilhamento_explicito": "'marca alguém que precisa ver isso' OU 'salva e manda no grupo das nutris'",
  "angulo_psicologico": "reconhecimento | utilidade_pratica | indignacao_construtiva | humor_profissional",
  "metricas_esperadas": { "saves_ratio_alvo": "0.15", "shares_ratio_alvo": "0.08", "observacao": "" }
}
`.trim(),

  "7g_plano_reativacao": `
Plano de 14 dias pra RESSUSCITAR engajamento de perfil que perdeu tração.
Usado quando perfil tem histórico bom mas caiu. Objetivo: rebootar algoritmo
+ reacender audiência dormente.

Input: { perfil_tipo, historico_engajamento (últimos 30 dias), ultimos_posts_fracos, melhor_post_historico }

Output JSON:
{
  "diagnostico_queda": "parágrafo — por que provavelmente caiu",
  "dia_1_3_pattern_interrupt": [
    {
      "dia": 1,
      "acao": "post completamente diferente do histórico em tom/formato/visual",
      "descricao": "",
      "objetivo": "rebooar algoritmo — forçar IG a redistribuir pra nova audiência teste"
    }
  ],
  "dia_4_7_ressuscitar_audiencia_dormente": [
    {
      "dia": 4,
      "acao": "stories com enquete que pede resposta direta",
      "descricao": "",
      "objetivo": "forçar interação — comentar/DM nos últimos 20 perfis que interagiram"
    }
  ],
  "dia_8_14_consolidar_novo_ritmo": [
    {
      "dia": 8,
      "acao": "",
      "descricao": "",
      "objetivo": ""
    }
  ],
  "acoes_diarias_paralelas": [
    "responder TODO comentario nas primeiras 2h",
    "comentar nos ultimos 5 posts de cada um que antes comentava aqui",
    "3 stories por dia — 1 pessoal, 1 utilidade, 1 call-to-action suave"
  ],
  "meta_14_dias": "aumentar alcance medio em X%, saves em Y%",
  "post_ancora_recomendado": "descrição de 1 post especifico que deve ser o 'âncora' dos 14 dias — mais valioso, preso no topo do feed"
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
