/**
 * Helpers da Meta Graph API — OAuth + info da conta Instagram.
 */

const GRAPH_VERSION = "v21.0";

export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

export function buildAuthUrl(state: string, redirectUri: string): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID não configurada");

  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

/**
 * Troca o code por short-lived token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("META_APP_ID/SECRET não configuradas");
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`exchangeCodeForToken: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Troca short-lived token por long-lived token (válido 60 dias).
 */
export async function exchangeForLongLivedToken(shortToken: string): Promise<TokenResponse> {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;

  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`longLivedToken: ${res.status} ${await res.text()}`);
  return res.json();
}

type Page = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

/**
 * Retorna as páginas do Facebook da pessoa + Instagram Business account linkado.
 */
export async function getPagesWithInstagram(userToken: string): Promise<Page[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account",
  );
  url.searchParams.set("access_token", userToken);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getPages: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return (data.data ?? []) as Page[];
}

export async function getInstagramAccountInfo(
  igAccountId: string,
  pageToken: string,
): Promise<{ id: string; username: string; account_type?: string }> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${igAccountId}`);
  url.searchParams.set("fields", "id,username,account_type");
  url.searchParams.set("access_token", pageToken);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`getIGAccount: ${res.status} ${await res.text()}`);
  return res.json();
}
