"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/emails/client";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

function gerarToken(): string {
  return randomBytes(24).toString("base64url");
}

async function assertAdmin(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data ? (data as { auth_user_id: string }).auth_user_id : null;
}

/**
 * Admin cria convite pra nova franqueada e envia email com link.
 */
export async function enviarConviteFranqueada(params: {
  email: string;
  nome_completo: string;
  plano?: string;
}): Promise<{ ok: boolean; token?: string; erro?: string }> {
  const adminUserId = await assertAdmin();
  if (!adminUserId) return { ok: false, erro: "Não autorizado" };

  const admin = createAdminClient();

  const token = gerarToken();
  const { data, error } = await admin
    .from("convites_franqueadas")
    .insert({
      token,
      email: params.email.toLowerCase().trim(),
      nome_completo: params.nome_completo.trim(),
      plano: params.plano ?? "franquia_basico",
      status: "pendente",
      enviado_por: adminUserId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com";
  const linkConvite = `${baseUrl}/convite/${token}`;

  // Email de convite
  try {
    const primeiroNome = params.nome_completo.split(" ")[0];
    const html = `
      <div style="font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #F5F7F5;">
        <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="background: #0BB8A8; color: white; padding: 28px 32px;">
            <div style="font-size: 14px; opacity: 0.85;">SCANNER DA SAÚDE</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 4px;">Você foi convidada!</div>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 15px; line-height: 1.6; color: #374151;">
              Oi, <strong>${primeiroNome}</strong>! Você foi convidada a fazer parte da
              Franquia Digital Scanner da Saúde.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #374151;">
              A plataforma vai cuidar do seu marketing no Instagram — gerar conteúdo,
              publicar, gerenciar anúncios, tudo alinhado com seu tom e seu público.
            </p>
            <p style="margin: 28px 0;">
              <a href="${linkConvite}" style="display: inline-block; background: #0BB8A8; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">
                Aceitar convite →
              </a>
            </p>
            <p style="font-size: 13px; color: #9CA3AF;">
              Esse link expira em 14 dias. Se você não estava esperando esse convite, ignora esse email.
            </p>
          </div>
        </div>
      </div>
    `;
    await enviarEmail({
      para: params.email,
      assunto: "Convite Scanner da Saúde — Franquia Digital",
      html,
      texto: `Oi ${primeiroNome}! Aceite seu convite Scanner da Saúde: ${linkConvite}`,
    });
  } catch (e) {
    console.warn("[convite] email falhou:", e);
  }

  revalidatePath("/admin/franqueadas");
  return { ok: true, token };
}

export async function listarConvites() {
  const adminUserId = await assertAdmin();
  if (!adminUserId) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("convites_franqueadas")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(50);

  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function cancelarConvite(id: string) {
  const adminUserId = await assertAdmin();
  if (!adminUserId) return { ok: false };

  const admin = createAdminClient();
  await admin
    .from("convites_franqueadas")
    .update({ status: "cancelado" })
    .eq("id", id)
    .eq("status", "pendente");

  revalidatePath("/admin/franqueadas");
  return { ok: true };
}

/**
 * Ação pública: valida um token de convite (pra página de aceitação).
 */
export async function validarToken(token: string): Promise<{
  ok: boolean;
  convite?: { email: string; nome_completo: string; plano: string };
  erro?: string;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("convites_franqueadas")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!data) return { ok: false, erro: "Convite não encontrado" };

  const convite = data as Record<string, unknown>;
  if (convite.status !== "pendente") {
    return { ok: false, erro: `Convite já foi ${convite.status}` };
  }

  const expira = new Date(convite.expira_em as string).getTime();
  if (expira < Date.now()) {
    await admin
      .from("convites_franqueadas")
      .update({ status: "expirado" })
      .eq("id", convite.id);
    return { ok: false, erro: "Convite expirado" };
  }

  return {
    ok: true,
    convite: {
      email: convite.email as string,
      nome_completo: convite.nome_completo as string,
      plano: convite.plano as string,
    },
  };
}

/**
 * Consome o token: cria conta + franqueada, marca convite como aceito.
 */
export async function aceitarConvite(params: {
  token: string;
  senha: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const admin = createAdminClient();

  const { data: conv } = await admin
    .from("convites_franqueadas")
    .select("*")
    .eq("token", params.token)
    .eq("status", "pendente")
    .maybeSingle();

  if (!conv) return { ok: false, erro: "Convite inválido ou já utilizado" };
  const convite = conv as Record<string, unknown>;

  const expira = new Date(convite.expira_em as string).getTime();
  if (expira < Date.now()) {
    return { ok: false, erro: "Convite expirado" };
  }

  // Cria usuário no Supabase Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: convite.email as string,
    password: params.senha,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    return { ok: false, erro: authErr?.message ?? "Erro criando usuario" };
  }

  // Cria registro de franqueada vinculado
  const { error: fErr } = await admin.from("franqueadas").insert({
    auth_user_id: authData.user.id,
    email: convite.email as string,
    nome_completo: convite.nome_completo as string,
    plano: convite.plano as string,
    status: "onboarding",
    onboarding_completo: false,
  });
  if (fErr) return { ok: false, erro: fErr.message };

  // Marca convite como aceito
  await admin
    .from("convites_franqueadas")
    .update({
      status: "aceito",
      aceito_em: new Date().toISOString(),
      aceito_por: authData.user.id,
    })
    .eq("id", convite.id);

  return { ok: true };
}
