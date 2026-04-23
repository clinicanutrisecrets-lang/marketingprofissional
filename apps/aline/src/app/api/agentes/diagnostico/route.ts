import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarDiagnosticoPerfil } from "@/lib/agentes/diagnostico";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/agentes/diagnostico (Studio Aline)
 * Body: { perfilSlug: "scannerdasaude" | "nutrisecrets" }
 */
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

  const r = await executarDiagnosticoPerfil({ perfilSlug: body.perfilSlug });
  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({ ok: true, diagnosticoId: r.diagnosticoId });
}
