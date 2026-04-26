import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarPackSemanal } from "@/lib/posts/gerador-semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Trigger manual: POST /api/posts/gerar-semana
 *   body: { slug: "scannerdasaude", semanaRef?: "2026-04-27", qtd?: 5 }
 *
 * Util pra disparar imediatamente sem esperar a quinta 9h.
 * Apenas super_admin.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Nao autenticado" }, { status: 401 });

  const { data: admin } = await supabase
    .from("admins")
    .select("papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const a = admin as { papel?: string } | null;
  if (!a || a.papel !== "super_admin") {
    return NextResponse.json({ erro: "Apenas super_admin" }, { status: 403 });
  }

  const body = (await request.json()) as {
    slug?: string;
    semanaRef?: string;
    qtd?: number;
  };
  if (!body.slug) return NextResponse.json({ erro: "slug obrigatorio" }, { status: 400 });

  const r = await gerarPackSemanal({
    perfilSlug: body.slug,
    semanaRef: body.semanaRef,
    qtd: body.qtd,
  });
  return NextResponse.json(r);
}
