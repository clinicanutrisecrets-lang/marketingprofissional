import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { PublicoDaCopy } from "@/lib/claude/copy-agent";
import { validarPublico } from "./publico";

/**
 * Espelha aqui o PÚBLICO que a profissional declarou no onboarding do Scanner.
 *
 * Até 25/09/2026 a página de venda dela recebia isso (o briefing mora no
 * Scanner Tratamentos) e o POST do Instagram não. Resultado: o post não tinha
 * como obedecer "ela não atende gestante", e falava de emagrecer pra quem não
 * trabalha com peso.
 *
 * 🔴 Espelho, não busca ao vivo: a geração semanal roda num cron e não pode
 * depender de um HTTP ao Hub no instante em que escreve o post. Mesma decisão
 * de `produtos_scanner`, e por isso roda no MESMO cron diário.
 *
 * 🔴 Falha aqui NUNCA apaga o que já está espelhado. Hub fora do ar não pode
 * fazer a copy da semana esquecer o que a nutri não atende: o valor velho é
 * melhor que nenhum. Só uma resposta 200 dizendo `publico: null` limpa.
 */
export async function sincronizarPublicoDoHub(
  franqueadaId: string,
): Promise<{ ok: true; tem: boolean } | { ok: false; motivo: string }> {
  const secret = process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return { ok: false, motivo: "sem_secret" };

  const admin = createAdminClient();
  const { data: franq, error: franqErr } = await admin
    .from("franqueadas")
    .select("id, scanner_saas_user_id")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (franqErr || !franq) {
    return { ok: false, motivo: franqErr?.message ?? "Franqueada não encontrada" };
  }

  const scannerUserId = (franq as { scanner_saas_user_id: string | null }).scanner_saas_user_id;
  if (!scannerUserId) return { ok: false, motivo: "sem_vinculo_scanner" };

  const scannerUrl = process.env.SCANNER_SAAS_URL ?? "https://scannerdasaude.com";
  let payload: { publico?: unknown; origem?: string | null };

  try {
    const res = await fetch(
      `${scannerUrl}/api/integrations/marketing/publico?scanner_user_id=${encodeURIComponent(scannerUserId)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );
    if (res.status === 403) return { ok: false, motivo: "plano_nao_elegivel" };
    if (res.status === 404) return { ok: false, motivo: "nutri_nao_encontrada" };
    if (!res.ok) {
      const detalhe = await res.text().catch(() => "");
      console.error("[publico-sync] Scanner retornou", res.status, detalhe.slice(0, 300));
      return { ok: false, motivo: `scanner_http_${res.status}` };
    }
    payload = await res.json();
  } catch (e) {
    console.error("[publico-sync] fetch falhou:", e);
    return { ok: false, motivo: "scanner_indisponivel" };
  }

  const publico = validarPublico(payload.publico);
  // Payload em variável (e não literal) é o jeito que o resto do app atualiza
  // `franqueadas`: com literal, o tipo gerado do Supabase resolve pra `never`
  // e o `tsc` acusa. Ver lib/onboarding/actions.ts e lib/admin/actions.ts.
  const patch: Record<string, unknown> = {
    publico_briefing: publico,
    publico_briefing_em: new Date().toISOString(),
  };
  const { error } = await admin.from("franqueadas").update(patch).eq("id", franqueadaId);

  if (error) {
    console.error("[publico-sync] update falhou:", error.message);
    return { ok: false, motivo: error.message };
  }
  return { ok: true, tem: publico !== null };
}

/** Lê o público espelhado, pro contexto de geração. Falha = sem restrição. */
export async function carregarPublicoContexto(
  client: { from: (t: string) => any },
  franqueadaId: string,
): Promise<PublicoDaCopy | null> {
  const { data, error } = await client
    .from("franqueadas")
    .select("publico_briefing")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (error) {
    console.error("[publico-contexto] select falhou:", error.message);
    return null;
  }
  return validarPublico((data as { publico_briefing?: unknown } | null)?.publico_briefing);
}

export { validarPublico } from "./publico";
