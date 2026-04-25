import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Inicia OAuth Instagram. Recebe ?slug=<perfil-slug> e redireciona pro Meta.
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ erro: "slug ausente" }, { status: 400 });

  const APP_ID = process.env.META_APP_ID;
  const REDIRECT = process.env.META_REDIRECT_URI;
  if (!APP_ID || !REDIRECT) {
    return NextResponse.json(
      { erro: "META_APP_ID/REDIRECT_URI nao configurados" },
      { status: 500 },
    );
  }

  const dialog = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  dialog.searchParams.set("client_id", APP_ID);
  dialog.searchParams.set("redirect_uri", REDIRECT);
  dialog.searchParams.set("state", slug);
  dialog.searchParams.set(
    "scope",
    [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ].join(","),
  );

  return NextResponse.redirect(dialog);
}
