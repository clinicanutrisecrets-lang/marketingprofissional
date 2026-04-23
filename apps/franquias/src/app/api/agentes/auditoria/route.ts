import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarAuditoriaConteudo } from "@/lib/agentes/auditoria";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { franqueadaId?: string };

  let franqueadaId: string | null = null;

  if (body.franqueadaId) {
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!admin) {
      return NextResponse.json({ erro: "Apenas admin dispara pra outra franqueada" }, { status: 403 });
    }
    franqueadaId = body.franqueadaId;
  } else {
    const { data: f } = await supabase
      .from("franqueadas")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
    franqueadaId = (f as { id: string }).id;
  }

  const r = await executarAuditoriaConteudo({ franqueadaId: franqueadaId! });
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({ ok: true, auditoriaId: r.auditoriaId });
}
