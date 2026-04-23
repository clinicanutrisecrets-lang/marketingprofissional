import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executarStorytelling, type ModoStorytelling } from "@/lib/agentes/storytelling";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    modo?: ModoStorytelling;
    depoimentoId?: string;
    input?: Record<string, unknown>;
    franqueadaId?: string;
  };

  if (!body.modo || !body.input) {
    return NextResponse.json({ erro: "modo e input obrigatórios" }, { status: 400 });
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

  const r = await executarStorytelling({
    franqueadaId: franqueadaId!,
    modo: body.modo,
    depoimentoId: body.depoimentoId,
    input: body.input,
  });

  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({ ok: true, storytellingId: r.storytellingId, output: r.output });
}
