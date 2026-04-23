import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarDiagnosticoPerfil } from "@/lib/agentes/diagnostico";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/agentes/diagnostico
 * Dispara Skill 1 do Agente Orgânico pra franqueada autenticada
 * (ou pra franqueadaId no body se chamado por admin).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  let franqueadaId: string | null = null;

  const body = (await req.json().catch(() => ({}))) as { franqueadaId?: string };
  const franqueadaIdSolicitada = body.franqueadaId;

  if (franqueadaIdSolicitada) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!adminRow) {
      return NextResponse.json(
        { erro: "Apenas admins podem solicitar diagnóstico para outra franqueada" },
        { status: 403 },
      );
    }
    franqueadaId = franqueadaIdSolicitada;
  } else {
    const { data: franq } = await supabase
      .from("franqueadas")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!franq) {
      return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
    }
    franqueadaId = (franq as { id: string }).id;
  }

  const resultado = await executarDiagnosticoPerfil({ franqueadaId: franqueadaId! });

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    diagnosticoId: resultado.diagnosticoId,
  });
}
