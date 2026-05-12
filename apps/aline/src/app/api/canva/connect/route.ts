import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/canva/client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Inicia OAuth Canva. Só admin pode conectar (conta única por instância).
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"));
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return NextResponse.json({ erro: "Apenas admin pode conectar Canva" }, { status: 403 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("canva_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  res.cookies.set("canva_oauth_user", user.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
