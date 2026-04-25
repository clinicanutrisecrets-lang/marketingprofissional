import { NextResponse } from "next/server";
import { createClient, createPublicAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth Instagram (Meta Login for Business).
 *
 * Fluxo:
 *   1. Studio redireciona pra https://www.facebook.com/v21.0/dialog/oauth com client_id + redirect_uri + state=<perfil_slug>
 *   2. Meta volta pra esse callback com ?code=...&state=<slug>
 *   3. Aqui: troca code por short-lived token, depois por long-lived token (60 dias)
 *   4. Pega IG Business Account ID a partir da Page conectada
 *   5. Salva em aline.perfis via RPC (token criptografado por pgsodium)
 *
 * ENV VARS necessarias:
 *   META_APP_ID, META_APP_SECRET, META_REDIRECT_URI
 *
 * Permissoes Meta App:
 *   instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // perfil slug
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/dashboard?ig_error=${encodeURIComponent(errorParam)}`, request.url),
    );
  }
  if (!code || !state) {
    return NextResponse.json({ erro: "code/state ausentes" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const APP_ID = process.env.META_APP_ID;
  const APP_SECRET = process.env.META_APP_SECRET;
  const REDIRECT = process.env.META_REDIRECT_URI;
  if (!APP_ID || !APP_SECRET || !REDIRECT) {
    return NextResponse.json(
      { erro: "META_APP_ID/SECRET/REDIRECT_URI nao configurados" },
      { status: 500 },
    );
  }

  try {
    // 1. Code -> short-lived user token
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", APP_ID);
    tokenUrl.searchParams.set("client_secret", APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", REDIRECT);
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) throw new Error(`token: ${await tokenRes.text()}`);
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
    };

    // 2. Short -> long-lived (60 dias)
    const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", APP_ID);
    longUrl.searchParams.set("client_secret", APP_SECRET);
    longUrl.searchParams.set("fb_exchange_token", tokenJson.access_token);
    const longRes = await fetch(longUrl);
    if (!longRes.ok) throw new Error(`long token: ${await longRes.text()}`);
    const longJson = (await longRes.json()) as {
      access_token: string;
      expires_in: number;
    };
    const userToken = longJson.access_token;
    const expiry = new Date(Date.now() + (longJson.expires_in ?? 60 * 24 * 3600) * 1000);

    // 3. Listar Paginas que o user gerencia + pegar a primeira que tem IG vinculada
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`,
    );
    if (!pagesRes.ok) throw new Error(`pages: ${await pagesRes.text()}`);
    const pagesJson = (await pagesRes.json()) as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }>;
    };

    const pageComIg = pagesJson.data.find((p) => p.instagram_business_account?.id);
    if (!pageComIg) {
      throw new Error(
        "Nenhuma Pagina FB conectada com Instagram Business. Conecte a IG na Pagina do FB primeiro.",
      );
    }

    const igUserId = pageComIg.instagram_business_account!.id;
    const pageToken = pageComIg.access_token; // page token (nao expira se user token long-lived)

    // 4. Salva via RPC (token criptografado por pgsodium)
    const adminPublic = createPublicAdminClient();
    const { error: rpcErr } = await adminPublic.rpc("set_perfil_instagram_credenciais", {
      p_slug: state,
      p_conta_id: igUserId,
      p_access_token: pageToken,
      p_token_expiry: expiry.toISOString(),
    });
    if (rpcErr) throw new Error(`rpc: ${rpcErr.message}`);

    return NextResponse.redirect(
      new URL(`/perfis/${state}?ig_conectado=1`, request.url),
    );
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`/dashboard?ig_error=${msg}`, request.url));
  }
}
