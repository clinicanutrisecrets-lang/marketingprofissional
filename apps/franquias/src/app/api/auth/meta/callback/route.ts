import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getPagesWithInstagram,
  getInstagramAccountInfo,
} from "@/lib/meta/oauth";
import { encrypt } from "@/lib/security/encrypt";

/**
 * Callback do OAuth Meta.
 * 1. Valida state (CSRF).
 * 2. Troca code por short-lived token.
 * 3. Upgrade pra long-lived token (60 dias).
 * 4. Lista páginas do Facebook do user e encontra Instagram Business account.
 * 5. Salva tudo na franqueada (token criptografado).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectOk = new URL("/onboarding?step=6&conectado=1", request.url);
  const redirectErr = (msg: string) =>
    NextResponse.redirect(
      new URL(`/onboarding?step=6&erro=${encodeURIComponent(msg)}`, request.url),
    );

  if (error) return redirectErr(error);
  if (!code) return redirectErr("Código ausente");

  const cookieStore = cookies();
  const storedState = cookieStore.get("meta_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return redirectErr("State inválido (CSRF)");
  }
  cookieStore.delete("meta_oauth_state");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri =
    process.env.META_REDIRECT_URI ??
    new URL("/api/auth/meta/callback", request.url).toString();

  try {
    // 1 + 2. Code → token
    const shortToken = await exchangeCodeForToken(code, redirectUri);

    // 3. Long-lived token (60 dias)
    const longLived = await exchangeForLongLivedToken(shortToken.access_token);

    // 4. Encontra páginas + IG account
    const pages = await getPagesWithInstagram(longLived.access_token);
    const pageWithIG = pages.find((p) => p.instagram_business_account);

    if (!pageWithIG) {
      return redirectErr(
        "Não encontramos conta Instagram Business. Vincule seu Instagram a uma página Facebook antes de conectar.",
      );
    }

    const igAccount = await getInstagramAccountInfo(
      pageWithIG.instagram_business_account!.id,
      pageWithIG.access_token,
    );

    // 5. Salva na franqueada — usa admin client pra garantir update mesmo
    // se RLS estiver pegando contexto de auth errado.
    const admin = createAdminClient();
    const expiryDate = new Date(
      Date.now() + (longLived.expires_in ?? 60 * 24 * 60 * 60) * 1000,
    ).toISOString();

    const { error: updateError } = await admin
      .from("franqueadas")
      .update({
        instagram_access_token: encrypt(pageWithIG.access_token),
        instagram_conta_id: igAccount.id,
        instagram_handle: igAccount.username,
        instagram_tipo_conta: igAccount.account_type?.toLowerCase() ?? "business",
        instagram_token_expiry: expiryDate,
        facebook_pagina_id: pageWithIG.id,
      })
      .eq("auth_user_id", user.id);

    if (updateError) return redirectErr(`DB: ${updateError.message}`);

    return NextResponse.redirect(redirectOk);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return redirectErr(msg);
  }
}
