import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarTracao, type TipoTracao } from "@/lib/agentes/tracao";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    tipo?: TipoTracao;
    input?: Record<string, unknown>;
    franqueadaId?: string;
  };

  if (!body.tipo || !body.input) {
    return NextResponse.json({ erro: "tipo e input obrigatórios" }, { status: 400 });
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

  const r = await executarTracao({
    franqueadaId: franqueadaId!,
    tipo: body.tipo,
    input: body.input,
  });

  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({
    ok: true,
    tracaoId: r.tracaoId,
    output: r.output,
    violacoes: r.violacoes,
  });
}
