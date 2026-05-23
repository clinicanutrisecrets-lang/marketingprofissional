import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { listarContas } from "@/lib/publer/client";

/**
 * GET /api/publer/accounts
 * Lista contas do Publer e tenta identificar a conta da franqueada pelo instagram_handle.
 * Se encontrar, salva o publer_profile_id automaticamente.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, instagram_handle, publer_profile_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
  const franqueada = f as { id: string; instagram_handle: string | null; publer_profile_id: string | null };

  try {
    const contas = await listarContas();
    const instagram = contas.filter((c) => c.provider === "instagram");

    // Tenta associar pelo handle
    const handle = (franqueada.instagram_handle ?? "").toLowerCase().replace("@", "");
    const match = handle
      ? instagram.find((c) => c.name?.toLowerCase().replace("@", "") === handle)
      : null;

    // Se encontrou e ainda não estava salvo, salva
    if (match && !franqueada.publer_profile_id) {
      const admin = createAdminClient();
      await admin
        .from("franqueadas")
        .update({ publer_profile_id: match.id })
        .eq("id", franqueada.id);
    }

    return NextResponse.json({
      contas: instagram,
      contaVinculada: match ?? null,
      jaSalvo: !!franqueada.publer_profile_id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
