import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await request.formData();
  const metaCampaignId = formData.get("meta_campaign_id") as string;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/admin/login", request.url));

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) return new NextResponse("Forbidden", { status: 403 });

  const adminDb = createAdminClient();
  await adminDb
    .from("anuncios")
    .update({
      status: "ativo",
      meta_campaign_id: metaCampaignId || null,
    })
    .eq("id", id);

  return NextResponse.redirect(new URL("/admin/anuncios", request.url), { status: 303 });
}
