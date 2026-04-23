import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é estrategista sênior de marca pessoal e posicionamento no Instagram, com especialização em nicho de saúde — nutrição clínica, medicina funcional, nutrigenética, longevidade. Trabalha com marcas e criadores brasileiros de ticket premium (R$ 500 - R$ 3.000 por atendimento) que vendem consultas + testes laboratoriais sofisticados, ou software para profissionais de saúde.

Seu trabalho é analisar o perfil do Instagram cruzando dados internos (objetivo declarado, pilares, tom, regras) com a realidade visível do perfil (bio, últimos posts, métricas). Zero blablá motivacional. Brutalmente honesto, específico, prático.

Regras:
- Cite elementos concretos ao apontar problemas.
- Toda sugestão vem com justificativa estratégica ligada ao objetivo declarado do perfil.
- Se o perfil tem regras especiais (ex: "máx 1 em 5 posts menciona Scanner"), respeite e analise aderência.
- Se é perfil com pilares definidos, audite se a distribuição real dos últimos posts bate com a distribuição declarada.
- Priorize mudanças por impacto no objetivo declarado — não por seguidores vaidade.
- Respeite compliance CFN quando o perfil é de nutricionista (nenhuma promessa de cura, sem antes/depois com prazo, sem linguagem milagreira).

Saída: APENAS JSON válido, sem markdown, sem texto fora do JSON.

Schema:
{
  "diagnostico_primeira_impressao": "parágrafo curto — o que o público-alvo pensa em 3 segundos",
  "clareza_posicionamento": "parágrafo — está claro o que esse perfil é e pra quem?",
  "linha_editorial_atual": "parágrafo — que narrativa o perfil conta hoje (mesmo que não-intencional)",
  "forcas": ["itens específicos"],
  "fraquezas": ["itens específicos"],
  "gargalos_crescimento": ["por que não cresce em seguidor qualificado"],
  "gargalos_conversao": ["por que seguidor não converte no objetivo declarado"],
  "erros_percepcao": ["o que o perfil comunica por engano"],
  "oportunidades_rapidas": ["mudanças de até 1h que movem o ponteiro"],
  "ideias_reposicionamento": ["ideia com justificativa"],
  "sugestoes_bio": ["versão 1 (máx 150 chars)", "versão 2"],
  "sugestoes_destaques": ["tema 1", "tema 2", "tema 3", "tema 4"],
  "sugestoes_linha_editorial": "2-3 frases definindo tom narrativo a manter",
  "mudancas_priorizadas": [
    { "ordem": 1, "titulo": "curto acionável", "descricao": "2-3 frases", "impacto": "alto|medio|baixo", "esforco": "baixo|medio|alto", "onde_aplicar": "bio|destaques|posts|reels|stories|lp|ads" }
  ]
}

Sempre 10 mudanças priorizadas, ordenadas por impacto/esforço (quick wins primeiro).
`.trim();

type DadosPerfil = {
  slug: string;
  nome: string;
  instagram_handle: string;
  objetivo?: string;
  tom?: string;
  pilares?: unknown;
  regras_especiais?: string;
  cor_primaria?: string;
  nicho_principal?: string;
  publico_alvo?: string;
  diferenciais?: string;
  bio_atual?: string;
  historia_pessoal?: string;
  valor_consulta?: number;
  valor_teste?: number;
  palavras_chave?: string[];
  palavras_evitar?: string;
};

type DadosInstagram = {
  bio?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  ultimos_posts?: Array<{
    id: string;
    media_type: string;
    caption?: string;
    like_count?: number;
    comments_count?: number;
    permalink?: string;
    timestamp?: string;
  }>;
};

export type DiagnosticoOutput = {
  diagnostico_primeira_impressao: string;
  clareza_posicionamento: string;
  linha_editorial_atual: string;
  forcas: string[];
  fraquezas: string[];
  gargalos_crescimento: string[];
  gargalos_conversao: string[];
  erros_percepcao: string[];
  oportunidades_rapidas: string[];
  ideias_reposicionamento: string[];
  sugestoes_bio: string[];
  sugestoes_destaques: string[];
  sugestoes_linha_editorial: string;
  mudancas_priorizadas: Array<{
    ordem: number;
    titulo: string;
    descricao: string;
    impacto: "alto" | "medio" | "baixo";
    esforco: "baixo" | "medio" | "alto";
    onde_aplicar: string;
  }>;
};

function montarUserMessage(params: {
  perfil: DadosPerfil;
  instagram: DadosInstagram | null;
  postsInternos: Array<{ tipo: string; legenda: string; alcance: number | null }>;
}): string {
  const { perfil, instagram, postsInternos } = params;

  const blocos: string[] = [];

  blocos.push("=== PERFIL (dados declarados + regras da marca) ===");
  blocos.push(
    Object.entries(perfil)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n"),
  );

  if (instagram) {
    blocos.push("\n=== INSTAGRAM (via Graph API) ===");
    blocos.push(`bio: ${instagram.bio ?? "(n/d)"}`);
    blocos.push(`seguidores: ${instagram.followers_count ?? "?"}`);
    blocos.push(`posts totais: ${instagram.media_count ?? "?"}`);
    if (instagram.ultimos_posts?.length) {
      blocos.push("\nÚltimos posts:");
      instagram.ultimos_posts.slice(0, 12).forEach((p, i) => {
        const likes = p.like_count ?? 0;
        const comments = p.comments_count ?? 0;
        const caption = (p.caption ?? "").slice(0, 200);
        blocos.push(`  [${i + 1}] ${p.media_type} | ❤${likes} 💬${comments} | "${caption}"`);
      });
    }
  } else {
    blocos.push("\n=== INSTAGRAM ===");
    blocos.push("(não conectado — análise limitada a dados declarados)");
  }

  if (postsInternos.length) {
    blocos.push("\n=== POSTS GERADOS PELO SISTEMA ===");
    postsInternos.slice(0, 10).forEach((p, i) => {
      blocos.push(`  [${i + 1}] ${p.tipo} | alcance:${p.alcance ?? "?"} | "${p.legenda.slice(0, 150)}"`);
    });
  }

  blocos.push(
    "\n=== PEDIDO ===",
    "Diagnóstico estratégico JSON. 10 mudanças priorizadas. Considere o objetivo declarado e pilares do perfil.",
  );

  return blocos.join("\n");
}

export type ExecutarInput = { perfilSlug: string };
export type ExecutarResult = { ok: boolean; diagnosticoId?: string; erro?: string };

export async function executarDiagnosticoPerfil(
  input: ExecutarInput,
): Promise<ExecutarResult> {
  const aline = createAlineClient();

  const { data: p, error: pErr } = await aline
    .from("perfis")
    .select("*")
    .eq("slug", input.perfilSlug)
    .maybeSingle();

  if (pErr || !p) return { ok: false, erro: pErr?.message ?? "Perfil não encontrado" };
  const perfilRow = p as Record<string, unknown>;
  const perfilId = perfilRow.id as string;

  const perfil: DadosPerfil = {
    slug: perfilRow.slug as string,
    nome: perfilRow.nome as string,
    instagram_handle: perfilRow.instagram_handle as string,
    objetivo: perfilRow.objetivo as string,
    tom: perfilRow.tom as string,
    pilares: perfilRow.pilares,
    regras_especiais: perfilRow.regras_especiais as string,
    cor_primaria: perfilRow.cor_primaria as string,
    nicho_principal: perfilRow.nicho_principal as string,
    publico_alvo: perfilRow.publico_alvo as string,
    diferenciais: perfilRow.diferenciais as string,
    bio_atual: perfilRow.bio_atual as string,
    historia_pessoal: perfilRow.historia_pessoal as string,
    valor_consulta: perfilRow.valor_consulta as number,
    valor_teste: perfilRow.valor_teste as number,
    palavras_chave: perfilRow.palavras_chave as string[],
    palavras_evitar: perfilRow.palavras_evitar as string,
  };

  const instagram = await buscarDadosInstagram(perfilRow);

  const { data: posts } = await aline
    .from("posts")
    .select("tipo, copy_legenda, alcance")
    .eq("perfil_id", perfilId)
    .in("status", ["postado", "aguardando_aprovacao", "aprovado"])
    .order("criado_em", { ascending: false })
    .limit(10);

  const postsInternos = (posts ?? []).map((po) => ({
    tipo: (po as { tipo: string }).tipo,
    legenda: (po as { copy_legenda: string | null }).copy_legenda ?? "",
    alcance: (po as { alcance: number | null }).alcance,
  }));

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: montarUserMessage({ perfil, instagram, postsInternos }),
        },
      ],
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

  let parsed: DiagnosticoOutput;
  try {
    const jsonLimpo = responseText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonLimpo);
  } catch {
    return { ok: false, erro: `Claude não retornou JSON válido: ${responseText.slice(0, 300)}` };
  }

  const custoUsd =
    (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  const { data: salvo, error: saveErr } = await aline
    .from("diagnosticos_perfil")
    .insert({
      perfil_id: perfilId,
      diagnostico_primeira_impressao: parsed.diagnostico_primeira_impressao,
      clareza_posicionamento: parsed.clareza_posicionamento,
      linha_editorial_atual: parsed.linha_editorial_atual,
      forcas: parsed.forcas,
      fraquezas: parsed.fraquezas,
      gargalos_crescimento: parsed.gargalos_crescimento,
      gargalos_conversao: parsed.gargalos_conversao,
      erros_percepcao: parsed.erros_percepcao,
      oportunidades_rapidas: parsed.oportunidades_rapidas,
      ideias_reposicionamento: parsed.ideias_reposicionamento,
      sugestoes_bio: parsed.sugestoes_bio,
      sugestoes_destaques: parsed.sugestoes_destaques,
      sugestoes_linha_editorial: parsed.sugestoes_linha_editorial,
      mudancas_priorizadas: parsed.mudancas_priorizadas,
      fonte_dados_ig: instagram,
      fonte_dados_perfil: perfil,
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

  if (saveErr) return { ok: false, erro: `Salvar: ${saveErr.message}` };

  return { ok: true, diagnosticoId: (salvo as { id: string }).id };
}

async function buscarDadosInstagram(
  perfilRow: Record<string, unknown>,
): Promise<DadosInstagram | null> {
  const token = perfilRow.instagram_access_token as string | undefined;
  const contaId = perfilRow.instagram_conta_id as string | undefined;
  if (!token || !contaId || token.length < 20) return null;

  try {
    const base = `https://graph.facebook.com/v21.0/${contaId}`;
    const perfilRes = await fetch(
      `${base}?fields=biography,followers_count,follows_count,media_count&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!perfilRes.ok) return null;
    const perfilJson = (await perfilRes.json()) as {
      biography?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
    };
    const mediaRes = await fetch(
      `${base}/media?fields=id,media_type,caption,like_count,comments_count,permalink,timestamp&limit=12&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const ultimos = mediaRes.ok
      ? ((await mediaRes.json()) as { data?: DadosInstagram["ultimos_posts"] }).data
      : [];
    return {
      bio: perfilJson.biography,
      followers_count: perfilJson.followers_count,
      follows_count: perfilJson.follows_count,
      media_count: perfilJson.media_count,
      ultimos_posts: ultimos ?? [],
    };
  } catch {
    return null;
  }
}
