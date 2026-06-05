/**
 * Publer API client — agendamento de posts no Instagram sem App Review da Meta.
 * Base: https://app.publer.com/api/v1
 * Auth: Bearer-API token + Workspace-Id header
 *
 * Setup: criar UMA workspace "Scanner da Saúde" no Publer UI,
 * depois setar PUBLER_API_KEY e PUBLER_WORKSPACE_ID no env.
 */

const BASE = "https://app.publer.com/api/v1";

function headers(workspaceId?: string) {
  const key = process.env.PUBLER_API_KEY;
  if (!key) throw new Error("PUBLER_API_KEY não configurada");
  const h: Record<string, string> = {
    "Authorization": `Bearer-API ${key}`,
    "Content-Type": "application/json",
  };
  const wsId = workspaceId ?? process.env.PUBLER_WORKSPACE_ID;
  if (wsId) h["Publer-Workspace-Id"] = wsId;
  return h;
}

export type PubierAccount = {
  id: string;
  provider: string; // "instagram"
  name: string;
  avatar?: string;
};

/** Lista contas conectadas na workspace */
export async function listarContas(workspaceId?: string): Promise<PubierAccount[]> {
  const res = await fetch(`${BASE}/accounts`, {
    headers: headers(workspaceId),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`listarContas: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.data ?? data ?? []) as PubierAccount[];
}

/** Faz upload de mídia por URL para a biblioteca do Publer */
export async function uploadMedia(params: {
  url: string;
  tipo: "photo" | "video";
}): Promise<string> {
  const res = await fetch(`${BASE}/media`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ url: params.url, type: params.tipo }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`uploadMedia: ${res.status} ${JSON.stringify(data)}`);
  return (data.id ?? data.media_id ?? data.data?.id) as string;
}

export type AgendarParams = {
  publerAccountId: string;     // ID da conta Instagram no Publer
  caption: string;
  dataHora: string;            // ISO 8601
  tipo: "photo" | "video" | "reel" | "carousel" | "story";
  mediaUrls: string[];         // URLs públicas das mídias
};

/** Agenda um post no Instagram via Publer */
export async function agendarPost(params: AgendarParams): Promise<{ postId: string }> {
  // 1. Upload cada mídia para o Publer e obter IDs
  const mediaIds: string[] = [];
  for (const url of params.mediaUrls) {
    const tipoUpload = params.tipo === "video" || params.tipo === "reel" ? "video" : "photo";
    const id = await uploadMedia({ url, tipo: tipoUpload });
    mediaIds.push(id);
  }

  // 2. Monta o body do post
  const igType = params.tipo === "carousel" && params.mediaUrls.length > 1
    ? "carousel"
    : params.tipo === "reel" ? "reel"
    : params.tipo === "story" ? "story"
    : params.tipo === "video" ? "video"
    : "photo";

  const body = {
    bulk: { state: "scheduled" },
    posts: [
      {
        networks: {
          instagram: {
            type: igType,
            text: params.caption,
            media: mediaIds.map((id) => ({ id })),
          },
        },
        accounts: [
          {
            id: params.publerAccountId,
            scheduled_at: params.dataHora,
          },
        ],
      },
    ],
  };

  const res = await fetch(`${BASE}/posts/schedule`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`agendarPost: ${res.status} ${JSON.stringify(data)}`);

  const postId =
    data?.posts?.[0]?.id ??
    data?.data?.[0]?.id ??
    data?.id ??
    "ok";

  return { postId: String(postId) };
}

/** URL para o franqueada conectar o Instagram dela no Publer */
export function getLinkConectarInstagram(): string {
  const wsId = process.env.PUBLER_WORKSPACE_ID ?? "";
  return `https://app.publer.com/workspace/${wsId}/settings/accounts`;
}
