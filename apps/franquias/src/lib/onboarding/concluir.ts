import { createHmac } from "node:crypto";
import type { createAdminClient } from "@/lib/supabase/server";
import { agendarEmail, janelaAleatoria } from "@/lib/emails/queue";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Conclui o onboarding de uma franqueada. É o miolo do "Concluir" do
 * assistente, separado da sessão pra poder ser chamado também quando o
 * questionário único do Scanner já respondeu tudo (Aline, 30/09/2026: "a
 * pessoa responde uma vez só") — aí o SSO fecha o cadastro daqui sozinho e
 * ela cai direto no painel, com os mesmos efeitos de quem clicou em Concluir:
 *  1. geração da primeira semana de posts;
 *  2. e-mail de boas-vindas com link da LP (18-24h);
 *  3. e-mail "primeira semana pronta" (30-46h);
 *  4. callback pro Scanner marcando o onboarding concluído.
 *
 * Idempotente: franqueada já concluída volta ok sem disparar nada de novo.
 */
export async function concluirOnboarding(
  admin: AdminClient,
  franqueadaId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { data: franq } = await admin
    .from("franqueadas")
    .select("id, nome_completo, nome_comercial, email, instagram_handle, scanner_saas_user_id, onboarding_completo")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (!franq) return { ok: false, erro: "Franqueada não encontrada" };

  // FIX 4: Idempotency guard — prevent duplicate emails on double-click
  if ((franq as Record<string, unknown>).onboarding_completo === true) {
    return { ok: true };
  }

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

  // Esperados, não soltos: cada um é curto (a semana vai pra função própria),
  // e promessa solta em serverless é descartada quando a resposta sai.
  await Promise.allSettled([
    disparoGeracaoPostsBackground(f.id),
    disparoEmailLpPronta(f),
    disparoEmailPrimeiraSemana(f),
    disparoCallbackSaas(f),
  ]);

  return { ok: true };
}


/**
 * A primeira semana de posts. Gerar leva ~95 s, e promessa solta morre quando
 * a resposta sai (serverless). Por isso vai pra função própria que o cron de
 * domingo já usa (`/api/cron/gerar-semanas/uma`), com 300 s só dela: aqui só
 * se espera o pedido sair. Sem o segredo configurado, gera aqui mesmo (o
 * comportamento de antes).
 */
async function disparoGeracaoPostsBackground(franqueadaId: string): Promise<void> {
  // Próxima segunda-feira
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  d.setDate(d.getDate() + diasAteSegunda);
  const semanaRef = d.toISOString().slice(0, 10);

  const segredo = process.env.CRON_SECRET;
  const origem = process.env.NEXT_PUBLIC_APP_URL_FRANQUIAS ?? "https://app.scannerdasaude.com";
  if (segredo) {
    try {
      await fetch(`${origem}/api/cron/gerar-semanas/uma`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${segredo}` },
        body: JSON.stringify({ franqueadaId, semanaRef }),
        cache: "no-store",
        // A filha segue sozinha; aqui só garantimos que o pedido chegou.
        signal: AbortSignal.timeout(3_000),
      });
    } catch (e) {
      if ((e as Error).name !== "TimeoutError") console.error("[concluirOnboarding] despacho da semana falhou:", e);
    }
    return;
  }
  try {
    await gerarPostsDaSemana(franqueadaId, semanaRef);
  } catch (e) {
    console.error("[concluirOnboarding] gerarPostsDaSemana falhou:", e);
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
    console.error("[concluirOnboarding] callback SaaS falhou:", e);
  }
}
