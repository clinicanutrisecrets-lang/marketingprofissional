/**
 * Pexels API client — banco gratuito de fotos e vídeos stock.
 * Sign up grátis em https://www.pexels.com/api/
 * Limite: 200 req/h, 20k req/mês — mais que suficiente.
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
  image: string; // thumbnail
  video_files: Array<{
    id: number;
    quality: "hd" | "sd" | "uhd";
    width: number;
    height: number;
    link: string;
    file_type: string;
  }>;
};

export type PexelsSearchResult = {
  videos: PexelsVideo[];
  total_results: number;
};

/**
 * Busca vídeos por keywords. Filtra pra orientação vertical (reels/stories) por padrão.
 */
export async function buscarVideos(params: {
  query: string;
  orientation?: "portrait" | "landscape" | "square";
  duracaoMaxSeg?: number;
  perPage?: number;
}): Promise<PexelsSearchResult> {
  const url = new URL(`${BASE}/videos/search`);
  url.searchParams.set("query", params.query);
  url.searchParams.set("orientation", params.orientation ?? "portrait");
  url.searchParams.set("per_page", String(params.perPage ?? 5));

  const res = await fetch(url, {
    headers: { Authorization: getApiKey() },
  });

  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = (await res.json()) as PexelsSearchResult;

  // Filtra por duração max se informado
  let videos = data.videos;
  if (params.duracaoMaxSeg) {
    videos = videos.filter((v) => v.duration <= params.duracaoMaxSeg!);
  }

  return { videos, total_results: data.total_results };
}

/**
 * Pega o melhor link de vídeo (HD vertical 1080p preferido).
 */
export function pegarMelhorLink(video: PexelsVideo): string | null {
  // Prioridade: HD vertical > HD qualquer > qualquer
  const hdVertical = video.video_files.find(
    (f) => f.quality === "hd" && f.height >= f.width && f.height >= 1080,
  );
  if (hdVertical) return hdVertical.link;

  const hd = video.video_files.find((f) => f.quality === "hd");
  if (hd) return hd.link;

  return video.video_files[0]?.link ?? null;
}

/**
 * Helper: dada uma lista de keywords, retorna o melhor vídeo encontrado.
 * Tenta cada keyword até achar resultado.
 */
export async function buscarMelhorVideo(
  keywords: string[],
  options: { orientation?: "portrait" | "landscape" | "square"; duracaoMaxSeg?: number } = {},
): Promise<{ url: string; thumbnail: string; duracao: number; pexelsId: number } | null> {
  for (const keyword of keywords) {
    try {
      const result = await buscarVideos({
        query: keyword,
        orientation: options.orientation ?? "portrait",
        duracaoMaxSeg: options.duracaoMaxSeg ?? 30,
        perPage: 5,
      });

      if (result.videos.length > 0) {
        const video = result.videos[0]; // pega o mais relevante
        const link = pegarMelhorLink(video);
        if (link) {
          return {
            url: link,
            thumbnail: video.image,
            duracao: video.duration,
            pexelsId: video.id,
          };
        }
      }
    } catch (e) {
      console.warn(`Pexels falhou pra "${keyword}":`, e);
    }
  }
  return null;
}
