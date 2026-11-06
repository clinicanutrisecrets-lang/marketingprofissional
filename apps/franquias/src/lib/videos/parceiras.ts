import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import {
  COR_PADRAO,
  VIDEOS_BLACK_FRIDAY,
  assinaturaVideoMarca,
  precisaGerar,
  type LinhaVideoMarca,
  type MarcaVideo,
  type VideoMarca,
} from "./marca";
import { dispararVideoMarca } from "./marca-servidor";

/**
 * Vídeos da Black Friday para as PARCEIRAS do Tratamentos (Aline, 06/11/2026).
 *
 * Elas não têm conta neste app. O painel de Tratamentos pede, por um canal
 * assinado (/api/integrations/tratamentos/videos-bf), o vídeo com o nome dela
 * e a narração em karaokê; aqui é a mesma montagem das franqueadas, só que o
 * dono da linha é `parceira_chave` (id da conta dela no Tratamentos) em vez
 * de `franqueada_id` (migração 043).
 */

const REPO = "clinicanutrisecrets-lang/marketingprofissional";
const BUCKET = "franqueadas-assets";
const MAX_BYTES = 30 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function chaveValida(chave: unknown): chave is string {
  return typeof chave === "string" && UUID.test(chave);
}

/** O que o Tratamentos manda sobre ela. Nome e registro já vêm prontos de lá. */
export type DadosParceira = { nome?: string | null; registro?: string | null; logoUrl?: string | null };

export function marcaDaParceira(d: DadosParceira): MarcaVideo {
  const m: MarcaVideo = { ...COR_PADRAO, logoUrl: null };
  const nome = String(d.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const registro = String(d.registro ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const logo = String(d.logoUrl ?? "").trim();
  if (nome) m.nome = nome;
  if (registro) m.registro = registro;
  if (/^https:\/\//i.test(logo)) m.logoUrl = logo;
  return m;
}

export type VideoParceira = {
  id: string;
  titulo: string;
  resumo: string;
  duracaoSeg: number;
  roteiro: VideoMarca["roteiro"];
  legenda: string;
  poster: string;
  status: "gerando" | "pronto" | "erro" | "indisponivel";
  url: string | null;
};

type Linha = LinhaVideoMarca & { id: string; url: string | null };

function base(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com";
}

/** Lê o que já foi montado e dispara o worker para o que falta (uma vez por nome/CRN/logo). */
export async function videosDaParceira(chave: string, dados: DadosParceira): Promise<VideoParceira[] | null> {
  const admin = createAdminClient();
  const marca = marcaDaParceira(dados);
  const { data, error } = await admin
    .from("videos_marca")
    .select("id, video_id, assinatura, status, url, criado_em")
    .eq("parceira_chave", chave)
    .order("criado_em", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[videos-parceira] não li os vídeos", chave, error.message);
    return null;
  }
  const linhas = (data ?? []) as Linha[];
  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  const out: VideoParceira[] = [];
  for (const v of VIDEOS_BLACK_FRIDAY) {
    const meta = {
      id: v.id,
      titulo: v.titulo,
      resumo: v.resumo,
      duracaoSeg: v.duracaoSeg,
      roteiro: v.roteiro,
      legenda: v.legenda,
      poster: `${base()}${v.poster}`,
    };
    const assinatura = assinaturaVideoMarca(v, marca);
    const atual = linhas.find((l) => l.video_id === v.id && l.assinatura === assinatura) ?? null;
    const anterior = linhas.find((l) => l.video_id === v.id && l.status === "pronto") ?? null;
    if (!precisaGerar(atual, assinatura)) {
      out.push({ ...meta, status: atual!.status, url: atual!.url });
      continue;
    }
    if (!token) {
      console.error("[videos-parceira] falta GITHUB_ACTIONS_TOKEN");
      out.push({ ...meta, status: anterior ? "pronto" : "indisponivel", url: anterior?.url ?? null });
      continue;
    }
    const disp = await dispararVideoMarca({ franqueadaId: null, parceiraChave: chave, video: v, marca, assinatura, token });
    out.push({ ...meta, status: disp.ok ? "gerando" : "erro", url: anterior?.url ?? null });
  }
  return out;
}

export type NarracaoParceira = {
  id: string;
  ref: string;
  status: "enviando" | "montando" | "pronto" | "erro";
  url: string | null;
  criado_em: string;
};

export async function narracoesDaParceira(chave: string): Promise<NarracaoParceira[]> {
  const { data, error } = await createAdminClient()
    .from("narracoes_video")
    .select("id, ref, status, url, criado_em")
    .eq("parceira_chave", chave)
    .eq("origem", "marca")
    .neq("status", "enviando")
    .order("criado_em", { ascending: false })
    .limit(30);
  if (error) {
    console.error("[videos-parceira] não li as narrações", chave, error.message);
    return [];
  }
  return (data ?? []) as NarracaoParceira[];
}

async function videoProntoDaParceira(chave: string, videoId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("videos_marca")
    .select("path")
    .eq("parceira_chave", chave)
    .eq("video_id", videoId)
    .eq("status", "pronto")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { path: string | null } | null)?.path ?? null;
}

/** Cria a linha da narração e devolve o endereço assinado para o navegador subir a voz. */
export async function prepararNarracaoParceira(p: {
  chave: string;
  ref: string;
  mime: string;
  tamanhoBytes: number;
}): Promise<{ ok: true; id: string; uploadUrl: string } | { ok: false; msg: string }> {
  if (!VIDEOS_BLACK_FRIDAY.some((v) => v.id === p.ref)) return { ok: false, msg: "vídeo não encontrado" };
  if (!(p.tamanhoBytes > 0)) return { ok: false, msg: "a gravação veio vazia, grave de novo" };
  if (p.tamanhoBytes > MAX_BYTES) return { ok: false, msg: "gravação grande demais, grave de novo" };
  if (!(await videoProntoDaParceira(p.chave, p.ref))) return { ok: false, msg: "o vídeo ainda está sendo montado" };

  const admin = createAdminClient();
  const mime = String(p.mime || "audio/webm").slice(0, 60);
  const ext = mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
  const { data: row, error } = await admin
    .from("narracoes_video")
    .insert({ franqueada_id: null, parceira_chave: p.chave, origem: "marca", ref: p.ref, audio_mime: mime, status: "enviando" } as never)
    .select("id")
    .single();
  if (error || !row) {
    console.error("[videos-parceira] não registrei a narração", p.chave, error?.message);
    return { ok: false, msg: "não consegui registrar a narração, tente de novo" };
  }
  const id = (row as { id: string }).id;
  const path = `parceiras/${p.chave}/narracoes/${id}.${ext}`;
  const { data: up, error: upErr } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (upErr || !up) {
    await admin.from("narracoes_video").update({ status: "erro", erro_msg: "upload não preparado" } as never).eq("id", id);
    return { ok: false, msg: "não consegui preparar o envio, tente de novo" };
  }
  const { error: errPath } = await admin.from("narracoes_video").update({ audio_path: path } as never).eq("id", id);
  if (errPath) return { ok: false, msg: "não consegui preparar o envio, tente de novo" };
  return { ok: true, id, uploadUrl: up.signedUrl };
}

/** A voz chegou: dispara o worker que junta voz e vídeo (narrar-video.yml). */
export async function montarNarracaoParceira(p: {
  chave: string;
  id: string;
  atrasoMs: number;
}): Promise<{ ok: boolean; msg: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("narracoes_video")
    .select("id, parceira_chave, ref, audio_path, status")
    .eq("id", p.id)
    .maybeSingle();
  if (error) return { ok: false, msg: "não consegui ler a narração, tente de novo" };
  const n = data as { parceira_chave: string | null; ref: string; audio_path: string | null; status: string } | null;
  if (!n || n.parceira_chave !== p.chave || !n.audio_path) return { ok: false, msg: "narração não encontrada" };
  if (n.status !== "enviando") return { ok: true, msg: "já está sendo montada" };

  const pasta = n.audio_path.split("/").slice(0, -1).join("/");
  const nome = n.audio_path.split("/").pop()!;
  const { data: lista } = await admin.storage.from(BUCKET).list(pasta, { search: nome });
  if (!(lista ?? []).some((o) => o.name === nome)) return { ok: false, msg: "a gravação não chegou, tente enviar de novo" };

  const videoPath = await videoProntoDaParceira(p.chave, n.ref);
  if (!videoPath) return { ok: false, msg: "o vídeo ainda está sendo montado" };
  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, msg: "montagem indisponível agora (falta configuração)" };

  const atraso = Math.max(0, Math.min(3000, Math.round(Number(p.atrasoMs) || 0)));
  const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/narrar-video.yml/dispatches`, {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
      inputs: {
        narracao_id: p.id,
        video_path: videoPath,
        video_url: "",
        audio_path: n.audio_path,
        atraso_ms: String(atraso),
        destino_path: `parceiras/${p.chave}/narracoes/${p.id}.mp4`,
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
  const { error: errUp } = await admin
    .from("narracoes_video")
    .update({ status: "montando", atraso_ms: atraso, atualizado_em: new Date().toISOString() } as never)
    .eq("id", p.id);
  if (errUp) console.error("[videos-parceira] não marquei montando", p.id, errUp.message);
  return { ok: true, msg: "Voz enviada! O vídeo com a sua narração fica pronto em uns 2 minutos." };
}
