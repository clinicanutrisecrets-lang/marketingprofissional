/**
 * Instagram Graph API — client compartilhado (apps/franquias + apps/aline)
 *
 * OAuth flow + postagem + insights.
 * Tokens devem ser armazenados criptografados (ver packages/db).
 *
 * Próxima iteração: implementar
 * - buildAuthUrl(franqueadaId, redirectUri)
 * - exchangeCodeForToken(code)
 * - refreshLongLivedToken(token)
 * - publishImage(accountId, token, imageUrl, caption)
 * - publishReel(accountId, token, videoUrl, caption)
 * - publishCarousel(accountId, token, mediaUrls[], caption)
 * - getPostInsights(accountId, token, mediaId)
 */

export const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
] as const;

export const META_ADS_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
] as const;

export function buildAuthUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}) {
  const scopes = params.scopes ?? INSTAGRAM_SCOPES;
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", scopes.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}
