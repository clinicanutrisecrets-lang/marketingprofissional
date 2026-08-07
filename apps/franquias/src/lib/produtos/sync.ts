import { createAdminClient } from "@/lib/supabase/server";

/**
 * Sincroniza os produtos da nutri no Scanner Tratamentos pro cache local
 * (tabela produtos_scanner).
 *
 * Fonte: GET {SCANNER_SAAS_URL}/api/integrations/marketing/produtos
 * ?scanner_user_id=… com Bearer MARKETING_WEBHOOK_SECRET. O Hub (Scanner
 * SaaS) faz de gateway pro Scanner Cursos — este app NUNCA fala direto
 * com tratamentos.scannerdasaude.com.
 *
 * Chamada: botão "Atualizar produtos" na tela Posts de venda, e cron
 * diário /api/cron/sincronizar-produtos.
 */

export type ProdutoScannerRemoto = {
  produto_id?: string;
  nome?: string;
  tipo?: string;
  descricao?: string;
  scanner_produto_id?: string;
  preco_centavos?: number;
  parcelas_max?: number;
  checkout_url?: string;
};

export type ResultadoSync =
  | { ok: true; total: number; desativados: number }
  | { ok: false; motivo: string };

export async function sincronizarProdutosScanner(
  franqueadaId: string,
): Promise<ResultadoSync> {
  const secret = process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, motivo: "MARKETING_WEBHOOK_SECRET não configurado" };
  }

  const admin = createAdminClient();

  const { data: franq, error: franqErr } = await admin
    .from("franqueadas")
    .select("id, scanner_saas_user_id")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (franqErr || !franq) {
    return { ok: false, motivo: franqErr?.message ?? "Franqueada não encontrada" };
  }

  const scannerUserId = (franq as { scanner_saas_user_id: string | null })
    .scanner_saas_user_id;
  if (!scannerUserId) {
    return { ok: false, motivo: "sem_vinculo_scanner" };
  }

  const scannerUrl = process.env.SCANNER_SAAS_URL ?? "https://scannerdasaude.com";
  let payload: { vinculado?: boolean; produtos?: ProdutoScannerRemoto[] };

  try {
    const res = await fetch(
      `${scannerUrl}/api/integrations/marketing/produtos?scanner_user_id=${encodeURIComponent(scannerUserId)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    if (res.status === 403) return { ok: false, motivo: "plano_nao_elegivel" };
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      console.error("[produtos-sync] Scanner retornou", res.status, detalhe.slice(0, 300));
      return { ok: false, motivo: `scanner_http_${res.status}` };
    }
    payload = await res.json();
  } catch (e) {
    console.error("[produtos-sync] fetch falhou:", e);
    return { ok: false, motivo: "scanner_indisponivel" };
  }

  if (payload.vinculado === false) {
    // Nutri ainda não criou a área de vendas no Scanner Tratamentos —
    // não é erro; zera o cache pra tela mostrar o estado real.
    const { error } = await admin
      .from("produtos_scanner")
      .update({ ativo: false, sincronizado_em: new Date().toISOString() })
      .eq("franqueada_id", franqueadaId);
    if (error) console.error("[produtos-sync] desativar (sem vínculo) falhou:", error.message);
    return { ok: true, total: 0, desativados: 0 };
  }

  const validos = (payload.produtos ?? []).filter(
    (p): p is ProdutoScannerRemoto & { produto_id: string; nome: string; checkout_url: string } =>
      typeof p?.produto_id === "string" &&
      p.produto_id.length > 0 &&
      typeof p?.nome === "string" &&
      p.nome.length > 0 &&
      typeof p?.checkout_url === "string" &&
      p.checkout_url.startsWith("http"),
  );

  const agora = new Date().toISOString();

  for (const p of validos) {
    const { error } = await admin.from("produtos_scanner").upsert(
      {
        franqueada_id: franqueadaId,
        produto_id: p.produto_id,
        nome: p.nome,
        tipo: p.tipo ?? null,
        descricao: p.descricao ?? null,
        scanner_produto_id: p.scanner_produto_id ?? null,
        preco_centavos: typeof p.preco_centavos === "number" ? p.preco_centavos : null,
        parcelas_max: typeof p.parcelas_max === "number" ? p.parcelas_max : null,
        checkout_url: p.checkout_url,
        ativo: true,
        sincronizado_em: agora,
      },
      { onConflict: "franqueada_id,produto_id" },
    );
    if (error) {
      // Erro de escrita não pode passar batido — a nutri acharia que
      // sincronizou e postaria link velho.
      console.error("[produtos-sync] upsert falhou:", error.message, p.produto_id);
      return { ok: false, motivo: `erro_gravacao: ${error.message}` };
    }
  }

  // Desativa o que sumiu do catálogo (produto arquivado/oferta desligada)
  let desativados = 0;
  const idsAtuais = validos.map((p) => p.produto_id);
  const query = admin
    .from("produtos_scanner")
    .update({ ativo: false, sincronizado_em: agora })
    .eq("franqueada_id", franqueadaId)
    .eq("ativo", true);
  const { data: desativadosRows, error: desativarErr } = await (idsAtuais.length > 0
    ? query.not("produto_id", "in", `(${idsAtuais.map((i) => `"${i}"`).join(",")})`)
    : query
  ).select("id");

  if (desativarErr) {
    console.error("[produtos-sync] desativar removidos falhou:", desativarErr.message);
  } else {
    desativados = desativadosRows?.length ?? 0;
  }

  return { ok: true, total: validos.length, desativados };
}
