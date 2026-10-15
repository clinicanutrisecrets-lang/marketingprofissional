import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { buscarArquivoUrl } from "@/lib/arquivos/url-asset";
import {
  VIDEOS_MARCA,
  assinaturaVideoMarca,
  marcaDoCadastro,
  parametrosDoMolde,
  precisaGerar,
  videosMarcaLiberadosPara,
  type LinhaVideoMarca,
  type VideoMarca,
} from "./marca";

/**
 * Vídeos de marca da profissional: lê o que já foi gerado e dispara o worker
 * (.github/workflows/render-video-marca.yml) para o que falta. Chamado pela
 * tela de Vídeos: abrir a tela é o que faz o vídeo nascer, uma vez só.
 */

const REPO = "clinicanutrisecrets-lang/marketingprofissional";

export type EstadoVideoMarca = {
  video: VideoMarca;
  status: "gerando" | "pronto" | "erro" | "indisponivel";
  url: string | null;
  semLogo: boolean;
};

type Linha = LinhaVideoMarca & { id: string; url: string | null };

export async function videosMarcaDaFranqueada(f: { id: string; email: string | null }): Promise<EstadoVideoMarca[] | null> {
  if (!videosMarcaLiberadosPara(f.email)) return null;
  const admin = createAdminClient();

  const [{ data: cad, error: errCad }, logoUrl] = await Promise.all([
    admin.from("franqueadas").select("cor_primaria_hex, cor_secundaria_hex").eq("id", f.id).maybeSingle(),
    buscarArquivoUrl(admin, f.id, "logo_principal"),
  ]);
  if (errCad) {
    console.error("[videos-marca] não li o cadastro", f.id, errCad.message);
    return null;
  }
  const marca = marcaDoCadastro({ ...((cad ?? {}) as Record<string, string | null>), logoUrl });

  const { data: linhasRaw, error } = await admin
    .from("videos_marca")
    .select("id, video_id, assinatura, status, url, criado_em")
    .eq("franqueada_id", f.id)
    .order("criado_em", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[videos-marca] não li os vídeos", f.id, error.message);
    return null;
  }
  const linhas = (linhasRaw ?? []) as Linha[];

  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  const out: EstadoVideoMarca[] = [];
  for (const v of VIDEOS_MARCA) {
    const assinatura = assinaturaVideoMarca(v, marca);
    const atual = linhas.find((l) => l.video_id === v.id && l.assinatura === assinatura) ?? null;
    // O pronto anterior (outra cor/logo) segue na tela enquanto o novo nasce.
    const prontoAnterior = linhas.find((l) => l.video_id === v.id && l.status === "pronto") ?? null;

    if (!precisaGerar(atual, assinatura)) {
      out.push({ video: v, status: atual!.status, url: atual!.url, semLogo: !marca.logoUrl });
      continue;
    }
    if (!token) {
      console.error("[videos-marca] falta GITHUB_ACTIONS_TOKEN");
      out.push({ video: v, status: prontoAnterior ? "pronto" : "indisponivel", url: prontoAnterior?.url ?? null, semLogo: !marca.logoUrl });
      continue;
    }

    const { data: nova, error: errIns } = await admin
      .from("videos_marca")
      .insert({ franqueada_id: f.id, video_id: v.id, assinatura, status: "gerando" } as never)
      .select("id")
      .single();
    if (errIns || !nova) {
      console.error("[videos-marca] não registrei a geração", f.id, v.id, errIns?.message);
      out.push({ video: v, status: "erro", url: prontoAnterior?.url ?? null, semLogo: !marca.logoUrl });
      continue;
    }
    const rid = (nova as { id: string }).id;
    const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-video-marca.yml/dispatches`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
        inputs: {
          registro_id: rid,
          molde: v.molde.split("/").pop(),
          parametros: parametrosDoMolde(marca),
          destino_path: `${f.id}/videos-marca/${assinatura}.mp4`,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
      }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      console.error("[videos-marca] worker recusou", resp.status, corpo.slice(0, 200));
      await admin.from("videos_marca").update({ status: "erro", erro_msg: `worker ${resp.status}` } as never).eq("id", rid);
      out.push({ video: v, status: "erro", url: prontoAnterior?.url ?? null, semLogo: !marca.logoUrl });
      continue;
    }
    console.log("[videos-marca] geração disparada", f.id, v.id, assinatura);
    out.push({ video: v, status: "gerando", url: prontoAnterior?.url ?? null, semLogo: !marca.logoUrl });
  }
  return out;
}

/** Caminho no Storage do vídeo pronto mais recente (pra narração por cima). */
export async function pathVideoMarcaPronto(franqueadaId: string, videoId: string): Promise<{ path: string; url: string | null } | null> {
  const { data } = await createAdminClient()
    .from("videos_marca")
    .select("path, url")
    .eq("franqueada_id", franqueadaId)
    .eq("video_id", videoId)
    .eq("status", "pronto")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = data as { path: string | null; url: string | null } | null;
  return r?.path ? { path: r.path, url: r.url } : null;
}
