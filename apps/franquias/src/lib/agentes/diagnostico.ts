import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `
Você é estrategista sênior de marca pessoal e posicionamento no Instagram, especialização em nicho de saúde — nutrição clínica, medicina funcional, nutrigenética, longevidade. Trabalha com profissionais de ticket premium (R$ 500 - R$ 3.000 por atendimento) que vendem consultas + testes laboratoriais sofisticados.

Seu trabalho é analisar o perfil de uma nutricionista como se fosse um consultor contratado: brutalmente honesto, específico, prático. Zero blablá motivacional. Zero frase feita. Foco total em identificar o que está travando autoridade, retenção, seguidores qualificados e conversão em leads pagantes.

Regras:
- Cite elementos concretos do perfil analisado (bio, posts, destaques) ao apontar problemas.
- Toda sugestão vem com justificativa técnica ("porque ICP premium de saúde busca X, e o perfil hoje entrega Y").
- Priorize por impacto na conversão para ticket alto — não em seguidores vaidade.
- Fale direto com a nutri, segunda pessoa, tom respeitoso mas sem adorno.
- Respeite compliance CFN (Conselho Federal de Nutricionistas):
  • nenhuma sugestão que implique promessa de cura
  • nenhuma comparação antes/depois com prazo fixo
  • evitar linguagem milagreira
  • reforçar que individualização clínica é necessária

VOCABULÁRIO PROIBIDO (contradiz o diferencial de personalização da marca):
- NUNCA use "protocolo" / "protocolos" em nenhuma sugestão ou bio
- NUNCA use "dieta padrão", "dieta pronta", "cardápio pronto"
- Use no lugar: "sinergias", "sinergias nutricionais", "mapa metabólico",
  "personalização por DNA", "plano feito pra você"

Saída: APENAS JSON válido, sem markdown, sem texto fora do JSON.

Schema da resposta:
{
  "diagnostico_primeira_impressao": "parágrafo curto — o que um paciente ICP pensa em 3 segundos",
  "clareza_posicionamento": "parágrafo curto — está claro o que essa nutri faz e pra quem?",
  "linha_editorial_atual": "parágrafo curto — que narrativa o perfil conta hoje (mesmo que não-intencional)",
  "forcas": ["item 1 específico", "item 2"],
  "fraquezas": ["item 1 específico", "item 2"],
  "gargalos_crescimento": ["por que ela não está crescendo em seguidor qualificado"],
  "gargalos_conversao": ["por que seguidor não vira lead de R$650/R$1800"],
  "erros_percepcao": ["o que o perfil comunica por engano"],
  "oportunidades_rapidas": ["mudança de até 1h que move o ponteiro"],
  "ideias_reposicionamento": ["ideia 1 com justificativa", "ideia 2"],
  "sugestoes_bio": ["versão 1 da bio (máx 150 chars)", "versão 2"],
  "sugestoes_destaques": ["tema 1", "tema 2", "tema 3", "tema 4"],
  "sugestoes_linha_editorial": "2-3 frases definindo o tom narrativo a manter",
  "mudancas_priorizadas": [
    { "ordem": 1, "titulo": "curto e acionável", "descricao": "2-3 frases", "impacto": "alto|medio|baixo", "esforco": "baixo|medio|alto", "onde_aplicar": "bio|destaques|posts|reels|stories|lp" }
  ]
}

Na lista mudancas_priorizadas, SEMPRE 10 itens, ordenados por impacto/esforço (quick wins primeiro).
`.trim();

type DadosOnboarding = {
  nome_comercial?: string;
  nome_completo?: string;
  bio_atual?: string;
  instagram_handle?: string;
  nicho_principal?: string;
  nicho_secundario?: string;
  publico_alvo_descricao?: string;
  diferenciais?: string;
  historia_pessoal?: string;
  tom_comunicacao?: string;
  cidade?: string;
  estado?: string;
  valor_consulta_inicial?: number;
  objetivo_anuncio?: string;
  palavras_chave_usar?: string[];
  palavras_evitar?: string;
  frase_pessoal?: string;
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
  onboarding: DadosOnboarding;
  instagram: DadosInstagram | null;
  postsInternos: Array<{ tipo: string; legenda: string; alcance: number | null; engajamento: number | null }>;
}): string {
  const { onboarding, instagram, postsInternos } = params;

  const blocos: string[] = [];

  blocos.push("=== DADOS DECLARADOS PELA NUTRI (onboarding) ===");
  blocos.push(
    Object.entries(onboarding)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n"),
  );

  if (instagram) {
    blocos.push("\n=== INSTAGRAM (via Graph API) ===");
    blocos.push(`bio: ${instagram.bio ?? "(não disponível)"}`);
    blocos.push(`seguidores: ${instagram.followers_count ?? "?"}`);
    blocos.push(`seguindo: ${instagram.follows_count ?? "?"}`);
    blocos.push(`posts totais: ${instagram.media_count ?? "?"}`);

    if (instagram.ultimos_posts?.length) {
      blocos.push("\nÚltimos posts:");
      instagram.ultimos_posts.slice(0, 12).forEach((p, i) => {
        const likes = p.like_count ?? 0;
        const comments = p.comments_count ?? 0;
        const caption = (p.caption ?? "").slice(0, 200);
        blocos.push(`  [${i + 1}] ${p.media_type} | ❤${likes} 💬${comments} | "${caption}${caption.length >= 200 ? "…" : ""}"`);
      });
    }
  } else {
    blocos.push("\n=== INSTAGRAM ===");
    blocos.push("(não conectado — análise limitada a dados declarados e posts gerados pelo sistema)");
  }

  if (postsInternos.length) {
    blocos.push("\n=== POSTS JÁ GERADOS PELO SISTEMA ===");
    postsInternos.slice(0, 10).forEach((p, i) => {
      blocos.push(
        `  [${i + 1}] ${p.tipo} | alcance:${p.alcance ?? "?"} eng:${p.engajamento ?? "?"} | "${p.legenda.slice(0, 150)}"`,
      );
    });
  }

  blocos.push(
    "\n=== PEDIDO ===",
    "Entregue o diagnóstico estratégico no formato JSON definido. 10 mudanças priorizadas obrigatórias. Brutalmente honesto, específico, aplicável.",
  );

  return blocos.join("\n");
}

export type ExecutarDiagnosticoInput = {
  franqueadaId: string;
};

export type ExecutarDiagnosticoResult = {
  ok: boolean;
  diagnosticoId?: string;
  erro?: string;
};

export async function executarDiagnosticoPerfil(
  input: ExecutarDiagnosticoInput,
): Promise<ExecutarDiagnosticoResult> {
  const admin = createAdminClient();

  const { data: f, error: fErr } = await admin
    .from("franqueadas")
    .select("*")
    .eq("id", input.franqueadaId)
    .maybeSingle();

  if (fErr || !f) return { ok: false, erro: fErr?.message ?? "Franqueada não encontrada" };

  const franqueada = f as Record<string, unknown>;

  const onboarding: DadosOnboarding = {
    nome_comercial: franqueada.nome_comercial as string,
    nome_completo: franqueada.nome_completo as string,
    bio_atual: franqueada.bio_atual as string,
    instagram_handle: franqueada.instagram_handle as string,
    nicho_principal: franqueada.nicho_principal as string,
    nicho_secundario: franqueada.nicho_secundario as string,
    publico_alvo_descricao: franqueada.publico_alvo_descricao as string,
    diferenciais: franqueada.diferenciais as string,
    historia_pessoal: franqueada.historia_pessoal as string,
    tom_comunicacao: franqueada.tom_comunicacao as string,
    cidade: franqueada.cidade as string,
    estado: franqueada.estado as string,
    valor_consulta_inicial: franqueada.valor_consulta_inicial as number,
    objetivo_anuncio: franqueada.objetivo_anuncio as string,
    palavras_chave_usar: franqueada.palavras_chave_usar as string[],
    palavras_evitar: franqueada.palavras_evitar as string,
    frase_pessoal: franqueada.frase_pessoal as string,
  };

  const instagram = await buscarDadosInstagram(franqueada);

  const { data: postsAnteriores } = await admin
    .from("posts_agendados")
    .select("tipo_post, copy_legenda, alcance, taxa_engajamento")
    .eq("franqueada_id", input.franqueadaId)
    .in("status", ["postado", "aguardando_aprovacao", "aprovado"])
    .order("criado_em", { ascending: false })
    .limit(10);

  const postsInternos = (postsAnteriores ?? []).map((p) => ({
    tipo: (p as { tipo_post: string }).tipo_post,
    legenda: (p as { copy_legenda: string }).copy_legenda ?? "",
    alcance: (p as { alcance: number | null }).alcance,
    engajamento: (p as { taxa_engajamento: number | null }).taxa_engajamento,
  }));

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: montarUserMessage({ onboarding, instagram, postsInternos }),
        },
      ],
    });

    const block = resp.content[0];
    if (!block || block.type !== "text") {
      return { ok: false, erro: "Resposta do Claude em formato inesperado" };
    }
    responseText = block.text;
    usage = {
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      cache_read_input_tokens: resp.usage.cache_read_input_tokens ?? 0,
    };
  } catch (e) {
    return { ok: false, erro: `Claude falhou: ${e instanceof Error ? e.message : String(e)}` };
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
    (usage.input_tokens * 3) / 1_000_000 +
    (usage.output_tokens * 15) / 1_000_000;

  const { data: salvo, error: saveErr } = await admin
    .from("diagnosticos_perfil")
    .insert({
      franqueada_id: input.franqueadaId,
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
      fonte_dados_onboarding: onboarding,
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

  if (saveErr) return { ok: false, erro: `Erro ao salvar: ${saveErr.message}` };

  return { ok: true, diagnosticoId: (salvo as { id: string }).id };
}

async function buscarDadosInstagram(
  franqueada: Record<string, unknown>,
): Promise<DadosInstagram | null> {
  const tokenCriptografado = franqueada.instagram_access_token as string | undefined;
  const contaId = franqueada.instagram_conta_id as string | undefined;
  if (!tokenCriptografado || !contaId) return null;

  // TODO: descriptografar token quando pacote de crypto estiver wireado
  // Por enquanto, se o valor aparenta ser plain text (raro, dev apenas), tenta usar
  const token = tokenCriptografado;
  if (token.length < 20) return null;

  try {
    const base = `https://graph.facebook.com/v21.0/${contaId}`;
    const perfilRes = await fetch(
      `${base}?fields=biography,followers_count,follows_count,media_count&access_token=${token}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!perfilRes.ok) return null;
    const perfil = (await perfilRes.json()) as {
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
      bio: perfil.biography,
      followers_count: perfil.followers_count,
      follows_count: perfil.follows_count,
      media_count: perfil.media_count,
      ultimos_posts: ultimos ?? [],
    };
  } catch {
    return null;
  }
}

export async function buscarUltimoDiagnostico(franqueadaId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("diagnosticos_perfil")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
