import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { criarAdAccount, solicitarAcessoPagina, resolverPaginaId } from "@/lib/meta/bm";

/**
 * POST /api/meta/bm/setup-franqueada
 * 1. Resolve o Page ID a partir do URL da página
 * 2. Cria Ad Account na BM da Scanner para essa franqueada
 * 3. Envia request de acesso à Página (e-mail para ela aceitar)
 * Chamado automaticamente após salvar a URL da página no onboarding.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json() as { facebookPaginaUrl?: string };
  const facebookPaginaUrl = body.facebookPaginaUrl?.trim();
  if (!facebookPaginaUrl) {
    return NextResponse.json({ erro: "facebookPaginaUrl é obrigatório" }, { status: 400 });
  }

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, nome_completo")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) return NextResponse.json({ erro: "Franqueada não encontrada" }, { status: 404 });
  const franqueada = f as { id: string; nome_comercial: string | null; nome_completo: string };

  const nome = franqueada.nome_comercial || franqueada.nome_completo.split(" ")[0];
  const admin = createAdminClient();

  // Verifica se Meta BM está configurado
  if (!process.env.META_BM_ID || !process.env.META_BM_SYSTEM_USER_TOKEN) {
    // Salva URL da página mesmo assim para uso futuro
    await admin.from("franqueadas")
      .update({ facebook_pagina_url: facebookPaginaUrl })
      .eq("id", franqueada.id);
    return NextResponse.json({
      ok: true,
      aviso: "Meta BM não configurado ainda. URL da página salva para configuração futura.",
    });
  }

  try {
    // 1. Resolve Page ID
    const paginaId = await resolverPaginaId(facebookPaginaUrl);

    // 2. Cria Ad Account
    const adAccount = await criarAdAccount({ nomeFranqueada: nome, facebookPaginaId: paginaId });

    // 3. Solicita acesso à Página (envia e-mail para ela)
    await solicitarAcessoPagina({ facebookPaginaId: paginaId });

    // 4. Salva tudo no banco
    await admin.from("franqueadas").update({
      facebook_pagina_url: facebookPaginaUrl,
      facebook_pagina_id: paginaId,
      meta_ads_account_id: adAccount.id,
      meta_ads_account_name: adAccount.name,
      meta_page_access_status: "solicitado",
    }).eq("id", franqueada.id);

    return NextResponse.json({
      ok: true,
      paginaId,
      adAccountId: adAccount.id,
      mensagem: "Ad Account criada e e-mail de vinculação enviado para você aceitar no Facebook.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
