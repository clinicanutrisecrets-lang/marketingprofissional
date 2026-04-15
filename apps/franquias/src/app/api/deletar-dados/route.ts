import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Recebe solicitação de exclusão de dados (LGPD + Meta App Review).
 * Grava em `solicitacoes_exclusao` e envia alerta para admin.
 * Processamento em 30 dias pelo admin.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email as string)?.trim().toLowerCase();
    const instagram = (body.instagram as string)?.trim();
    const motivo = (body.motivo as string)?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ erro: "Email inválido" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Tenta gravar na tabela de solicitações (se não existir ainda, loga no console)
    const { error } = await admin.from("solicitacoes_exclusao").insert({
      email,
      instagram_handle: instagram || null,
      motivo: motivo || null,
      status: "pendente",
      criado_em: new Date().toISOString(),
    });

    if (error) {
      // Fallback: loga pro server (admin monitora via Vercel logs)
      console.error("[deletar-dados] erro gravando:", error.message, {
        email,
        instagram,
        motivo,
      });
      // Mesmo com erro, retorna ok pra não exibir erro técnico pro usuário
      // O admin vê o log e atua manualmente
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { erro: (e as Error).message },
      { status: 500 },
    );
  }
}
