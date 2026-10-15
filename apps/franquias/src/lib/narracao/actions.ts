"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { VIDEOS_METODOLOGIA } from "@/lib/videos/metodologia";
import { VIDEOS_MARCA } from "@/lib/videos/marca";
import { pathVideoMarcaPronto } from "@/lib/videos/marca-servidor";

/**
 * Narração gravada por cima do vídeo (Aline, 13/10/2026). Fluxo:
 *
 *  1. prepararNarracaoAction → confere de quem é o vídeo, cria a linha em
 *     `narracoes_video` e devolve a URL assinada; o navegador sobe a VOZ
 *     direto pro Storage (não passa pela Vercel).
 *  2. montarNarracaoAction   → confere que o áudio chegou e dispara o worker
 *     (.github/workflows/narrar-video.yml), que junta voz e vídeo com ffmpeg.
 *  3. O worker marca `pronto` com a URL do MP4 narrado.
 *
 * Sem modelo nenhum: custo zero de IA.
 */

const REPO = "clinicanutrisecrets-lang/marketingprofissional";
const BUCKET = "franqueadas-assets";
const MAX_BYTES = 30 * 1024 * 1024; // 2 min de voz cabem com folga

export type OrigemNarracao = "reel" | "metodologia" | "marca";

export type Narracao = {
  id: string;
  origem: OrigemNarracao;
  ref: string;
  status: "enviando" | "montando" | "pronto" | "erro";
  url: string | null;
  erro_msg: string | null;
  criado_em: string;
};

async function franqueadaId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("franqueadas").select("id").eq("auth_user_id", user.id).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/** De onde o worker tira o vídeo: caminho no Storage (reel) ou URL pública (metodologia). */
async function videoDaOrigem(
  fid: string,
  origem: OrigemNarracao,
  ref: string,
): Promise<{ ok: true; videoPath?: string; videoUrl?: string } | { ok: false; msg: string }> {
  if (origem === "metodologia") {
    const v = VIDEOS_METODOLOGIA.find((x) => x.id === ref);
    if (!v) return { ok: false, msg: "vídeo não encontrado" };
    // Vídeo já narrado também aceita a voz dela: o worker (narrar-video.yml)
    // usa só a imagem do vídeo e põe a narração nova no lugar do áudio original.
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com";
    return { ok: true, videoUrl: `${base}${v.arquivo}` };
  }
  if (origem === "marca") {
    // Vídeo na marca dela: o MP4 é dela, no Storage (o molde nunca serve).
    if (!VIDEOS_MARCA.some((x) => x.id === ref)) return { ok: false, msg: "vídeo não encontrado" };
    const pronto = await pathVideoMarcaPronto(fid, ref);
    if (!pronto) return { ok: false, msg: "o vídeo ainda não ficou pronto" };
    return { ok: true, videoPath: pronto.path };
  }
  const { data, error } = await createAdminClient()
    .from("reels_animados")
    .select("id, franqueada_id, status, path")
    .eq("id", ref)
    .maybeSingle();
  if (error) return { ok: false, msg: "não consegui ler o vídeo, tente de novo" };
  const r = data as { franqueada_id: string; status: string; path: string | null } | null;
  if (!r || r.franqueada_id !== fid) return { ok: false, msg: "vídeo não encontrado" };
  if (r.status !== "pronto" || !r.path) return { ok: false, msg: "o vídeo ainda não ficou pronto" };
  return { ok: true, videoPath: r.path };
}

export async function prepararNarracaoAction(p: {
  origem: OrigemNarracao;
  ref: string;
  mime: string;
  tamanhoBytes: number;
}): Promise<{ ok: true; id: string; path: string; token: string } | { ok: false; msg: string }> {
  const fid = await franqueadaId();
  if (!fid) return { ok: false, msg: "sessão inválida, entre de novo" };
  if (p.origem !== "reel" && p.origem !== "metodologia" && p.origem !== "marca") return { ok: false, msg: "origem inválida" };
  if (!(p.tamanhoBytes > 0)) return { ok: false, msg: "a gravação veio vazia, grave de novo" };
  if (p.tamanhoBytes > MAX_BYTES) return { ok: false, msg: "gravação grande demais, grave de novo" };
  const v = await videoDaOrigem(fid, p.origem, p.ref);
  if (!v.ok) return v;

  const admin = createAdminClient();
  const ext = p.mime.includes("mp4") || p.mime.includes("aac") ? "m4a" : p.mime.includes("ogg") ? "ogg" : "webm";
  const { data: row, error } = await admin
    .from("narracoes_video")
    .insert({ franqueada_id: fid, origem: p.origem, ref: p.ref, audio_mime: p.mime, status: "enviando" } as never)
    .select("id")
    .single();
  if (error || !row) return { ok: false, msg: "não consegui registrar a narração, tente de novo" };
  const id = (row as { id: string }).id;
  const path = `${fid}/narracoes/${id}.${ext}`;
  const { data: up, error: upErr } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (upErr || !up) {
    await admin.from("narracoes_video").update({ status: "erro", erro_msg: "upload não preparado" } as never).eq("id", id);
    return { ok: false, msg: "não consegui preparar o envio, tente de novo" };
  }
  await admin.from("narracoes_video").update({ audio_path: path } as never).eq("id", id);
  return { ok: true, id, path: up.path, token: up.token };
}

export async function montarNarracaoAction(p: {
  id: string;
  atrasoMs: number;
}): Promise<{ ok: boolean; msg: string }> {
  const fid = await franqueadaId();
  if (!fid) return { ok: false, msg: "sessão inválida, entre de novo" };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("narracoes_video")
    .select("id, franqueada_id, origem, ref, audio_path, status")
    .eq("id", p.id)
    .maybeSingle();
  if (error) return { ok: false, msg: "não consegui ler a narração, tente de novo" };
  const n = data as { franqueada_id: string; origem: OrigemNarracao; ref: string; audio_path: string | null; status: string } | null;
  if (!n || n.franqueada_id !== fid || !n.audio_path) return { ok: false, msg: "narração não encontrada" };
  if (n.status !== "enviando") return { ok: true, msg: "já está sendo montada" };

  // 🔴 Confere que a voz chegou ao Storage antes de chamar o worker: sem
  // isso o job morre no download e a tela fica em "montando".
  const pasta = n.audio_path.split("/").slice(0, -1).join("/");
  const nome = n.audio_path.split("/").pop()!;
  const { data: lista } = await admin.storage.from(BUCKET).list(pasta, { search: nome });
  if (!(lista ?? []).some((o) => o.name === nome)) {
    return { ok: false, msg: "a gravação não chegou, tente enviar de novo" };
  }

  const v = await videoDaOrigem(fid, n.origem, n.ref);
  if (!v.ok) return v;
  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, msg: "montagem indisponível agora (falta configuração)" };

  const atraso = Math.max(0, Math.min(3000, Math.round(Number(p.atrasoMs) || 0)));
  const destino = `${fid}/narracoes/${p.id}.mp4`;
  const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/narrar-video.yml/dispatches`, {
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
        narracao_id: p.id,
        video_path: v.videoPath ?? "",
        video_url: v.videoUrl ?? "",
        audio_path: n.audio_path,
        atraso_ms: String(atraso),
        destino_path: destino,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    await admin
      .from("narracoes_video")
      .update({ status: "erro", erro_msg: `worker ${resp.status}: ${corpo.slice(0, 120)}` } as never)
      .eq("id", p.id);
    return { ok: false, msg: "não consegui começar a montagem, tente de novo" };
  }
  await admin
    .from("narracoes_video")
    .update({ status: "montando", atraso_ms: atraso, atualizado_em: new Date().toISOString() } as never)
    .eq("id", p.id);
  revalidatePath("/dashboard/narrar");
  return { ok: true, msg: "Voz enviada! O vídeo com a sua narração fica pronto em uns 2 minutos." };
}

export async function listarNarracoesAction(origem: OrigemNarracao, ref: string): Promise<Narracao[]> {
  const fid = await franqueadaId();
  if (!fid) return [];
  const { data } = await createClient()
    .from("narracoes_video")
    .select("id, origem, ref, status, url, erro_msg, criado_em")
    .eq("franqueada_id", fid)
    .eq("origem", origem)
    .eq("ref", ref)
    .neq("status", "enviando")
    .order("criado_em", { ascending: false })
    .limit(5);
  return (data ?? []) as Narracao[];
}
