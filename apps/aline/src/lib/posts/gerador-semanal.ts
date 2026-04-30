"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";
import { CLAUDE_MODEL } from "@/lib/claude/scripts";
import { gerarEUploadImagem } from "@/lib/ai-image/render";
import {
  FRAMEWORK_EUGENE_SCHWARTZ,
  FRAMEWORK_CALPES_HEADLINES,
  FRAMEWORK_CIALDINI_GATILHOS,
  FRAMEWORK_DONALD_MILLER_SB7,
  FRAMEWORKS_MATRIZ_USO,
  COMPLIANCE_CFN_2026_RESUMO,
} from "@/lib/agentes/_frameworks";

type Pilar = { nome: string; pct: number };

type PostGerado = {
  pilar: string;
  angulo: string;
  copy_legenda: string;
  copy_cta: string;
  hashtags: string[];
  // Campos pra arte (sao usados no prompt da imagem)
  arte_headline: string; // frase forte, 3-8 palavras, max 60 chars
  arte_subtitle?: string; // apoio, max 80 chars
  arte_eyebrow?: string; // pequena tag em cima, max 30 chars
};

/**
 * Gera N posts (texto + arte) pra um perfil seguindo distribuicao dos pilares.
 *
 * Por enquanto so gera tipo `feed_imagem`. Carrossel/reels ficam pra proxima
 * iteracao (carrossel precisa decompor em slides; reels precisa Heygen ou upload manual).
 *
 * Cria registros em aline.posts com:
 *   status = 'aguardando_aprovacao'
 *   midia_pendente = false (arte ja gerada)
 *   aprovacao_tipo = 'bloco_semanal'
 * E em aline.post_midias salva URL da imagem.
 */
export async function gerarPackSemanal(params: {
  perfilSlug: string;
  semanaRef?: string;
  qtd?: number;
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

    const { data: existentes } = await aline
      .from("posts")
      .select("id")
      .eq("perfil_id", perfil.id as string)
      .eq("semana_ref", semanaRef)
      .eq("aprovacao_tipo", "bloco_semanal");

    if (existentes && existentes.length > 0) {
      return {
        ok: false,
        erro: `Pack semanal ${semanaRef} ja existe (${existentes.length} posts). Cancele/delete antes de gerar de novo.`,
      };
    }

    const pilares = (perfil.pilares as Pilar[]) ?? [];
    const distribuicao = distribuirPilares(pilares, qtd);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, erro: "ANTHROPIC_API_KEY nao configurada" };
    const claude = new Anthropic({ apiKey });

    const systemPrompt = montarSystemPrompt(perfil);
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

    const custoCopy =
      (resp.usage.input_tokens / 1_000_000) * 3 +
      (resp.usage.output_tokens / 1_000_000) * 15;

    // 1. Insere posts (sem midia ainda) — assim ja temos IDs pra associar a arte
    const slots = gerarSlots(semanaRef, posts.length);
    const inserts = posts.map((p, i) => ({
      perfil_id: perfil.id as string,
      semana_ref: semanaRef,
      tipo: "feed_imagem" as const,
      status: "aguardando_aprovacao",
      origem: "ia",
      aprovacao_tipo: "bloco_semanal",
      midia_pendente: true, // sera atualizado pra false apos gerar arte
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

    if (error) return { ok: false, erro: `Insert posts: ${error.message}` };
    const insertedRows = (inserted ?? []) as Array<{ id: string }>;

    // 2. Gera arte de cada post em paralelo (Promise.allSettled — falhas individuais nao tombam o pack)
    const brand = {
      nomeMarca: (perfil.nome as string) ?? params.perfilSlug,
      corPrimariaHex: (perfil.cor_primaria as string) ?? "#0BB8A8",
      corSecundariaHex: (perfil.cor_secundaria as string) ?? undefined,
      tomVisual: (perfil.tom as string) ?? undefined,
      nicho: (perfil.objetivo as string) ?? undefined,
    };

    const resultados = await Promise.allSettled(
      insertedRows.map((row, i) =>
        gerarArteParaPost({
          postId: row.id,
          perfilId: perfil.id as string,
          perfilSlug: params.perfilSlug,
          brand,
          conteudo: {
            headline: posts[i].arte_headline,
            subtitle: posts[i].arte_subtitle,
            eyebrow: posts[i].arte_eyebrow,
            cta: posts[i].copy_cta,
          },
        }),
      ),
    );

    const custoArte = resultados.reduce(
      (acc, r) => acc + (r.status === "fulfilled" ? r.value.custoUsd : 0),
      0,
    );

    return {
      ok: true,
      postIds: insertedRows.map((r) => r.id),
      semanaRef,
      custoUsd: custoCopy + custoArte,
    };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Re-gera apenas a arte de um post existente. Substitui a midia em post_midias.
 * Usado pelo botao "Regenerar arte" na tela de aprovacao.
 */
export async function regenerarArtePost(
  postId: string,
): Promise<{ ok: boolean; url?: string; custoUsd?: number; erro?: string }> {
  try {
    const aline = createAlineClient();

    const { data: postData } = await aline
      .from("posts")
      .select("*")
      .eq("id", postId)
      .maybeSingle();
    if (!postData) return { ok: false, erro: "Post nao encontrado" };
    const post = postData as Record<string, unknown>;

    const { data: perfilData } = await aline
      .from("perfis")
      .select("*")
      .eq("id", post.perfil_id as string)
      .maybeSingle();
    if (!perfilData) return { ok: false, erro: "Perfil nao encontrado" };
    const perfil = perfilData as Record<string, unknown>;

    const brand = {
      nomeMarca: (perfil.nome as string) ?? "",
      corPrimariaHex: (perfil.cor_primaria as string) ?? "#0BB8A8",
      corSecundariaHex: (perfil.cor_secundaria as string) ?? undefined,
      tomVisual: (perfil.tom as string) ?? undefined,
      nicho: (perfil.objetivo as string) ?? undefined,
    };

    // Usa angulo + 1a frase da legenda como headline se nao tiver headline_arte salvo
    const headline = (post.angulo as string) || extrairPrimeiraFrase(post.copy_legenda as string);
    const r = await gerarArteParaPost({
      postId,
      perfilId: perfil.id as string,
      perfilSlug: perfil.slug as string,
      brand,
      conteudo: {
        headline,
        cta: (post.copy_cta as string) ?? undefined,
      },
      sobrescrever: true,
    });

    return { ok: true, url: r.url, custoUsd: r.custoUsd };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

// ============== HELPERS ==============

async function gerarArteParaPost(params: {
  postId: string;
  perfilId: string;
  perfilSlug: string;
  brand: {
    nomeMarca: string;
    corPrimariaHex: string;
    corSecundariaHex?: string;
    tomVisual?: string;
    nicho?: string;
  };
  conteudo: {
    headline: string;
    subtitle?: string;
    eyebrow?: string;
    cta?: string;
  };
  sobrescrever?: boolean;
}): Promise<{ url: string; custoUsd: number }> {
  const aline = createAlineClient();

  const r = await gerarEUploadImagem({
    perfilId: params.perfilId,
    perfilSlug: params.perfilSlug,
    tipo: "feed_imagem",
    brand: params.brand,
    conteudo: params.conteudo,
  });

  if (params.sobrescrever) {
    await aline.from("post_midias").delete().eq("post_id", params.postId);
  }

  await aline.from("post_midias").insert({
    post_id: params.postId,
    ordem: 0,
    tipo: "imagem",
    url: r.url,
    largura_px: 1080,
    altura_px: 1080,
  });

  await aline
    .from("posts")
    .update({ midia_pendente: false })
    .eq("id", params.postId);

  return { url: r.url, custoUsd: r.meta.custoEstimadoUsd };
}

function proximaSegunda(): string {
  const hoje = new Date();
  const dow = hoje.getUTCDay();
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
  const base = new Date(`${semanaRef}T12:00:00Z`); // 9h UTC-3
  const offsets = [0, 2, 4, 7, 9, 11, 14];
  const slots: string[] = [];
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + offsets[i % offsets.length]);
    slots.push(d.toISOString());
  }
  return slots;
}

function extrairPrimeiraFrase(texto: string): string {
  const f = texto.split(/[.!?\n]/)[0]?.trim() ?? "";
  return f.slice(0, 60);
}

function montarSystemPrompt(perfil: Record<string, unknown>): string {
  const pilaresStr = (perfil.pilares as Pilar[])
    ?.map((p) => `  - ${p.nome}: ${p.pct}%`)
    .join("\n");

  return `Voce e estrategista de conteudo Instagram do perfil @${perfil.instagram_handle}.

Use os frameworks abaixo como base mental — escolha consciente por post:
- Schwartz pra escolher abordagem (estagio de awareness)
- Caples pra construir headline_arte
- Cialdini pra incluir 1-2 gatilhos psicologicos QUANDO couber
- Miller (StoryBrand) APENAS quando for caso/storytelling/sobre — NAO em todo post

LEIA A MATRIZ ABAIXO ANTES DE GERAR — varie tipos pra nao saturar.

${FRAMEWORKS_MATRIZ_USO}

${FRAMEWORK_EUGENE_SCHWARTZ}

${FRAMEWORK_CALPES_HEADLINES}

${FRAMEWORK_CIALDINI_GATILHOS}

${FRAMEWORK_DONALD_MILLER_SB7}

${COMPLIANCE_CFN_2026_RESUMO}

=== ESTE PERFIL ===
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

REGRAS DE ARTE (campos arte_*):
- Sao o que vai ser ESTAMPADO na imagem do post.
- arte_headline: frase principal, 3-8 palavras, MAXIMO 60 caracteres. Forte, direta, sem clickbait. Vai ser texto grande na imagem.
- arte_subtitle (opcional): frase de apoio que complementa, MAXIMO 80 caracteres.
- arte_eyebrow (opcional): pequena tag/categoria em cima do headline, MAXIMO 30 caracteres. Ex: "DICA RAPIDA", "MITO OU VERDADE", "ATENCAO".
- O conjunto headline+subtitle precisa fazer sentido SOZINHO (quem ve a imagem sem ler legenda entende).
- Banir emoji nos campos arte_*.`;
}

function montarUserPrompt(
  perfil: Record<string, unknown>,
  distribuicao: string[],
  semanaRef: string,
): string {
  const lista = distribuicao.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
  return `Gere ${distribuicao.length} posts pro Instagram @${perfil.instagram_handle} pra semana iniciando em ${semanaRef}.

TODOS sao tipo feed_imagem (post unico com 1 imagem).

PILARES DA SEMANA (na ordem):
${lista}

Pra cada post, defina:
- pilar: o pilar atribuido acima
- angulo: gancho/ideia central em 1 frase (uso interno)
- copy_legenda: texto da legenda (80-180 palavras)
- copy_cta: linha de CTA isolada
- hashtags: array de strings SEM o # (5-15 itens)
- arte_headline: frase forte que vai estampar a imagem (3-8 palavras, max 60 chars)
- arte_subtitle: apoio opcional (max 80 chars)
- arte_eyebrow: tag opcional em cima (max 30 chars)

Devolva APENAS um JSON valido no formato:
{
  "posts": [
    {
      "pilar": "...", "angulo": "...",
      "copy_legenda": "...", "copy_cta": "...", "hashtags": ["..."],
      "arte_headline": "...", "arte_subtitle": "...", "arte_eyebrow": "..."
    }
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
