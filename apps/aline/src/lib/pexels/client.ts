/**
 * Pexels API client — banco gratuito de fotos e vídeos stock.
 * Mesma implementação do franquias.
 */
import { createAlineClient } from "@/lib/supabase/server";

const BASE = "https://api.pexels.com";

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY não configurada");
  return key;
}

export type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
  alt: string;
};

export async function buscarFotos(
  query: string,
  perPage = 20,
  orientation: "portrait" | "landscape" | "square" = "square",
): Promise<{ photos: PexelsPhoto[] }> {
  const url = new URL(`${BASE}/v1/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", orientation);
  const res = await fetch(url, { headers: { Authorization: getApiKey() } });
  if (!res.ok) throw new Error(`Pexels photos ${res.status}`);
  return res.json() as Promise<{ photos: PexelsPhoto[] }>;
}

/**
 * Busca foto pra o post evitando fotos já usadas pelo perfil
 * (janela default 60 dias). Retorna 1ª foto disponível + registra uso.
 */
export async function escolherFotoHeroParaPost(input: {
  perfilId: string;
  visualHint: string;
  postId?: string | null;
  janelaDias?: number;
  orientation?: "portrait" | "landscape" | "square";
}): Promise<{
  pexelsId: string;
  url: string;
  buffer: Buffer;
  altText: string;
} | null> {
  const admin = createAlineClient();

  const r = await buscarFotos(
    input.visualHint,
    20,
    input.orientation ?? "square",
  );
  if (r.photos.length === 0) return null;

  const desde = new Date();
  desde.setDate(desde.getDate() - (input.janelaDias ?? 60));

  const { data: usadasData } = await admin
    .from("fotos_usadas")
    .select("pexels_photo_id")
    .eq("perfil_id", input.perfilId)
    .gte("usado_em", desde.toISOString());

  const usadas = new Set(
    ((usadasData ?? []) as Array<{ pexels_photo_id: string }>).map(
      (r) => r.pexels_photo_id,
    ),
  );

  const disponivel = r.photos.find((p) => !usadas.has(String(p.id)));
  if (!disponivel) {
    // Todas as 20 já foram usadas — pega a mais antiga (LRU)
    const id = String(r.photos[0]!.id);
    const url = r.photos[0]!.src.large2x;
    const buffer = await baixarFoto(url);
    await admin.from("fotos_usadas").insert({
      perfil_id: input.perfilId,
      pexels_photo_id: id,
      photo_url: url,
      visual_hint: input.visualHint,
      post_id: input.postId ?? null,
    });
    return { pexelsId: id, url, buffer, altText: r.photos[0]!.alt };
  }

  const url = disponivel.src.large2x;
  const buffer = await baixarFoto(url);

  await admin.from("fotos_usadas").insert({
    perfil_id: input.perfilId,
    pexels_photo_id: String(disponivel.id),
    photo_url: url,
    visual_hint: input.visualHint,
    post_id: input.postId ?? null,
  });

  return {
    pexelsId: String(disponivel.id),
    url,
    buffer,
    altText: disponivel.alt,
  };
}

async function baixarFoto(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download foto ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  video_files: Array<{
    quality: "hd" | "sd" | "uhd";
    width: number;
    height: number;
    link: string;
  }>;
};

export async function buscarVideos(query: string, perPage = 5) {
  const url = new URL(`${BASE}/videos/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", String(perPage));
  const res = await fetch(url, { headers: { Authorization: getApiKey() } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  return res.json() as Promise<{ videos: PexelsVideo[] }>;
}

export function pegarMelhorLink(v: PexelsVideo): string | null {
  const hd = v.video_files.find((f) => f.quality === "hd" && f.height >= f.width);
  if (hd) return hd.link;
  return v.video_files[0]?.link ?? null;
}

export async function buscarMelhorVideo(keywords: string[]) {
  for (const kw of keywords) {
    try {
      const r = await buscarVideos(kw);
      if (r.videos.length > 0) {
        const v = r.videos[0];
        const link = pegarMelhorLink(v);
        if (link) {
          return { url: link, thumbnail: v.image, duracao: v.duration, pexelsId: v.id };
        }
      }
    } catch (e) {
      console.warn(`Pexels falhou pra "${kw}":`, e);
    }
  }
  return null;
}
