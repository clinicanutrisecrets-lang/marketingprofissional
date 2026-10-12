"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { createClaude } from "@/lib/claude/client";
import { SYSTEM_SPEC, normalizarSpecReel, type DuracaoReel } from "./spec";
import { blocoPublicoReel, resumoDoRoteiro, type PublicoReel, type ResumoRoteiro } from "./publico";

/**
 * "Desenhar o vídeo" de um reel do Studio (Aline, 12/10/2026).
 *
 * É o MESMO reel animado do Marketing do Avançado ("Detetive da Saúde":
 * personagem com o sintoma circulado, gene, sinergia de alimentos desenhada):
 * o agente escreve o SPEC a partir da legenda do post e o worker do GitHub
 * (render-reel.yml, Python/PIL + ffmpeg, custo zero de imagem e nada de
 * avatar) desenha o MP4. Quando fica pronto, o próprio worker liga o vídeo
 * ao post em aline.post_midias e devolve o post pra aprovação.
 *
 * 🔴 O CONTEÚDO É O DO SCANNER, CURADO: antes do roteiro o Studio pergunta à
 * base do Scanner (`/api/integrations/marketing/conhecimento?modo=conteudo`,
 * a mesma curadoria do Cérebro Aline: genes com rs, faixas ideais, alimentos
 * e doses). Sem curadoria sobre o tema, o vídeo NÃO é desenhado: roteiro de
 * gene inventado é exatamente o que o Scanner existe pra impedir.
 *
 * 🔴 Enquanto desenha, o post fica em `gerando` (o feed mostra "em
 * produção"). Se o worker falhar, ele volta pra `aguardando_midia`, nunca
 * fica preso em `gerando`.
 */

const REPO = "clinicanutrisecrets-lang/marketingprofissional";
const MODEL = "claude-sonnet-4-5";

async function assertSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data: admin } = await supabase
    .from("admins").select("papel").eq("auth_user_id", user.id).maybeSingle();
  const row = admin as { papel?: string } | null;
  if (!row || row.papel !== "super_admin") throw new Error("Só super_admin pode desenhar vídeo");
}

async function conteudoCuradoDoScanner(tema: string): Promise<{ blocos: string; total: number } | { erro: string }> {
  const base = (process.env.SCANNER_API_URL ?? "https://scannerdasaude.com").replace(/\/$/, "");
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return { erro: "O Studio não está ligado à curadoria do Scanner (falta STUDIO_CONHECIMENTO_SECRET)." };
  const url = new URL(`${base}/api/integrations/marketing/conhecimento`);
  url.searchParams.set("q", tema.slice(0, 500));
  url.searchParams.set("modo", "conteudo");
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { erro: `A curadoria do Scanner não respondeu (${res.status}). Tente de novo.` };
    const json = (await res.json()) as { blocos?: string; total?: number };
    return { blocos: json.blocos ?? "", total: json.total ?? 0 };
  } catch {
    return { erro: "A curadoria do Scanner não respondeu a tempo. Tente de novo." };
  }
}

export async function desenharVideoDoPost(params: {
  postId: string;
  /** O que o vídeo explica (ex.: "FTO e fome à noite"). Vazio = a legenda do post. */
  tema?: string;
  publico?: PublicoReel;
  duracao?: DuracaoReel;
}): Promise<{ ok: true; roteiro: ResumoRoteiro } | { ok: false; erro: string }> {
  try {
    await assertSuperAdmin();
    const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
      return { ok: false, erro: "O robô que desenha o vídeo ainda não está ligado no Studio (falta GITHUB_ACTIONS_TOKEN na Vercel do studio-aline)." };
    }
    const aline = createAlineClient();

    const { data: postData, error: postErr } = await aline
      .from("posts")
      .select("id, perfil_id, tipo, status, copy_legenda, pilar, angulo")
      .eq("id", params.postId)
      .maybeSingle();
    if (postErr || !postData) return { ok: false, erro: "Post não encontrado." };
    const post = postData as {
      id: string; perfil_id: string; tipo: string; status: string;
      copy_legenda: string | null; pilar: string | null; angulo: string | null;
    };
    if (post.status === "gerando") return { ok: false, erro: "Este vídeo já está sendo desenhado." };
    if (post.status === "postado") return { ok: false, erro: "Este post já foi ao ar." };
    const legenda = (post.copy_legenda ?? "").trim();
    const temaPedido = (params.tema ?? "").trim();
    const publico: PublicoReel = params.publico === "profissional" ? "profissional" : "paciente";
    if (!temaPedido && legenda.length < 20) {
      return { ok: false, erro: "Diga o que o vídeo explica (ex.: FTO e fome à noite), ou escreva a legenda do post antes." };
    }
    const temaBusca = temaPedido || legenda.slice(0, 400);
    const curadoria = await conteudoCuradoDoScanner(temaBusca);
    if ("erro" in curadoria) return { ok: false, erro: curadoria.erro };
    if (curadoria.total === 0 || curadoria.blocos.trim().length < 40) {
      return {
        ok: false,
        erro: `O Scanner não tem curadoria sobre "${temaBusca.slice(0, 60)}". Escreva o tema pelo nome do gene, do exame ou da bactéria (ex.: FTO, ferritina, Akkermansia).`,
      };
    }

    const { data: perfilData } = await aline
      .from("perfis")
      .select("slug, nome, instagram_handle, instagram_username, publico_alvo, nicho_principal")
      .eq("id", post.perfil_id)
      .maybeSingle();
    const perfil = (perfilData ?? {}) as {
      slug?: string; nome?: string; instagram_handle?: string | null; instagram_username?: string | null;
      publico_alvo?: string | null; nicho_principal?: string | null;
    };
    const handleBruto = perfil.instagram_username || perfil.instagram_handle || perfil.slug || "nutri_secrets";
    const handle = handleBruto.startsWith("@") ? handleBruto : `@${handleBruto}`;

    const anthropic = createClaude();
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_SPEC,
      messages: [{
        role: "user",
        content: [
          JSON.stringify({
            tema: temaPedido || legenda.slice(0, 1500),
            duracao: params.duracao ?? "60s",
            assinatura: perfil.nome ?? "",
            nicho: perfil.nicho_principal ?? null,
            legenda_do_post: temaPedido && legenda ? legenda.slice(0, 1200) : null,
          }),
          blocoPublicoReel(publico),
          "CURADORIA DO SCANNER (a ÚNICA fonte permitida pra gene, rs, genótipo, marcador, faixa, alimento, quantidade e dose):",
          curadoria.blocos.slice(0, 14000),
          "REGRA: todo gene, rs, marcador, faixa e alimento do SPEC TEM que aparecer na curadoria acima. O que não estiver nela não entra no vídeo, mesmo que você conheça. Se a curadoria não sustentar um bloco inteiro, faça o reel mais curto em vez de inventar.",
        ].join("\n\n"),
      }],
    });
    const texto = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, erro: "O roteiro do vídeo não saiu. Tente de novo." };
    let bruto: Record<string, unknown>;
    try {
      bruto = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return { ok: false, erro: "O roteiro do vídeo veio quebrado. Tente de novo." };
    }
    const spec = normalizarSpecReel(bruto);
    spec.assinatura = perfil.nome ?? "";
    const roteiro = resumoDoRoteiro(spec, publico, curadoria.total);

    const destino = `aline/${perfil.slug ?? post.perfil_id}/reels/${post.id}-${Date.now()}.mp4`;

    // Reserva ANTES de disparar: dois cliques seguidos não podem virar dois renders.
    const { data: reservado, error: resErr } = await aline
      .from("posts")
      .update({ status: "gerando", heygen_script: JSON.stringify({ tipo: "reel_desenhado", publico, tema: temaBusca, spec }) })
      .eq("id", post.id)
      .neq("status", "gerando")
      .select("id");
    if (resErr) return { ok: false, erro: "Não deu pra marcar o post como em produção." };
    if (!reservado || reservado.length === 0) return { ok: false, erro: "Este vídeo já está sendo desenhado." };

    const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-reel.yml/dispatches`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
        inputs: {
          spec_b64: Buffer.from(JSON.stringify(spec)).toString("base64"),
          destino_path: destino,
          handle,
          aline_post_id: post.id,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
      }),
    });
    if (!resp.ok) {
      await aline.from("posts").update({ status: post.status }).eq("id", post.id);
      const corpo = await resp.text();
      return { ok: false, erro: `O robô não aceitou o pedido (${resp.status}): ${corpo.slice(0, 120)}` };
    }

    revalidatePath(`/perfis/${perfil.slug ?? ""}/feed`);
    return { ok: true, roteiro };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}
