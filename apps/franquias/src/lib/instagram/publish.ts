/**
 * Publicação de posts no Instagram via Graph API.
 * Fluxo Business Account:
 * 1. POST /{ig-user-id}/media (cria container)
 * 2. POST /{ig-user-id}/media_publish (publica o container)
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export type PostTipo = "feed_imagem" | "feed_carrossel" | "reels" | "stories";

type MediaContainer = { id: string };
type PublishedMedia = { id: string };

export async function criarContainerImagem(params: {
  igUserId: string;
  pageToken: string;
  imageUrl: string;
  caption: string;
  isCarouselItem?: boolean;
}): Promise<MediaContainer> {
  const url = new URL(`${GRAPH}/${params.igUserId}/media`);
  url.searchParams.set("image_url", params.imageUrl);
  url.searchParams.set("caption", params.caption);
  if (params.isCarouselItem) url.searchParams.set("is_carousel_item", "true");
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`criarContainer: ${res.status} ${text}`);
  }
  return res.json();
}

export async function criarContainerReels(params: {
  igUserId: string;
  pageToken: string;
  videoUrl: string;
  caption: string;
  coverUrl?: string;
}): Promise<MediaContainer> {
  const url = new URL(`${GRAPH}/${params.igUserId}/media`);
  url.searchParams.set("media_type", "REELS");
  url.searchParams.set("video_url", params.videoUrl);
  url.searchParams.set("caption", params.caption);
  if (params.coverUrl) url.searchParams.set("cover_url", params.coverUrl);
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarContainerReels: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function criarContainerStories(params: {
  igUserId: string;
  pageToken: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<MediaContainer> {
  const url = new URL(`${GRAPH}/${params.igUserId}/media`);
  url.searchParams.set("media_type", "STORIES");
  if (params.imageUrl) url.searchParams.set("image_url", params.imageUrl);
  if (params.videoUrl) url.searchParams.set("video_url", params.videoUrl);
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarContainerStories: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Carrossel: cria 1 container por imagem + 1 container pai com children.
 */
export async function criarContainerCarrossel(params: {
  igUserId: string;
  pageToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<MediaContainer> {
  // Cria children primeiro
  const childIds: string[] = [];
  for (const imageUrl of params.imageUrls) {
    const child = await criarContainerImagem({
      igUserId: params.igUserId,
      pageToken: params.pageToken,
      imageUrl,
      caption: "",
      isCarouselItem: true,
    });
    childIds.push(child.id);
  }

  const url = new URL(`${GRAPH}/${params.igUserId}/media`);
  url.searchParams.set("media_type", "CAROUSEL");
  url.searchParams.set("children", childIds.join(","));
  url.searchParams.set("caption", params.caption);
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`criarContainerCarrossel: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Publica o container (torna visível no perfil).
 */
export async function publicarContainer(params: {
  igUserId: string;
  pageToken: string;
  creationId: string;
}): Promise<PublishedMedia> {
  const url = new URL(`${GRAPH}/${params.igUserId}/media_publish`);
  url.searchParams.set("creation_id", params.creationId);
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`publicarContainer: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Espera container de vídeo ficar pronto (REELS/video podem demorar).
 */
export async function aguardarContainerPronto(params: {
  creationId: string;
  pageToken: string;
  maxTentativas?: number;
  intervaloMs?: number;
}): Promise<void> {
  const maxTentativas = params.maxTentativas ?? 30;
  const intervalo = params.intervaloMs ?? 2000;

  for (let i = 0; i < maxTentativas; i++) {
    const url = new URL(`${GRAPH}/${params.creationId}`);
    url.searchParams.set("fields", "status_code");
    url.searchParams.set("access_token", params.pageToken);
    const res = await fetch(url);
    const data = (await res.json()) as { status_code?: string };
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Container em ERRO");
    await new Promise((r) => setTimeout(r, intervalo));
  }
  throw new Error("Timeout aguardando container");
}

/**
 * Busca insights (métricas) de um post publicado.
 */
export type InsightsPost = {
  reach?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  video_views?: number;
  total_interactions?: number;
};

export async function getPostInsights(params: {
  mediaId: string;
  pageToken: string;
  tipo: PostTipo;
}): Promise<InsightsPost> {
  // Métricas variam por tipo
  const metricasFeed = "reach,impressions,likes,comments,saves,shares,total_interactions";
  const metricasReels = "reach,plays,likes,comments,saves,shares,total_interactions";
  const metricasStories = "reach,impressions,replies,exits,taps_forward,taps_back";

  const metricas = params.tipo === "reels"
    ? metricasReels
    : params.tipo === "stories"
      ? metricasStories
      : metricasFeed;

  const url = new URL(`${GRAPH}/${params.mediaId}/insights`);
  url.searchParams.set("metric", metricas);
  url.searchParams.set("access_token", params.pageToken);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getInsights: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as {
    data: Array<{ name: string; values: Array<{ value: number }> }>;
  };

  const result: InsightsPost = {};
  for (const m of data.data ?? []) {
    const v = m.values?.[0]?.value;
    if (v == null) continue;
    switch (m.name) {
      case "reach":
        result.reach = v;
        break;
      case "impressions":
        result.impressions = v;
        break;
      case "likes":
        result.likes = v;
        break;
      case "comments":
        result.comments = v;
        break;
      case "saves":
        result.saves = v;
        break;
      case "shares":
        result.shares = v;
        break;
      case "plays":
      case "video_views":
        result.video_views = v;
        break;
      case "total_interactions":
        result.total_interactions = v;
        break;
    }
  }
  return result;
}
