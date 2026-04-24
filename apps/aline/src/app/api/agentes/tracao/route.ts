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
    perfilSlug?: string;
    tipo?: TipoTracao;
    input?: Record<string, unknown>;
  };

  if (!body.perfilSlug || !body.tipo || !body.input) {
    return NextResponse.json(
      { erro: "perfilSlug, tipo e input obrigatórios" },
      { status: 400 },
    );
  }

  const r = await executarTracao({
    perfilSlug: body.perfilSlug,
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
