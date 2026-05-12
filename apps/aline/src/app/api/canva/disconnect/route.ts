import { NextResponse } from "next/server";
import { createClient, createAlineClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "auth" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) return NextResponse.json({ erro: "admin_only" }, { status: 403 });

  const alineAdmin = createAlineClient();
  const { error } = await alineAdmin.rpc("disconnect_canva");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
