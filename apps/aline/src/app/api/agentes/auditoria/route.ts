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

  const body = (await req.json().catch(() => ({}))) as { perfilSlug?: string };
  if (!body.perfilSlug) {
    return NextResponse.json({ erro: "perfilSlug obrigatório" }, { status: 400 });
  }

  const r = await executarAuditoriaConteudo({ perfilSlug: body.perfilSlug });
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({ ok: true, auditoriaId: r.auditoriaId });
}
