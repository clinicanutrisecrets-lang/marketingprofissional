"use server";

import { createClient, createAlineClient } from "@/lib/supabase/server";
import { generateVideo, pollUntilReady } from "@/lib/heygen/client";
import { gerarScriptReel, type Perfil } from "@/lib/claude/scripts";
import { revalidatePath } from "next/cache";

async function assertSuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: admin } = await supabase
    .from("admins")
    .select("papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const adminRow = admin as { papel?: string } | null;
  if (!adminRow || adminRow.papel !== "super_admin") {
    throw new Error("Só super_admin pode usar HeyGen");
  }
  return user.id;
}

/**
 * Pipeline completo: Claude → HeyGen → upload Supabase → cria post pendente.
 */
export async function gerarReelHeyGen(params: {
  perfilId: string;
  briefing: string;
  duracaoSeg?: number;
}): Promise<{ ok: boolean; postId?: string; videoUrl?: string; erro?: string }> {
  try {
    const userId = await assertSuperAdmin();
    const aline = createAlineClient();

    // Verifica config HeyGen
    if (process.env.HEYGEN_API_ENABLED !== "true") {
      return { ok: false, erro: "HeyGen API desabilitada (HEYGEN_API_ENABLED != true)" };
    }
    const avatarId = process.env.HEYGEN_AVATAR_ID;
    const voiceId = process.env.HEYGEN_VOICE_ID;
    if (!avatarId || !voiceId) {
      return { ok: false, erro: "HEYGEN_AVATAR_ID/VOICE_ID não configurados" };
    }

    // 1. Busca perfil
    const { data: perfilData } = await aline
      .from("perfis")
      .select("*")
      .eq("id", params.perfilId)
      .maybeSingle();

    if (!perfilData) return { ok: false, erro: "Perfil não encontrado" };
    const p = perfilData as Record<string, unknown>;
    const perfil: Perfil = {
      slug: p.slug as string,
      nome: p.nome as string,
      instagram_handle: p.instagram_handle as string,
      objetivo: p.objetivo as string,
      tom: p.tom as string,
      pilares: (p.pilares as Array<{ nome: string; pct: number }>) ?? [],
      regras_especiais: p.regras_especiais as string,
      instrucoes_ia: p.instrucoes_ia as string,
    };

    // 2. Claude gera script
    const script = await gerarScriptReel({
      perfil,
      briefing: params.briefing,
      duracaoSeg: params.duracaoSeg ?? 60,
    });

    // 3. HeyGen renderiza
    const { video_id } = await generateVideo({
      avatarId,
      voiceId,
      script: script.script,
      width: 1080,
      height: 1920,
    });

    // 4. Polling até pronto (~2-5 min)
    const { video_url, thumbnail_url, duration } = await pollUntilReady(video_id, {
      maxTentativas: 60,
      intervaloMs: 10_000,
    });

    // 5. Cria post no Supabase com URL HeyGen direta
    // (futuramente: baixar e re-uploadar pro Supabase Storage pra independência)
    const { data: novo, error } = await aline
      .from("posts")
      .insert({
        perfil_id: params.perfilId,
        tipo: "reels",
        status: "aguardando_aprovacao",
        origem: "ia",
        copy_legenda: `${script.script}\n\n${script.cta_legenda}`,
        copy_cta: script.cta_legenda,
        hashtags: script.hashtags,
        pilar: perfil.pilares[0]?.nome,
        prompt_usado: params.briefing,
        copy_legenda_ia_original: script.script,
        copy_cta_ia_original: script.cta_legenda,
        hashtags_ia_original: script.hashtags,
        ia_model_usado: "claude-sonnet-4-5",
        heygen_video_id: video_id,
        heygen_script: script.script,
        gerado_por_ia_video: true,
        bannerbear_preview_url: thumbnail_url,
      })
      .select("id")
      .single();

    if (error) return { ok: false, erro: error.message };

    // Salva mídia
    await aline.from("post_midias").insert({
      post_id: (novo as { id: string }).id,
      ordem: 1,
      tipo: "video",
      url: video_url,
      duracao_seg: duration ? Math.round(duration) : undefined,
    });

    revalidatePath(`/perfis/${perfil.slug}`);
    return { ok: true, postId: (novo as { id: string }).id, videoUrl: video_url };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Versão "só script" — gera apenas o texto sem renderizar vídeo.
 * Útil pro modo manual: nutri pega o script e gera no HeyGen ela mesma.
 */
export async function gerarApenasScript(params: {
  perfilId: string;
  briefing: string;
  duracaoSeg?: number;
}): Promise<{
  ok: boolean;
  script?: { titulo: string; script: string; cta_legenda: string; hashtags: string[] };
  erro?: string;
}> {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();

    const { data: perfilData } = await aline
      .from("perfis")
      .select("*")
      .eq("id", params.perfilId)
      .maybeSingle();

    if (!perfilData) return { ok: false, erro: "Perfil não encontrado" };
    const p = perfilData as Record<string, unknown>;
    const perfil: Perfil = {
      slug: p.slug as string,
      nome: p.nome as string,
      instagram_handle: p.instagram_handle as string,
      objetivo: p.objetivo as string,
      tom: p.tom as string,
      pilares: (p.pilares as Array<{ nome: string; pct: number }>) ?? [],
      regras_especiais: p.regras_especiais as string,
      instrucoes_ia: p.instrucoes_ia as string,
    };

    const script = await gerarScriptReel({
      perfil,
      briefing: params.briefing,
      duracaoSeg: params.duracaoSeg ?? 60,
    });

    return { ok: true, script };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
