import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarCopyAnuncio } from "@/lib/agentes/ads";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    franqueadaId?: string;
    briefing?: Record<string, unknown>;
  };

  if (!body.briefing) {
    return NextResponse.json({ erro: "briefing obrigatório" }, { status: 400 });
  }

  let franqueadaId = body.franqueadaId;
  if (franqueadaId) {
    const { data: a } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!a) return NextResponse.json({ erro: "Somente admin" }, { status: 403 });
  } else {
    const { data: f } = await supabase
      .from("franqueadas")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
    franqueadaId = (f as { id: string }).id;
  }

  const r = await gerarCopyAnuncio({
    franqueadaId: franqueadaId!,
    briefing: body.briefing as {
      objetivo_negocio: string;
      dor_principal: string;
      publico_alvo?: string;
      tema_ou_hook?: string;
      budget_diario?: number;
      mecanismo_unico?: string;
      posicionamento?: string;
      depoimento_referencia?: string;
    },
  });

  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({
    ok: true,
    output: r.output,
    meta: {
      tokens: r.tokensUsados,
      custoUsd: r.custoUsd,
      latenciaMs: r.latenciaMs,
    },
  });
}
