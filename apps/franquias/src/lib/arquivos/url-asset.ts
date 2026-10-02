import "server-only";
import type { createAdminClient } from "@/lib/supabase/server";

/**
 * A URL do arquivo mais recente de um tipo (logo_principal, foto_profissional)
 * da profissional. Era função privada do gerador semanal; o post de venda
 * precisa da mesma logo e da mesma foto pra desenhar a arte dele.
 */
export async function buscarArquivoUrl(
  admin: ReturnType<typeof createAdminClient>,
  franqueadaId: string,
  tipo: string,
): Promise<string | null> {
  const { data } = await admin
    .from("arquivos_franqueada")
    .select("url_storage")
    .eq("franqueada_id", franqueadaId)
    .eq("tipo", tipo)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { url_storage?: string } | null)?.url_storage ?? null;
}
