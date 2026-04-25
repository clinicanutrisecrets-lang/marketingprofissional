/**
 * Helpers da Instagram Graph API (v21.0).
 * Mesma lib usada no app franquias — replicada aqui pra Studio Aline.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export type PostTipo =
  | "feed_imagem"
  | "feed_carrossel"
  | "reels"
  | "stories"
  | "stories_sequencia";

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
  if (!res.ok) throw new Error(`criarContainerImagem: ${res.status} ${await res.text()}`);
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

export async function criarContainerCarrossel(params: {
  igUserId: string;
  pageToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<MediaContainer> {
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
