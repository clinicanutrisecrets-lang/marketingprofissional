import { createAlineClient } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/security/encrypt";
import type { Credenciais, LoginTipo } from "./api";

export type PerfilInstagram = {
  id: string;
  slug: string;
  nome: string;
  instagram_handle: string;
  instagram_conta_id: string | null;
  instagram_user_id: string | null;
  instagram_username: string | null;
  instagram_login_tipo: LoginTipo;
  instagram_token_expiry: string | null;
  webhook_assinado_em: string | null;
  automacao_config: Record<string, unknown> | null;
  instrucoes_ia: string | null;
  tom: string | null;
  regras_especiais: string | null;
  cor_primaria: string | null;
};

const COLUNAS =
  "id, slug, nome, instagram_handle, instagram_conta_id, instagram_user_id, instagram_username, " +
  "instagram_login_tipo, instagram_token_expiry, webhook_assinado_em, automacao_config, instrucoes_ia, tom, regras_especiais, cor_primaria";

export async function carregarPerfilPorSlug(slug: string): Promise<PerfilInstagram | null> {
  const aline = createAlineClient();
  const { data, error } = await aline.from("perfis").select(COLUNAS).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`perfis: ${error.message}`);
  return (data as PerfilInstagram | null) ?? null;
}

export async function carregarPerfilPorId(id: string): Promise<PerfilInstagram | null> {
  const aline = createAlineClient();
  const { data, error } = await aline.from("perfis").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw new Error(`perfis: ${error.message}`);
  return (data as PerfilInstagram | null) ?? null;
}

/** Perfil dono de um entry.id de webhook (id profissional OU app-scoped). */
export async function carregarPerfilPorContaInstagram(contaId: string): Promise<PerfilInstagram | null> {
  const aline = createAlineClient();
  const { data, error } = await aline
    .from("perfis")
    .select(COLUNAS)
    .or(`instagram_user_id.eq.${contaId},instagram_conta_id.eq.${contaId}`)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`perfis: ${error.message}`);
  return (data as PerfilInstagram | null) ?? null;
}

/**
 * Token decifrado + base da API do perfil. Devolve null se não conectado ou
 * vencido — quem chama decide a mensagem.
 */
export async function credenciaisDoPerfil(
  perfil: Pick<PerfilInstagram, "id" | "instagram_conta_id" | "instagram_login_tipo" | "instagram_token_expiry">,
): Promise<{ cred: Credenciais; igUserId: string } | { cred: null; motivo: string }> {
  const aline = createAlineClient();
  const { data, error } = await aline
    .from("perfis")
    .select("instagram_access_token")
    .eq("id", perfil.id)
    .maybeSingle();
  if (error) return { cred: null, motivo: `perfis: ${error.message}` };
  const bruto = (data as { instagram_access_token?: string | null } | null)?.instagram_access_token;
  if (!bruto || !perfil.instagram_conta_id) return { cred: null, motivo: "Instagram não conectado" };
  if (perfil.instagram_token_expiry && new Date(perfil.instagram_token_expiry).getTime() < Date.now()) {
    return { cred: null, motivo: "Token do Instagram vencido, reconectar" };
  }
  const token = decrypt(bruto);
  const loginTipo: LoginTipo = perfil.instagram_login_tipo === "instagram" ? "instagram" : "facebook";
  return {
    cred: { loginTipo, token, pathId: loginTipo === "instagram" ? "me" : perfil.instagram_conta_id },
    igUserId: perfil.instagram_conta_id,
  };
}

export async function salvarCredenciaisInstagramLogin(params: {
  slug: string;
  contaId: string; // app-scoped (/me id)
  userId: string | null; // conta profissional (entry.id do webhook)
  username: string | null;
  token: string;
  expiraEm: Date;
}): Promise<void> {
  const aline = createAlineClient();
  const { error } = await aline
    .from("perfis")
    .update({
      instagram_login_tipo: "instagram",
      instagram_conta_id: params.contaId,
      instagram_user_id: params.userId,
      instagram_username: params.username,
      instagram_access_token: encrypt(params.token),
      instagram_token_expiry: params.expiraEm.toISOString(),
    })
    .eq("slug", params.slug);
  if (error) throw new Error(`salvar credenciais: ${error.message}`);
}

export async function salvarTokenRenovado(perfilId: string, token: string, expiraEm: Date): Promise<void> {
  const aline = createAlineClient();
  const { error } = await aline
    .from("perfis")
    .update({ instagram_access_token: encrypt(token), instagram_token_expiry: expiraEm.toISOString() })
    .eq("id", perfilId);
  if (error) throw new Error(`renovar token: ${error.message}`);
}

export async function marcarWebhookAssinado(perfilId: string): Promise<void> {
  const aline = createAlineClient();
  await aline.from("perfis").update({ webhook_assinado_em: new Date().toISOString() }).eq("id", perfilId);
}

export async function desconectarInstagram(perfilId: string): Promise<void> {
  const aline = createAlineClient();
  const { error } = await aline
    .from("perfis")
    .update({
      instagram_access_token: null,
      instagram_token_expiry: null,
      webhook_assinado_em: null,
    })
    .eq("id", perfilId);
  if (error) throw new Error(`desconectar: ${error.message}`);
}
