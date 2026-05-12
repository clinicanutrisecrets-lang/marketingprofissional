import { NextRequest, NextResponse } from "next/server";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { exchangeCode, getCanvaUserInfo } from "@/lib/canva/client";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erro = url.searchParams.get("error");

  if (erro) {
    return NextResponse.redirect(
      `${APP_URL}/configuracoes/canva?erro=${encodeURIComponent(erro)}`,
    );
  }

  const stateCookie = req.cookies.get("canva_oauth_state")?.value;
  const userIdCookie = req.cookies.get("canva_oauth_user")?.value;

  if (!code || !state || state !== stateCookie || !userIdCookie) {
    return NextResponse.redirect(
      `${APP_URL}/configuracoes/canva?erro=state_invalido`,
    );
  }

  try {
    const tokens = await exchangeCode(code);

    // Pega info do usuário Canva (id + email se permitido)
    let canvaUserId: string | null = null;
    let canvaUserEmail: string | null = null;
    try {
      const info = await getCanvaUserInfo(tokens.access_token);
      canvaUserId = info.user?.id ?? null;
      canvaUserEmail = info.email ?? null;
    } catch {
      // sem fatal — info é cosmético
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
    const scopes = (tokens.scope ?? "").split(" ").filter(Boolean);

    const admin = createAlineClient();
    const { error } = await admin.rpc("set_canva_credentials", {
      p_access_token: tokens.access_token,
      p_refresh_token: tokens.refresh_token ?? null,
      p_token_expiry: expiry,
      p_canva_user_id: canvaUserId,
      p_canva_user_email: canvaUserEmail,
      p_scopes: scopes,
      p_user_id: userIdCookie,
    });

    if (error) {
      return NextResponse.redirect(
        `${APP_URL}/configuracoes/canva?erro=${encodeURIComponent(error.message)}`,
      );
    }

    const res = NextResponse.redirect(`${APP_URL}/configuracoes/canva?ok=1`);
    res.cookies.delete("canva_oauth_state");
    res.cookies.delete("canva_oauth_user");
    return res;
  } catch (e) {
    return NextResponse.redirect(
      `${APP_URL}/configuracoes/canva?erro=${encodeURIComponent((e as Error).message)}`,
    );
  }
}
