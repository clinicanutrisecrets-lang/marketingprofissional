import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/meta/oauth";

/**
 * Inicia o fluxo OAuth do Meta (Instagram + Facebook Pages).
 * Gera um state CSRF, salva em cookie, e redireciona pro Facebook.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("meta_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 min
    path: "/",
  });

  const redirectUri =
    process.env.META_REDIRECT_URI ??
    new URL("/api/auth/meta/callback", request.url).toString();

  const authUrl = buildAuthUrl(state, redirectUri);
  return NextResponse.redirect(authUrl);
}
