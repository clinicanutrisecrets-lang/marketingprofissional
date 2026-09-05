/**
 * Login direto do Instagram ("Instagram API with Instagram Login").
 * Credenciais: INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET — o par do PRODUTO
 * Instagram dentro do app da Meta, não o id do app geral.
 */

export const ESCOPOS_INSTAGRAM = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
  // Salvamentos, compartilhamentos e visualizações por post (Raio-X do público).
  // Precisa estar adicionada em "Permissões e recursos" do app da Meta.
  "instagram_business_manage_insights",
];

export const PREFIXO_STATE = "ig:";

export function configInstagramLogin(): { appId: string; appSecret: string; redirectUri: string } | null {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) return null;
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI ??
    "https://studio.scannerdasaude.com/api/auth/instagram/callback";
  return { appId, appSecret, redirectUri };
}

export function urlAutorizacaoInstagram(params: { appId: string; redirectUri: string; slug: string }): URL {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", ESCOPOS_INSTAGRAM.join(","));
  url.searchParams.set("state", `${PREFIXO_STATE}${params.slug}`);
  return url;
}

export type TokenLongo = { accessToken: string; userId: string; expiraEm: Date; permissoes: string };

/** code → token curto → token longo (60 dias). */
export async function trocarCodigoPorTokenLongo(
  cfg: { appId: string; appSecret: string; redirectUri: string },
  code: string,
): Promise<TokenLongo> {
  const form = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
    // A Meta devolve o code com "#_" no fim em alguns navegadores.
    code: code.replace(/#_$/, ""),
  });
  const curtoRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!curtoRes.ok) throw new Error(`token curto: ${curtoRes.status} ${await curtoRes.text()}`);
  const curtoJson = (await curtoRes.json()) as
    | { access_token: string; user_id: string | number; permissions?: string | string[] }
    | { data: Array<{ access_token: string; user_id: string | number; permissions?: string | string[] }> };
  const curto = "data" in curtoJson ? curtoJson.data[0] : curtoJson;
  if (!curto?.access_token) throw new Error("token curto: resposta sem access_token");

  const longoUrl = new URL("https://graph.instagram.com/access_token");
  longoUrl.searchParams.set("grant_type", "ig_exchange_token");
  longoUrl.searchParams.set("client_secret", cfg.appSecret);
  longoUrl.searchParams.set("access_token", curto.access_token);
  const longoRes = await fetch(longoUrl);
  if (!longoRes.ok) throw new Error(`token longo: ${longoRes.status} ${await longoRes.text()}`);
  const longo = (await longoRes.json()) as { access_token: string; expires_in?: number };

  const permissoes = Array.isArray(curto.permissions)
    ? curto.permissions.join(",")
    : (curto.permissions ?? "");
  return {
    accessToken: longo.access_token,
    userId: String(curto.user_id),
    expiraEm: new Date(Date.now() + (longo.expires_in ?? 60 * 24 * 3600) * 1000),
    permissoes,
  };
}
