import "server-only";
import { sha256 } from "@/lib/ads/capi-hash";
import {
  criarCustomerListAudience,
  adicionarUsuariosCustomerList,
} from "@/lib/meta/ads";
import type { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Mínimo de contatos próprios pra valer a pena semear lookalike da nutri.
 * A Meta precisa de ~100 correspondências; tentamos a partir de 50 contatos
 * (a criação do lookalike falha-soft se a base ainda for pequena).
 */
export const MIN_SEED_PROPRIO = 50;

type Contato = { emailSha256?: string; phoneSha256?: string };

/**
 * Extrai os contatos das PACIENTES DA PRÓPRIA NUTRI (quem comprou ou agendou)
 * a partir de conversoes_registradas. Hasheia (SHA256) email/telefone.
 * Dedup por hash de email (ou telefone quando sem email).
 */
export async function coletarContatosProprios(
  admin: Admin,
  franqueadaId: string,
): Promise<Contato[]> {
  const { data } = await admin
    .from("conversoes_registradas")
    .select("payload_origem, tipo")
    .eq("franqueada_id", franqueadaId)
    .in("tipo", ["Purchase", "Schedule"])
    .limit(5000);

  const porChave = new Map<string, Contato>();
  for (const row of (data ?? []) as Array<{ payload_origem: unknown }>) {
    const payload = (row.payload_origem ?? {}) as Record<string, unknown>;
    const cliente = (payload.cliente ?? payload.paciente ?? {}) as {
      email?: unknown;
      phone?: unknown;
    };
    const email = typeof cliente.email === "string" ? cliente.email.trim() : "";
    const phoneDigits = typeof cliente.phone === "string" ? cliente.phone.replace(/\D/g, "") : "";
    if (!email && !phoneDigits) continue;

    const chave = email ? `e:${email.toLowerCase()}` : `p:${phoneDigits}`;
    if (porChave.has(chave)) continue;
    porChave.set(chave, {
      emailSha256: email ? sha256(email) : undefined,
      phoneSha256: phoneDigits ? sha256(phoneDigits) : undefined,
    });
  }
  return [...porChave.values()];
}

/**
 * Monta a semente PRÓPRIA da nutri (custom audience de lista de clientes) pra
 * usar como origem do lookalike premium. Retorna o audienceId ou null quando
 * a nutri ainda não tem base suficiente (cold start → caller usa pixel central).
 */
export async function montarSeedProprioDaNutri(
  admin: Admin,
  franqueadaId: string,
  meta: { adAccountId: string; accessToken: string; nomeAnuncio: string },
): Promise<{ audienceId: string; contatos: number } | null> {
  const contatos = await coletarContatosProprios(admin, franqueadaId);
  if (contatos.length < MIN_SEED_PROPRIO) return null;

  const ca = await criarCustomerListAudience({
    adAccountId: meta.adAccountId,
    accessToken: meta.accessToken,
    nome: `Pacientes da nutri · seed lookalike · ${meta.nomeAnuncio}`,
  });
  await adicionarUsuariosCustomerList({
    adAccountId: meta.adAccountId,
    accessToken: meta.accessToken,
    audienceId: ca.id,
    usuariosHash: contatos,
  });
  return { audienceId: ca.id, contatos: contatos.length };
}
