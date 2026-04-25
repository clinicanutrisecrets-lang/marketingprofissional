"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL } from "@/lib/claude/scripts";

type Pilar = { nome: string; pct: number };

type PostGerado = {
  pilar: string;
  angulo: string;
  tipo: "feed_imagem" | "feed_carrossel" | "reels";
  copy_legenda: string;
  copy_cta: string;
  hashtags: string[];
};

/**
 * Gera N copies de posts pra um perfil seguindo distribuicao dos pilares.
 * Cria registros em aline.posts com:
 *   status = 'aguardando_aprovacao'
 *   midia_pendente = true
 *   aprovacao_tipo = 'bloco_semanal'
 * E agenda em slots default (seg/qua/sex 9h da semana_ref).
 *
 * NAO publica — apenas prepara fila. Aline aprova em bloco e sobe midias.
 */
export async function gerarPackSemanal(params: {
  perfilSlug: string;
  semanaRef?: string; // ISO date (YYYY-MM-DD); default = proxima segunda
  qtd?: number; // default 5 posts/semana
}): Promise<{
  ok: boolean;
  postIds?: string[];
  semanaRef?: string;
  erro?: string;
  custoUsd?: number;
}> {
  try {
    const aline = createAlineClient();
    const qtd = params.qtd ?? 5;

    const { data: perfilData } = await aline
      .from("perfis")
      .select("*")
      .eq("slug", params.perfilSlug)
      .maybeSingle();

    if (!perfilData) return { ok: false, erro: `Perfil ${params.perfilSlug} nao existe` };
    const perfil = perfilData as Record<string, unknown>;

    const semanaRef = params.semanaRef ?? proximaSegunda();

    // Evita duplicar pack na mesma semana
    const { data: existentes } = await aline
      .from("posts")
      .select("id")
      .eq("perfil_id", perfil.id as string)
      .eq("semana_ref", semanaRef)
      .eq("aprovacao_tipo", "bloco_semanal");

    if (existentes && existentes.length > 0) {
      return {
        ok: false,
        erro: `Pack semanal ${semanaRef} ja existe (${existentes.length} posts)`,
      };
    }

    const pilares = (perfil.pilares as Pilar[]) ?? [];
    const distribuicao = distribuirPilares(pilares, qtd);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, erro: "ANTHROPIC_API_KEY nao configurada" };
    const claude = new Anthropic({ apiKey });

    const systemPrompt = montarSystemPrompt(perfil, distribuicao);
    const userPrompt = montarUserPrompt(perfil, distribuicao, semanaRef);

    const resp = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }] as never,
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = resp.content
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { type: string; text?: string }) => c.text ?? "")
      .join("\n");

    const posts = parsePostsJson(texto);
    if (posts.length === 0) {
      return { ok: false, erro: "Claude nao retornou posts validos" };
    }

    // Calcula custo (sonnet 4.5: ~$3/1M input, $15/1M output)
    const custoUsd =
      (resp.usage.input_tokens / 1_000_000) * 3 +
      (resp.usage.output_tokens / 1_000_000) * 15;

    // Slots default: seg/qua/sex/seg/qua na semana_ref (9h)
    const slots = gerarSlots(semanaRef, posts.length);

    const inserts = posts.map((p, i) => ({
      perfil_id: perfil.id as string,
      semana_ref: semanaRef,
      tipo: p.tipo,
      status: "aguardando_aprovacao",
      origem: "ia",
      aprovacao_tipo: "bloco_semanal",
      midia_pendente: true,
      copy_legenda: p.copy_legenda,
      copy_cta: p.copy_cta,
      hashtags: p.hashtags,
      pilar: p.pilar,
      angulo: p.angulo,
      copy_legenda_ia_original: p.copy_legenda,
      copy_cta_ia_original: p.copy_cta,
      hashtags_ia_original: p.hashtags,
      ia_model_usado: CLAUDE_MODEL,
      ia_tokens_input: resp.usage.input_tokens,
      ia_tokens_output: resp.usage.output_tokens,
      ia_tokens_cached:
        (resp.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
      data_hora_agendada: slots[i],
    }));

    const { data: inserted, error } = await aline
      .from("posts")
      .insert(inserts)
      .select("id");

    if (error) return { ok: false, erro: `Insert: ${error.message}` };

    const insertedRows = (inserted ?? []) as Array<{ id: string }>;
    return {
      ok: true,
      postIds: insertedRows.map((r) => r.id),
      semanaRef,
      custoUsd,
    };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

// ============== HELPERS ==============

function proximaSegunda(): string {
  const hoje = new Date();
  const dow = hoje.getUTCDay(); // 0=dom, 1=seg
  const diasAteSegunda = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  const seg = new Date(hoje);
  seg.setUTCDate(hoje.getUTCDate() + diasAteSegunda);
  return seg.toISOString().slice(0, 10);
}

function distribuirPilares(pilares: Pilar[], qtd: number): string[] {
  if (pilares.length === 0) return Array(qtd).fill("geral");
  const total = pilares.reduce((s, p) => s + p.pct, 0) || 100;
  const out: string[] = [];
  for (const p of pilares) {
    const n = Math.round((p.pct / total) * qtd);
    for (let i = 0; i < n; i++) out.push(p.nome);
  }
  while (out.length < qtd) out.push(pilares[0].nome);
  return out.slice(0, qtd);
}

function gerarSlots(semanaRef: string, qtd: number): string[] {
  // seg, qua, sex, seg+1, qua+1 ... 9h UTC-3 (12h UTC)
  const base = new Date(`${semanaRef}T12:00:00Z`);
  const offsets = [0, 2, 4, 7, 9, 11, 14];
  const slots: string[] = [];
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + offsets[i % offsets.length]);
    slots.push(d.toISOString());
  }
  return slots;
}

function montarSystemPrompt(perfil: Record<string, unknown>, distribuicao: string[]): string {
  const pilaresStr = (perfil.pilares as Pilar[])
    ?.map((p) => `  - ${p.nome}: ${p.pct}%`)
    .join("\n");

  return `Voce e estrategista de conteudo Instagram do perfil @${perfil.instagram_handle}.

PERFIL:
- Nome: ${perfil.nome}
- Objetivo: ${perfil.objetivo}
- Tom: ${perfil.tom}
${perfil.regras_especiais ? `- Regra especial: ${perfil.regras_especiais}` : ""}

PILARES DE CONTEUDO (peso semanal):
${pilaresStr ?? "  (sem pilares definidos)"}

REGRAS DE COPY:
- Hook nos primeiros 3-5 segundos (1a linha precisa parar o scroll).
- Sem clickbait sensacionalista. Autoridade > viralizacao barata.
- Sem "voce sabia que" / "hoje vou falar" / "nesse post".
- CTA claro no final (salvar, comentar, agendar etc.).
- 5-15 hashtags por post, mistura nicho + amplo.
- Legenda 80-180 palavras.
- Banir a palavra "protocolo" (use "plano", "trilha", "rotina").

REGRAS DE TIPO:
- "feed_imagem": post unico com 1 imagem. Ideal pra frase forte ou dado.
- "feed_carrossel": 5-8 slides com narrativa progressiva. Educacao, antes/depois, top N.
- "reels": script com hook + 3 pontos + CTA. Ideal pra alcance organico.

VOCE VAI RECEBER A LISTA DE PILARES DA SEMANA e devolver JSON com 1 post por pilar.`;
}

function montarUserPrompt(
  perfil: Record<string, unknown>,
  distribuicao: string[],
  semanaRef: string,
): string {
  const lista = distribuicao.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
  return `Gere ${distribuicao.length} posts pro Instagram @${perfil.instagram_handle} pra semana iniciando em ${semanaRef}.

PILARES DA SEMANA (na ordem):
${lista}

Pra cada post, defina:
- pilar: o pilar atribuido acima
- angulo: gancho/ideia central em 1 frase
- tipo: "feed_imagem" | "feed_carrossel" | "reels" (varie — nao seja repetitivo)
- copy_legenda: texto da legenda (80-180 palavras)
- copy_cta: linha de CTA isolada
- hashtags: array de strings SEM o # (5-15 itens)

Devolva APENAS um JSON valido no formato:
{
  "posts": [
    { "pilar": "...", "angulo": "...", "tipo": "...", "copy_legenda": "...", "copy_cta": "...", "hashtags": ["..."] }
  ]
}`;
}

function parsePostsJson(texto: string): PostGerado[] {
  try {
    const limpo = texto
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    const match = limpo.match(/\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { posts?: PostGerado[] };
    return parsed.posts ?? [];
  } catch {
    return [];
  }
}
