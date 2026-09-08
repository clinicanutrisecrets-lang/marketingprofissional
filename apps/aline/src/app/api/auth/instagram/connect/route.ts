import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { configInstagramLogin, urlAutorizacaoInstagram } from "@/lib/instagram/oauth-instagram";

export const dynamic = "force-dynamic";

/**
 * Inicia a conexão do Instagram de um perfil. Recebe ?slug=<perfil-slug>.
 *
 * Caminho preferido: login DIRETO do Instagram (INSTAGRAM_APP_ID/SECRET, app
 * "Automacao NS") — sem Página do Facebook, com comentários e DMs.
 * `?via=facebook` força o fluxo antigo pela Página (app do Scanner), que só
 * publica.
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

  const via = url.searchParams.get("via");
  const igCfg = configInstagramLogin();
  if (via !== "facebook" && igCfg) {
    return NextResponse.redirect(urlAutorizacaoInstagram({ appId: igCfg.appId, redirectUri: igCfg.redirectUri, slug }));
  }

  const APP_ID = process.env.META_APP_ID;
  const REDIRECT = process.env.META_REDIRECT_URI;
  if (!APP_ID || !REDIRECT) {
    return NextResponse.json(
      { erro: "Nem INSTAGRAM_APP_ID/SECRET (login do Instagram) nem META_APP_ID/REDIRECT_URI (login pela Página) estão configurados" },
      { status: 500 },
    );
  }

  const dialog = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  dialog.searchParams.set("client_id", APP_ID);
  dialog.searchParams.set("redirect_uri", REDIRECT);
  dialog.searchParams.set("state", slug);
  dialog.searchParams.set(
    "scope",
    ["instagram_business_basic", "instagram_content_publish", "pages_show_list", "pages_read_engagement", "business_management"].join(","),
  );
  return NextResponse.redirect(dialog);
}
