/**
 * Pexels API client — banco gratuito de fotos e vídeos stock.
 * Mesma implementação do franquias.
 */

const BASE = "https://api.pexels.com";

function getApiKey(): string {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("PEXELS_API_KEY não configurada");
  return key;
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
