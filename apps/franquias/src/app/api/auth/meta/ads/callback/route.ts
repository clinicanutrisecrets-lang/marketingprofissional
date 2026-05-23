import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, exchangeForLongLivedToken } from "@/lib/meta/oauth";
import { encrypt } from "@/lib/security/encrypt";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectOk = new URL("/dashboard/anuncios?meta_ads_conectado=1", request.url);
  const redirectErr = (msg: string) =>
    NextResponse.redirect(
      new URL(`/dashboard/anuncios?meta_ads_erro=${encodeURIComponent(msg)}`, request.url),
    );

  if (error) return redirectErr(error);
  if (!code) return redirectErr("Código ausente");

  const cookieStore = cookies();
  const storedState = cookieStore.get("meta_ads_oauth_state")?.value;
  if (!storedState || storedState !== state) return redirectErr("State inválido (CSRF)");
  cookieStore.delete("meta_ads_oauth_state");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri =
    process.env.META_ADS_REDIRECT_URI ??
    new URL("/api/auth/meta/ads/callback", request.url).toString();

  try {
    const shortToken = await exchangeCodeForToken(code, redirectUri);
    const longLived = await exchangeForLongLivedToken(shortToken.access_token);

    const expiryDate = new Date(
      Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000,
    ).toISOString();

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("franqueadas")
      .update({
        meta_ads_access_token: encrypt(longLived.access_token),
        meta_ads_token_expiry: expiryDate,
      })
      .eq("auth_user_id", user.id);

    if (updateError) return redirectErr(`DB: ${updateError.message}`);
    return NextResponse.redirect(redirectOk);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return redirectErr(msg);
  }
}
