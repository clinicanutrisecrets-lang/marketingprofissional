"use server";

import { createHmac } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { calcularPercentual } from "./steps";
import { revalidatePath } from "next/cache";
import { agendarEmail, janelaAleatoria } from "@/lib/emails/queue";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";

/**
 * Salva um conjunto de campos da franqueada no banco.
 * Chamada a cada blur de campo (ou com debounce) pelo wizard.
 * Recalcula o percentual automaticamente.
 */
export async function salvarCamposFranqueada(
  campos: Record<string, unknown>,
): Promise<{ ok: boolean; percentual?: number; erro?: string }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Não autenticado" };
  }

  // Busca dados atuais pra calcular percentual após o merge
  const { data: atual, error: erroBusca } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (erroBusca) {
    return { ok: false, erro: erroBusca.message };
  }

  const dadosMesclados = { ...(atual ?? {}), ...campos };
  const percentual = calcularPercentual(dadosMesclados);

  const updatePayload = {
    ...campos,
    onboarding_percentual: percentual,
    atualizado_em: new Date().toISOString(),
  };

  let resultado;
  if (atual) {
    resultado = await supabase
      .from("franqueadas")
      .update(updatePayload)
      .eq("auth_user_id", user.id);
  } else {
    resultado = await supabase.from("franqueadas").insert({
      auth_user_id: user.id,
      email: user.email ?? "",
      nome_completo: (campos.nome_completo as string) ?? user.email ?? "Nova nutri",
      ...updatePayload,
    });
  }

  if (resultado.error) {
    return { ok: false, erro: resultado.error.message };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { ok: true, percentual };
}

/**
 * Marca o onboarding como completo. Dispara em background:
 *  1. Geracao da primeira semana de posts (gerarPostsDaSemana)
 *  2. Email de boas-vindas com link da LP — delay aleatorio 18-24h
 *     (sensacao de "humano trabalhando", evita parecer automacao crua)
 *  3. Email "primeira semana pronta pra aprovar" — delay aleatorio 30-46h
 *  4. Callback POST pro Scanner SaaS marcando onboarding concluido
 *
 * Tudo fire-and-forget — funcao retorna ok pra UI antes dos disparos
 * terminarem. Falhas individuais ficam em logs/email_queue mas nao
 * bloqueiam a finalizacao do onboarding pra nutri.
 */
export async function finalizarOnboarding(): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const admin = createAdminClient();

  const { data: franq } = await admin
    .from("franqueadas")
    .select("id, nome_completo, nome_comercial, email, instagram_handle, scanner_saas_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franq) return { ok: false, erro: "Franqueada não encontrada" };

  const f = franq as {
    id: string;
    nome_completo: string;
    nome_comercial: string | null;
    email: string;
    instagram_handle: string | null;
    scanner_saas_user_id: string | null;
  };

  const { error } = await admin
    .from("franqueadas")
    .update({
      onboarding_completo: true,
      status: "ativo",
      data_inicio_servico: new Date().toISOString().slice(0, 10),
    })
    .eq("id", f.id);

  if (error) return { ok: false, erro: error.message };

  // Atualiza franquia_onboardings se veio via token do SaaS
  if (f.scanner_saas_user_id) {
    await admin
      .from("franquia_onboardings")
      .update({
        franqueada_id: f.id,
        status: "onboarding_concluido",
        onboarding_concluido_em: new Date().toISOString(),
      })
      .eq("scanner_user_id", f.scanner_saas_user_id);
  }

  // ============================================================
  // Disparos em background — todos fire-and-forget
  // ============================================================
  void Promise.allSettled([
    disparoGeracaoPostsBackground(f.id),
    disparoEmailLpPronta(f),
    disparoEmailPrimeiraSemana(f),
    disparoCallbackSaas(f),
  ]).catch(() => {
    // erro de allSettled e impossivel — todos os promises sao seguros
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

async function disparoGeracaoPostsBackground(franqueadaId: string): Promise<void> {
  // Calcula próxima segunda-feira pra semanaRef
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  d.setDate(d.getDate() + diasAteSegunda);
  const semanaRef = d.toISOString().slice(0, 10);

  try {
    await gerarPostsDaSemana(franqueadaId, semanaRef);
  } catch (e) {
    console.error("[finalizarOnboarding] gerarPostsDaSemana falhou:", e);
  }
}

async function disparoEmailLpPronta(f: {
  id: string;
  nome_completo: string;
  nome_comercial: string | null;
  email: string;
  instagram_handle: string | null;
}): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL_FRANQUIAS ?? "https://app.scannerdasaude.com";
  const linkLp = f.instagram_handle ? `${baseUrl}/nutri/${f.instagram_handle}` : baseUrl;
  const primeiroNome = (f.nome_comercial || f.nome_completo).split(" ")[0];

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1F1D1A;">
      <h1 style="font-weight:400;font-size:28px;margin-bottom:16px;">Sua página está no ar, ${primeiroNome}.</h1>
      <p style="line-height:1.6;color:#4A4843;">
        Nossa equipe finalizou sua landing page personalizada. Já está pronta pra você compartilhar com pacientes ou usar em anúncios.
      </p>
      <p style="margin:32px 0;">
        <a href="${linkLp}" style="background:#2F5D50;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:500;">Ver minha página</a>
      </p>
      <p style="line-height:1.6;color:#4A4843;font-size:14px;">
        Em até 48h também enviamos sua primeira semana de conteúdo pronta pra aprovação.
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #EDE4D6;" />
      <p style="font-size:12px;color:#8A857D;">Scanner da Saúde · Nutrição de Precisão</p>
    </div>
  `;

  await agendarEmail({
    franqueadaId: f.id,
    tipo: "lp_pronta",
    toEmail: f.email,
    subject: `${primeiroNome}, sua página está no ar`,
    html,
    scheduledFor: janelaAleatoria(new Date(), 18, 24),
  });
}

async function disparoEmailPrimeiraSemana(f: {
  id: string;
  nome_completo: string;
  nome_comercial: string | null;
  email: string;
}): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL_FRANQUIAS ?? "https://app.scannerdasaude.com";
  const linkAprovar = `${baseUrl}/dashboard/aprovar`;
  const primeiroNome = (f.nome_comercial || f.nome_completo).split(" ")[0];

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1F1D1A;">
      <h1 style="font-weight:400;font-size:28px;margin-bottom:16px;">Sua primeira semana de conteúdo está pronta.</h1>
      <p style="line-height:1.6;color:#4A4843;">
        ${primeiroNome}, montamos a primeira semana de posts no seu tom, com sua história e respeitando seus pilares de conteúdo. Dá uma olhada e aprova o que faz sentido — ajusta o que não fizer.
      </p>
      <p style="margin:32px 0;">
        <a href="${linkAprovar}" style="background:#2F5D50;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-weight:500;">Aprovar a semana</a>
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #EDE4D6;" />
      <p style="font-size:12px;color:#8A857D;">Scanner da Saúde · Nutrição de Precisão</p>
    </div>
  `;

  await agendarEmail({
    franqueadaId: f.id,
    tipo: "primeira_semana_pronta",
    toEmail: f.email,
    subject: `${primeiroNome}, sua primeira semana de conteúdo chegou`,
    html,
    scheduledFor: janelaAleatoria(new Date(), 30, 46),
  });
}

async function disparoCallbackSaas(f: {
  id: string;
  email: string;
  scanner_saas_user_id: string | null;
}): Promise<void> {
  if (!f.scanner_saas_user_id) return; // não veio via SaaS, sem callback

  const url = process.env.SCANNER_SAAS_URL;
  const secret = process.env.SCANNER_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const body = JSON.stringify({
    scanner_user_id: f.scanner_saas_user_id,
    franqueada_id: f.id,
    email: f.email,
    onboarding_concluido_em: new Date().toISOString(),
  });
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  try {
    await fetch(`${url}/api/webhooks/onboarding-concluido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Marketing-Signature": sig,
      },
      body,
      signal: AbortSignal.timeout(8_000),
    });
  } catch (e) {
    console.error("[finalizarOnboarding] callback SaaS falhou:", e);
  }
}
