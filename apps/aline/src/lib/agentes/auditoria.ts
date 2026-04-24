import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é analista sênior de conteúdo e comportamento de audiência no Instagram, especializado em nicho de saúde/nutrição no Brasil. Decifra por que alguns posts performam e outros morrem.

Auditar últimos posts do perfil, cruzar com objetivo declarado + pilares + regras especiais, e identificar gaps. Entregar 20 ideias acionáveis.

Regras:
- Leitura estratégica ancorada em dados ("posts do ângulo X tiveram engajamento 2x").
- Ideias devem respeitar os pilares declarados (distribuição %) e regras especiais do perfil.
- Diferencie conteúdo que PRENDE (alcance/curtidas) de conteúdo que CONVERTE (salvamentos, compartilhamentos — sinal de intenção).
- 20 ideias variadas em formato (feed_imagem, feed_carrossel, reels, stories) e ângulo.
- Se perfil tem regra do tipo "máx X% menciona produto", auditar aderência e pontuar desvio.
- Se perfil é nutricionista: compliance CFN obrigatório.

VOCABULÁRIO PROIBIDO em hooks, títulos e estruturas das 20 ideias:
- NUNCA "protocolo" / "protocolos"
- NUNCA "dieta padrão", "cardápio pronto"
- @nutrisecrets: use "sinergias", "mapa metabólico", "plano personalizado"
- @scannerdasaude: use "detetive da saúde", "investigação", "raciocínio clínico"

Saída: APENAS JSON válido.

Schema:
{
  "padroes_conteudo_prende": [{"padrao": "texto", "evidencia": "posts X — metrica Z"}],
  "padroes_conteudo_converte": [{"padrao": "texto", "evidencia": "texto"}],
  "erros_recorrentes": [{"erro": "texto", "impacto": "por que afeta"}],
  "temas_saturados": ["tema"],
  "temas_subexplorados": ["tema"],
  "lacunas_narrativa": ["texto"],
  "lacunas_autoridade": ["texto"],
  "oportunidades_viralizacao": [{"formato": "texto", "angulo": "texto", "justificativa": "texto"}],
  "oportunidades_prova": [{"oportunidade": "texto", "onde_aplicar": "texto"}],
  "ideias_por_gap": [
    {
      "ordem": 1,
      "titulo": "curto",
      "formato": "feed_imagem | feed_carrossel | reels | stories",
      "angulo": "educativo_ciencia | dor_do_paciente | bastidor | mito_vs_verdade | caso_anonimizado | prova_social | chamada_direta | transformacao_carreira",
      "hook": "primeira frase",
      "estrutura": "arco em bullets",
      "cta": "ação esperada",
      "justificativa": "qual gap preenche",
      "gap_que_preenche": "texto",
      "pilar_alvo": "qual pilar do perfil esta ideia reforça"
    }
  ]
}

EXATAMENTE 20 ideias. Distribuídas nos pilares declarados conforme os pct%.
`.trim();

type Perfil = {
  slug: string;
  nome: string;
  objetivo?: string;
  tom?: string;
  pilares?: unknown;
  regras_especiais?: string;
  nicho_principal?: string;
  publico_alvo?: string;
  valor_consulta?: number;
  valor_teste?: number;
};

type PostAnalisado = {
  tipo: string;
  legenda: string;
  alcance?: number | null;
  curtidas?: number | null;
  comentarios?: number | null;
  salvamentos?: number | null;
  compartilhamentos?: number | null;
  plays_video?: number | null;
  avg_watch_time_seg?: number | null;
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
  ideias_por_gap: Array<{
    ordem: number;
    titulo: string;
    formato: string;
    angulo: string;
    hook: string;
    estrutura: string;
    cta: string;
    justificativa: string;
    gap_que_preenche: string;
    pilar_alvo?: string;
  }>;
};

function montarUserMessage(perfil: Perfil, posts: PostAnalisado[]): string {
  const blocos: string[] = [];
  blocos.push("=== PERFIL ===");
  blocos.push(
    Object.entries(perfil)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n"),
  );
  blocos.push(`\n=== ÚLTIMOS ${posts.length} POSTS ===`);
  posts.forEach((p, i) => {
    const m = [
      p.alcance ? `alc:${p.alcance}` : null,
      p.curtidas ? `❤${p.curtidas}` : null,
      p.comentarios ? `💬${p.comentarios}` : null,
      p.salvamentos ? `🔖${p.salvamentos}` : null,
      p.compartilhamentos ? `↗${p.compartilhamentos}` : null,
      p.plays_video ? `▶${p.plays_video}` : null,
      p.avg_watch_time_seg ? `watch:${p.avg_watch_time_seg}s` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    blocos.push(`  [${i + 1}] ${p.tipo} | ${m || "sem métricas"}`);
    blocos.push(`       "${(p.legenda ?? "").slice(0, 220)}"`);
  });
  blocos.push("\n=== PEDIDO ===", "Auditoria + 20 ideias JSON. Respeite distribuição dos pilares.");
  return blocos.join("\n");
}

export type ExecutarInput = { perfilSlug: string };
export type ExecutarResult = { ok: boolean; auditoriaId?: string; erro?: string };

export async function executarAuditoriaConteudo(
  input: ExecutarInput,
): Promise<ExecutarResult> {
  const aline = createAlineClient();

  const { data: p } = await aline
    .from("perfis")
    .select("id, slug, nome, objetivo, tom, pilares, regras_especiais, nicho_principal, publico_alvo, valor_consulta, valor_teste")
    .eq("slug", input.perfilSlug)
    .maybeSingle();
  if (!p) return { ok: false, erro: "Perfil não encontrado" };

  const perfilRow = p as Record<string, unknown>;
  const perfilId = perfilRow.id as string;
  const perfil: Perfil = {
    slug: perfilRow.slug as string,
    nome: perfilRow.nome as string,
    objetivo: perfilRow.objetivo as string,
    tom: perfilRow.tom as string,
    pilares: perfilRow.pilares,
    regras_especiais: perfilRow.regras_especiais as string,
    nicho_principal: perfilRow.nicho_principal as string,
    publico_alvo: perfilRow.publico_alvo as string,
    valor_consulta: perfilRow.valor_consulta as number,
    valor_teste: perfilRow.valor_teste as number,
  };

  const { data: postsData } = await aline
    .from("posts")
    .select("tipo, copy_legenda, alcance, curtidas, comentarios, salvamentos, compartilhamentos, plays_video, avg_watch_time_seg")
    .eq("perfil_id", perfilId)
    .in("status", ["postado", "aguardando_aprovacao", "aprovado"])
    .order("criado_em", { ascending: false })
    .limit(30);

  const posts: PostAnalisado[] = (postsData ?? []).map((po) => {
    const r = po as Record<string, unknown>;
    return {
      tipo: r.tipo as string,
      legenda: (r.copy_legenda as string) ?? "",
      alcance: (r.alcance as number) ?? null,
      curtidas: (r.curtidas as number) ?? null,
      comentarios: (r.comentarios as number) ?? null,
      salvamentos: (r.salvamentos as number) ?? null,
      compartilhamentos: (r.compartilhamentos as number) ?? null,
      plays_video: (r.plays_video as number) ?? null,
      avg_watch_time_seg: (r.avg_watch_time_seg as number) ?? null,
    };
  });

  if (posts.length < 3) {
    return { ok: false, erro: `Apenas ${posts.length} posts históricos — mínimo 3.` };
  }

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

  const { data: salvo, error: saveErr } = await aline
    .from("auditorias_conteudo")
    .insert({
      perfil_id: perfilId,
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
      fonte_dados_posts: posts,
      qtd_posts_analisados: posts.length,
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
