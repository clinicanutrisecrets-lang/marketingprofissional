import { NextResponse } from "next/server";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/security/encrypt";
import { assinarWebhooks, obterMe } from "@/lib/instagram/api";
import { marcarWebhookAssinado, salvarCredenciaisInstagramLogin } from "@/lib/instagram/credenciais";
import { configInstagramLogin, PREFIXO_STATE, trocarCodigoPorTokenLongo } from "@/lib/instagram/oauth-instagram";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth do Instagram — atende os DOIS fluxos, decididos pelo `state`:
 *
 *   state = "ig:<slug>"  → login direto do Instagram (app "Automacao NS")
 *                          code → token longo → /me → grava → assina webhooks.
 *   state = "<slug>"     → login pela Página do Facebook (app do Scanner), fluxo
 *                          antigo. Token gravado cifrado NO APP (as RPCs de
 *                          pgsodium nunca existiram em produção).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error") ?? url.searchParams.get("error_reason");

  if (errorParam) {
    return NextResponse.redirect(new URL(`/dashboard?ig_error=${encodeURIComponent(errorParam)}`, request.url));
  }
  if (!code || !state) return NextResponse.json({ erro: "code/state ausentes" }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    if (state.startsWith(PREFIXO_STATE)) {
      const slug = state.slice(PREFIXO_STATE.length);
      const cfg = configInstagramLogin();
      if (!cfg) throw new Error("INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET não configurados na Vercel do studio-aline");

      const tokenLongo = await trocarCodigoPorTokenLongo(cfg, code);
      const cred = { loginTipo: "instagram" as const, pathId: "me", token: tokenLongo.accessToken };
      const me = await obterMe(cred);

      const aline = createAlineClient();
      const { data: perfil } = await aline.from("perfis").select("id, instagram_handle").eq("slug", slug).maybeSingle();
      if (!perfil) throw new Error(`Perfil '${slug}' não existe`);
      const handleEsperado = ((perfil as { instagram_handle: string }).instagram_handle ?? "").toLowerCase().replace(/^@/, "");
      const handleRecebido = (me.username ?? "").toLowerCase();
      if (handleEsperado && handleRecebido && handleEsperado !== handleRecebido) {
        throw new Error(
          `Você entrou com @${handleRecebido}, mas este perfil é @${handleEsperado}. Saia do Instagram e conecte com a conta certa.`,
        );
      }

      await salvarCredenciaisInstagramLogin({
        slug,
        contaId: me.id,
        userId: me.user_id ?? tokenLongo.userId ?? null,
        username: me.username ?? null,
        token: tokenLongo.accessToken,
        expiraEm: tokenLongo.expiraEm,
      });

      // Assina comentários e mensagens pra esta conta. Falha aqui NÃO desfaz a
      // conexão: publicar já funciona; a tela mostra "webhook pendente".
      let aviso = "";
      try {
        await assinarWebhooks(cred);
        await marcarWebhookAssinado((perfil as { id: string }).id);
      } catch (e) {
        console.error("[instagram/callback] subscribed_apps falhou:", (e as Error).message);
        aviso = "&webhook=falhou";
      }
      return NextResponse.redirect(new URL(`/perfis/${slug}?ig_conectado=1${aviso}`, request.url));
    }

    // ── Fluxo antigo (Página do Facebook) ──
    const APP_ID = process.env.META_APP_ID;
    const APP_SECRET = process.env.META_APP_SECRET;
    const REDIRECT = process.env.META_REDIRECT_URI;
    if (!APP_ID || !APP_SECRET || !REDIRECT) throw new Error("META_APP_ID/SECRET/REDIRECT_URI não configurados");

    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", APP_ID);
    tokenUrl.searchParams.set("client_secret", APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", REDIRECT);
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) throw new Error(`token: ${await tokenRes.text()}`);
    const tokenJson = (await tokenRes.json()) as { access_token: string };

    const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", APP_ID);
    longUrl.searchParams.set("client_secret", APP_SECRET);
    longUrl.searchParams.set("fb_exchange_token", tokenJson.access_token);
    const longRes = await fetch(longUrl);
    if (!longRes.ok) throw new Error(`long token: ${await longRes.text()}`);
    const longJson = (await longRes.json()) as { access_token: string; expires_in?: number };
    const userToken = longJson.access_token;
    const expiry = new Date(Date.now() + (longJson.expires_in ?? 60 * 24 * 3600) * 1000);

    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userToken}`,
    );
    if (!pagesRes.ok) throw new Error(`pages: ${await pagesRes.text()}`);
    const pagesJson = (await pagesRes.json()) as {
      data: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }>;
    };
    const pagesComIg = pagesJson.data.filter((p) => p.instagram_business_account?.id);
    if (pagesComIg.length === 0) throw new Error("Nenhuma Página do Facebook conectada a um Instagram profissional.");

    const aline = createAlineClient();
    const { data: perfilRow } = await aline.from("perfis").select("instagram_handle").eq("slug", state).maybeSingle();
    const handleEsperado = ((perfilRow as { instagram_handle?: string } | null)?.instagram_handle ?? state).toLowerCase().replace(/^@/, "");
    const pageMatch = pagesComIg.find(
      (p) => p.instagram_business_account?.username?.toLowerCase().replace(/^@/, "") === handleEsperado,
    );
    if (!pageMatch) {
      const candidatos = pagesComIg.map((p) => p.instagram_business_account?.username ?? p.name).join(", ");
      throw new Error(`Nenhum Instagram vinculado bate com '@${handleEsperado}'. Encontrados: ${candidatos}.`);
    }

    const { error } = await aline
      .from("perfis")
      .update({
        instagram_login_tipo: "facebook",
        instagram_conta_id: pageMatch.instagram_business_account!.id,
        instagram_user_id: pageMatch.instagram_business_account!.id,
        instagram_username: pageMatch.instagram_business_account!.username ?? null,
        facebook_pagina_id: pageMatch.id,
        instagram_access_token: encrypt(pageMatch.access_token),
        instagram_token_expiry: expiry.toISOString(),
      })
      .eq("slug", state);
    if (error) throw new Error(`perfis: ${error.message}`);

    return NextResponse.redirect(new URL(`/perfis/${state}?ig_conectado=1`, request.url));
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`/dashboard?ig_error=${msg}`, request.url));
  }
}
