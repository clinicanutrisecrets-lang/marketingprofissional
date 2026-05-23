import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAdsAuthUrl } from "@/lib/meta/oauth";

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const state = randomBytes(32).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("meta_ads_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const redirectUri =
    process.env.META_ADS_REDIRECT_URI ??
    new URL("/api/auth/meta/ads/callback", request.url).toString();

  return NextResponse.redirect(buildAdsAuthUrl(state, redirectUri));
}
