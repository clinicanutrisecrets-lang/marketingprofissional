import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /sso?token=<jwt>
 *
 * Receptor do SSO vindo do Scanner SaaS (scannerdasaude.com) — a
 * contraparte do GET scannerdasaude.com/api/sso/marketing-token,
 * especificado em docs/SSO_MARKETING.md do repo scanner-saude.
 *
 * O Scanner só emite o token pra nutri com plano='franquia' (Consultório
 * de Precisão Avançado) e status='ativo'. Aqui:
 *   1. Valida o JWT HS256 (MARKETING_SSO_SECRET, iss/aud/exp) — verificação
 *      manual com node:crypto, sem dependência nova (mesmo padrão do
 *      receptor SSO do Scanner Cursos).
 *   2. Acha a franqueada por scanner_saas_user_id (fallback: email).
 *   3. Sem franqueada → se há onboarding pendente (franquia_onboardings),
 *      manda pro wizard; senão devolve pro Scanner com ?precisa_ativar=1.
 *   4. Com franqueada → magic link admin (generateLink) + verifyOtp no
 *      client de cookies = sessão criada sem email nem senha.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?erro=sso_token_ausente", req.url));
  }

  const secret = process.env.MARKETING_SSO_SECRET;
  if (!secret) {
    console.error("[sso] MARKETING_SSO_SECRET não configurado");
    return NextResponse.redirect(new URL("/login?erro=sso_config", req.url));
  }

  const payload = verificarJwtHs256(token, secret);
  if (!payload) {
    return NextResponse.redirect(new URL("/login?erro=sso_invalido", req.url));
  }

  const scannerUserId = typeof payload.sub === "string" ? payload.sub : "";
  const emailToken =
    typeof payload.email === "string" ? payload.email.toLowerCase().trim() : "";
  if (!scannerUserId) {
    return NextResponse.redirect(new URL("/login?erro=sso_invalido", req.url));
  }

  const admin = createAdminClient();

  // 1. Franqueada por vínculo direto; fallback por email (e grava o vínculo)
  let { data: franq } = await admin
    .from("franqueadas")
    .select("id, email, auth_user_id, onboarding_completo, scanner_saas_user_id")
    .eq("scanner_saas_user_id", scannerUserId)
    .maybeSingle();

  if (!franq && emailToken) {
    const { data: porEmail } = await admin
      .from("franqueadas")
      .select("id, email, auth_user_id, onboarding_completo, scanner_saas_user_id")
      .eq("email", emailToken)
      .maybeSingle();
    if (porEmail) {
      franq = porEmail;
      const pe = porEmail as { id: string; scanner_saas_user_id: string | null };
      if (!pe.scanner_saas_user_id) {
        const { error } = await admin
          .from("franqueadas")
          .update({ scanner_saas_user_id: scannerUserId })
          .eq("id", pe.id);
        if (error) console.error("[sso] falha ao vincular scanner_saas_user_id:", error.message);
      }
    }
  }

  // 2. Sem franqueada → onboarding pendente ou volta pro Scanner ativar
  if (!franq) {
    const { data: ob } = await admin
      .from("franquia_onboardings")
      .select("onboarding_token")
      .eq("scanner_user_id", scannerUserId)
      .maybeSingle();

    const obToken = (ob as { onboarding_token?: string } | null)?.onboarding_token;
    if (obToken) {
      return NextResponse.redirect(
        new URL(`/onboarding?token=${encodeURIComponent(obToken)}`, req.url),
      );
    }

    const scannerUrl = process.env.SCANNER_SAAS_URL ?? "https://scannerdasaude.com";
    return NextResponse.redirect(
      `${scannerUrl}/nutri/marketing-profissional?precisa_ativar=1`,
    );
  }

  const f = franq as {
    id: string;
    email: string;
    auth_user_id: string | null;
    onboarding_completo: boolean | null;
  };

  // 3. Garante usuário de auth (franqueada normalmente já tem)
  if (!f.auth_user_id) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: f.email,
      email_confirm: true,
    });
    if (created?.user) {
      const { error } = await admin
        .from("franqueadas")
        .update({ auth_user_id: created.user.id })
        .eq("id", f.id);
      if (error) console.error("[sso] falha ao gravar auth_user_id:", error.message);
    } else if (createErr && !/already/i.test(createErr.message)) {
      console.error("[sso] createUser falhou:", createErr.message);
      return NextResponse.redirect(new URL("/login?erro=sso_login", req.url));
    }
  }

  // 4. Magic link server-side → sessão via cookies (sem email enviado)
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: f.email,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    console.error("[sso] generateLink falhou:", linkErr?.message);
    return NextResponse.redirect(new URL("/login?erro=sso_login", req.url));
  }

  const supabase = createClient();
  const { error: otpErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (otpErr) {
    console.error("[sso] verifyOtp falhou:", otpErr.message);
    return NextResponse.redirect(new URL("/login?erro=sso_login", req.url));
  }

  // redirect() do next/navigation (não NextResponse.redirect) é o padrão
  // documentado do Supabase SSR depois de verifyOtp: garante que os cookies
  // de sessão gravados pelo client vão junto na resposta. Ele lança uma
  // exceção de controle do Next — por isso fica FORA de qualquer try/catch.
  const destino = f.onboarding_completo ? "/dashboard" : "/onboarding";
  redirect(destino);
}

/**
 * Verifica JWT HS256 na mão (sem lib): assinatura + exp + iss + aud.
 * Retorna o payload ou null.
 */
function verificarJwtHs256(
  token: string,
  secret: string,
): Record<string, unknown> | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [h, p, s] = partes;

  try {
    const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as {
      alg?: string;
    };
    if (header.alg !== "HS256") return null;

    const esperada = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    const recebida = Buffer.from(s, "base64url");
    if (
      esperada.length !== recebida.length ||
      !timingSafeEqual(esperada, recebida)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(p, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    const agora = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp < agora) return null;
    if (payload.iss !== "scannerdasaude.com") return null;
    if (payload.aud !== "marketing.scannerdasaude.com") return null;

    return payload;
  } catch {
    return null;
  }
}
