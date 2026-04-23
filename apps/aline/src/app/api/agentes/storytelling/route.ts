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
    perfilSlug?: string;
    depoimentoId?: string;
    input?: Record<string, unknown>;
  };

  if (!body.modo || !body.input || !body.perfilSlug) {
    return NextResponse.json({ erro: "modo, perfilSlug e input obrigatórios" }, { status: 400 });
  }

  const r = await executarStorytelling({
    perfilSlug: body.perfilSlug,
    modo: body.modo,
    depoimentoId: body.depoimentoId,
    input: body.input,
  });

  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 500 });
  return NextResponse.json({ ok: true, storytellingId: r.storytellingId, output: r.output });
}
