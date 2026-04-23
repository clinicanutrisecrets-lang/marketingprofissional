import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é analista sênior de conteúdo e comportamento de audiência no Instagram, especializado em nicho de saúde/nutrição no Brasil. Trabalha com perfis de ticket premium (R$ 500 - R$ 3.000 por atendimento) e decifra por que alguns posts performam e outros morrem.

Seu trabalho: auditar os últimos 30 posts da nutri, cruzar com pilares declarados do perfil, e identificar gaps. Entregar 20 ideias acionáveis baseadas nos gaps encontrados — cada uma pronta pra virar post.

Regras:
- Leitura estratégica, não opinião solta. Toda observação vem com padrão observado nos dados ("posts de mito vs verdade tiveram engajamento 2x acima da média dessa nutri").
- Ideias devem ser específicas ao ICP dela (ticket alto, saúde preventiva, público premium).
- Nenhuma ideia que comprometa compliance CFN (sem promessa de cura, sem antes/depois, sem linguagem milagreira).
- Diferencie conteúdo que PRENDE (alto alcance/engagement) de conteúdo que CONVERTE (vira lead/salvamento/compartilhamento — sinal de intenção).
- Nas 20 ideias, varie formatos (feed, carrossel, reels, stories) — não concentra tudo num só.

Saída: APENAS JSON válido.

Schema:
{
  "padroes_conteudo_prende": [{"padrao": "texto", "evidencia": "posts X, Y — metrica Z"}],
  "padroes_conteudo_converte": [{"padrao": "texto", "evidencia": "posts X tiveram muitos saves/compartilhamentos"}],
  "erros_recorrentes": [{"erro": "texto", "impacto": "por que afeta performance"}],
  "temas_saturados": ["tema 1", "tema 2"],
  "temas_subexplorados": ["tema do nicho ainda não trabalhado, com potencial"],
  "lacunas_narrativa": ["falta continuidade entre posts", "falta história recorrente"],
  "lacunas_autoridade": ["falta post de bastidor clínico", "falta referência científica direta"],
  "oportunidades_viralizacao": [{"formato": "reels | carrossel", "angulo": "texto", "justificativa": "por que tem potencial viral neste nicho"}],
  "oportunidades_prova": [{"oportunidade": "texto", "onde_aplicar": "destaque | post | reels"}],
  "ideias_por_gap": [
    {
      "ordem": 1,
      "titulo": "curto — como se fosse nome do post",
      "formato": "feed_imagem | feed_carrossel | reels | stories",
      "angulo": "educativo_ciencia | dor_do_paciente | bastidor | mito_vs_verdade | caso_anonimizado | prova_social | chamada_direta",
      "hook": "primeira frase do post — nos 3 primeiros segundos",
      "estrutura": "bullet rápido do arco (ex: hook → dor → ciência → virada → CTA)",
      "cta": "ação esperada do leitor",
      "justificativa": "qual gap preenche / por que faz sentido agora",
      "gap_que_preenche": "ex: tema_subexplorado | lacuna_autoridade | oportunidade_prova"
    }
  ]
}

Sempre EXATAMENTE 20 ideias. Numeradas 1 a 20. Variadas em formato e ângulo.
`.trim();

type Perfil = {
  nome_comercial?: string;
  nicho_principal?: string;
  publico_alvo_descricao?: string;
  diferenciais?: string;
  tom_comunicacao?: string;
  valor_consulta_inicial?: number;
  palavras_evitar?: string;
};

type PostAnalisado = {
  tipo: string;
  legenda: string;
  angulo?: string | null;
  data_hora_postado?: string | null;
  alcance?: number | null;
  impressoes?: number | null;
  curtidas?: number | null;
  comentarios?: number | null;
  salvamentos?: number | null;
  compartilhamentos?: number | null;
  taxa_engajamento?: number | null;
};

export type IdeiaGap = {
  ordem: number;
  titulo: string;
  formato: string;
  angulo: string;
  hook: string;
  estrutura: string;
  cta: string;
  justificativa: string;
  gap_que_preenche: string;
};

export type AuditoriaOutput = {
  padroes_conteudo_prende: Array<{ padrao: string; evidencia: string }>;
  padroes_conteudo_converte: Array<{ padrao: string; evidencia: string }>;
  erros_recorrentes: Array<{ erro: string; impacto: string }>;
  temas_saturados: string[];
  temas_subexplorados: string[];
  lacunas_narrativa: string[];
  lacunas_autoridade: string[];
  oportunidades_viralizacao: Array<{ formato: string; angulo: string; justificativa: string }>;
  oportunidades_prova: Array<{ oportunidade: string; onde_aplicar: string }>;
  ideias_por_gap: IdeiaGap[];
};

function montarUserMessage(perfil: Perfil, posts: PostAnalisado[]): string {
  const bloco: string[] = [];

  bloco.push("=== PERFIL ===");
  bloco.push(
    Object.entries(perfil)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n"),
  );

  bloco.push(`\n=== ÚLTIMOS ${posts.length} POSTS ANALISADOS ===`);
  posts.forEach((p, i) => {
    const m = [
      p.alcance ? `alcance:${p.alcance}` : null,
      p.curtidas ? `❤${p.curtidas}` : null,
      p.comentarios ? `💬${p.comentarios}` : null,
      p.salvamentos ? `🔖${p.salvamentos}` : null,
      p.compartilhamentos ? `↗${p.compartilhamentos}` : null,
      p.taxa_engajamento !== null && p.taxa_engajamento !== undefined ? `eng:${p.taxa_engajamento}%` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    bloco.push(
      `  [${i + 1}] ${p.tipo} ${p.angulo ? `(${p.angulo})` : ""} | ${m || "sem métricas"}`,
    );
    bloco.push(`       "${(p.legenda ?? "").slice(0, 220)}"`);
  });

  bloco.push(
    "\n=== PEDIDO ===",
    "Auditoria + 20 ideias JSON. Leia padrões quantitativamente (quais ângulos performaram mais engajamento, quais fracassaram). Identifique gaps. Entregue 20 ideias variadas em formato e ângulo.",
  );

  return bloco.join("\n");
}

export type ExecutarInput = { franqueadaId: string };
export type ExecutarResult = { ok: boolean; auditoriaId?: string; erro?: string };

export async function executarAuditoriaConteudo(
  input: ExecutarInput,
): Promise<ExecutarResult> {
  const admin = createAdminClient();

  const { data: f } = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal, publico_alvo_descricao, diferenciais, tom_comunicacao, valor_consulta_inicial, palavras_evitar")
    .eq("id", input.franqueadaId)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const perfil = f as Perfil;

  const { data: postsData } = await admin
    .from("posts_agendados")
    .select(
      "tipo_post, copy_legenda, angulo_copy, data_hora_postado, alcance, impressoes, curtidas, comentarios, salvamentos, compartilhamentos, taxa_engajamento, criado_em",
    )
    .eq("franqueada_id", input.franqueadaId)
    .in("status", ["postado", "aguardando_aprovacao", "aprovado"])
    .order("criado_em", { ascending: false })
    .limit(30);

  const posts: PostAnalisado[] = (postsData ?? []).map((p) => {
    const r = p as Record<string, unknown>;
    return {
      tipo: r.tipo_post as string,
      legenda: (r.copy_legenda as string) ?? "",
      angulo: (r.angulo_copy as string) ?? null,
      data_hora_postado: (r.data_hora_postado as string) ?? null,
      alcance: (r.alcance as number) ?? null,
      impressoes: (r.impressoes as number) ?? null,
      curtidas: (r.curtidas as number) ?? null,
      comentarios: (r.comentarios as number) ?? null,
      salvamentos: (r.salvamentos as number) ?? null,
      compartilhamentos: (r.compartilhamentos as number) ?? null,
      taxa_engajamento: (r.taxa_engajamento as number) ?? null,
    };
  });

  if (posts.length < 3) {
    return {
      ok: false,
      erro: `Apenas ${posts.length} posts históricos — mínimo 3 pra análise útil.`,
    };
  }

  const periodoFim = posts[0]?.data_hora_postado ?? null;
  const periodoInicio = posts[posts.length - 1]?.data_hora_postado ?? null;

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: montarUserMessage(perfil, posts) }],
    });
    const block = resp.content[0];
    if (!block || block.type !== "text") {
      return { ok: false, erro: "Resposta em formato inesperado" };
    }
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

  let parsed: AuditoriaOutput;
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

  const { data: salvo, error: saveErr } = await admin
    .from("auditorias_conteudo")
    .insert({
      franqueada_id: input.franqueadaId,
      padroes_conteudo_prende: parsed.padroes_conteudo_prende,
      padroes_conteudo_converte: parsed.padroes_conteudo_converte,
      erros_recorrentes: parsed.erros_recorrentes,
      temas_saturados: parsed.temas_saturados,
      temas_subexplorados: parsed.temas_subexplorados,
      lacunas_narrativa: parsed.lacunas_narrativa,
      lacunas_autoridade: parsed.lacunas_autoridade,
      oportunidades_viralizacao: parsed.oportunidades_viralizacao,
      oportunidades_prova: parsed.oportunidades_prova,
      ideias_por_gap: parsed.ideias_por_gap,
      fonte_dados_posts: posts.slice(0, 30),
      qtd_posts_analisados: posts.length,
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      ia_modelo: MODEL,
      ia_tokens_input: usage.input_tokens,
      ia_tokens_output: usage.output_tokens,
      ia_tokens_cached: usage.cache_read_input_tokens ?? 0,
      ia_custo_usd: custoUsd,
      latencia_ms: latencia,
      status: "novo",
    })
    .select("id")
    .single();

  if (saveErr) return { ok: false, erro: saveErr.message };

  return { ok: true, auditoriaId: (salvo as { id: string }).id };
}
