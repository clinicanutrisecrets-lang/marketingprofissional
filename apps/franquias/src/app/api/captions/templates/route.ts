import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTemplates } from "@/lib/captions/client";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  try {
    const templates = await listTemplates();
    return NextResponse.json({ templates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
