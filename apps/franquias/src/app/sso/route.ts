import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { aplicarPrefillScanner } from "@/lib/onboarding/prefill";

export const dynamic = "force-dynamic";

/**
 * GET /sso?token=<jwt>
 *
 * Receptor do SSO vindo do Scanner SaaS (scannerdasaude.com) — a
 * contraparte do GET scannerdasaude.com/api/sso/marketing-token,
 * especificado em docs/SSO_MARKETING.md do repo scanner-saude.
 *
 * A nutri entra com O MESMO LOGIN DO SCANNER: nenhum e-mail é enviado,
 * nenhuma senha é pedida. O Scanner só emite o token pra conta com
 * plano='franquia' e status='ativo', então quem chega aqui com token
 * válido já está autenticada do outro lado.
 *
 * Fluxo:
 *   1. Valida o JWT HS256 (MARKETING_SSO_SECRET, iss/aud/exp) — verificação
 *      manual com node:crypto, sem dependência nova.
 *   2. Acha a franqueada por scanner_saas_user_id (fallback: e-mail).
 *   3. NÃO ACHOU → cria a conta aqui mesmo (usuário de auth + linha em
 *      franqueadas) e aplica o pré-preenchimento vindo do Scanner.
 *      🔴 Antes isto redirecionava pra /onboarding?token=…, mas o
 *      middleware barra /onboarding de quem não está logada e jogava a
 *      nutri no /login pedindo "a senha que você recebeu" — senha que
 *      nunca existiu. Foi o que travou a Juliana no primeiro teste.
 *   4. Cria a sessão via magic link server-side (generateLink + verifyOtp):
 *      o link nunca é enviado por e-mail, é consumido aqui.
 *   5. Manda pro /dashboard (onboarding pronto) ou /onboarding (a completar).
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
  const nomeToken = typeof payload.nome === "string" ? payload.nome.trim() : "";
  if (!scannerUserId || !emailToken) {
    return NextResponse.redirect(new URL("/login?erro=sso_invalido", req.url));
  }

  const admin = createAdminClient();

  type FranqueadaSSO = {
    id: string;
    email: string;
    auth_user_id: string | null;
    onboarding_completo: boolean | null;
    scanner_saas_user_id: string | null;
  };
  const COLUNAS = "id, email, auth_user_id, onboarding_completo, scanner_saas_user_id";

  // ── 1. Acha a franqueada: vínculo direto, depois e-mail ──
  let franq: FranqueadaSSO | null = null;

  const { data: porVinculo } = await admin
    .from("franqueadas")
    .select(COLUNAS)
    .eq("scanner_saas_user_id", scannerUserId)
    .maybeSingle();
  franq = (porVinculo as FranqueadaSSO | null) ?? null;

  if (!franq) {
    const { data: porEmail } = await admin
      .from("franqueadas")
      .select(COLUNAS)
      .eq("email", emailToken)
      .maybeSingle();
    const pe = porEmail as FranqueadaSSO | null;
    if (pe) {
      franq = pe;
      if (!pe.scanner_saas_user_id) {
        const { error } = await admin
          .from("franqueadas")
          .update({ scanner_saas_user_id: scannerUserId })
          .eq("id", pe.id);
        if (error) console.error("[sso] falha ao vincular scanner_saas_user_id:", error.message);
      }
    }
  }

  // ── 2. Garante o usuário de auth ──────────────────────────────────────
  // Só tenta criar quando ainda NÃO temos um usuário conhecido. E, se a
  // criação falhar, NÃO aborta: quem decide é o generateLink logo abaixo.
  //
  // 🔴 Regressão corrigida (Juliana, 11/08): eu chamava createUser em toda
  // entrada e só engolia o erro se a mensagem casasse com uma lista de
  // palavras chutada ("already", "registered"…). Pra quem já tinha conta —
  // que é o caso normal a partir da segunda visita — bastava a Supabase usar
  // outro texto pra eu abortar com sso_login e a nutri ficar trancada do
  // lado de fora. Quem nunca tinha entrado (Viviane) passava, porque aí a
  // criação dava certo de verdade. Erro de mensagem NUNCA deve virar erro de
  // login: o teste real é conseguir o link, não adivinhar a frase do erro.
  if (!franq?.auth_user_id) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email: emailToken,
      email_confirm: true,
      user_metadata: { nome: nomeToken, sso_origem: "scanner-saas" },
    });
    if (createErr) {
      // Esperado quando o usuário já existe. Só registra e segue.
      console.warn("[sso] createUser não criou (segue pro magic link):", createErr.message);
    }
  }

  // ── 3. Magic link consumido no servidor: devolve o hash da sessão E o
  //       usuário, então o id sai daqui — sem varrer a lista de usuários
  //       (listUsers pagina de 50 em 50 e passaria a errar quando a base
  //       crescesse: bug silencioso que só apareceria com o app cheio). ──
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: emailToken,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  const authUserId = linkData?.user?.id;
  if (linkErr || !tokenHash || !authUserId) {
    console.error("[sso] generateLink falhou:", linkErr?.message);
    return NextResponse.redirect(new URL("/login?erro=sso_login", req.url));
  }

  // ── 4. Sem franqueada → cria agora, sem e-mail e sem senha ──
  if (!franq) {
    const { data: nova, error } = await admin
      .from("franqueadas")
      .insert({
        auth_user_id: authUserId,
        email: emailToken,
        nome_completo: nomeToken || emailToken,
        scanner_saas_user_id: scannerUserId,
      })
      .select(COLUNAS)
      .single();

    if (error || !nova) {
      console.error("[sso] falha ao criar franqueada:", error?.message);
      return NextResponse.redirect(new URL("/login?erro=sso_conta", req.url));
    }
    franq = nova as FranqueadaSSO;
  } else if (!franq.auth_user_id) {
    const { error } = await admin
      .from("franqueadas")
      .update({ auth_user_id: authUserId })
      .eq("id", franq.id);
    if (error) console.error("[sso] falha ao gravar auth_user_id:", error.message);
  }

  // ── 5. Pré-preenchimento + marcação do onboarding (só até ele fechar) ──
  if (!franq.onboarding_completo) {
    await vincularOnboarding(admin, scannerUserId, franq.id);
  }

  // ── 6. Abre a sessão com o hash obtido no passo 3 ──
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
  const destino = franq.onboarding_completo ? "/dashboard" : "/onboarding";
  redirect(destino);
}

/**
 * Liga o registro de franquia_onboardings à franqueada, marca como iniciado
 * e aplica o pré-preenchimento que veio do Scanner. Nada aqui pode travar o
 * login — falha vira log.
 */
async function vincularOnboarding(
  admin: ReturnType<typeof createAdminClient>,
  scannerUserId: string,
  franqueadaId: string,
): Promise<void> {
  try {
    const { data: ob } = await admin
      .from("franquia_onboardings")
      .select("id, status, origem_payload")
      .eq("scanner_user_id", scannerUserId)
      .maybeSingle();

    if (!ob) return;
    const reg = ob as {
      id: string;
      status: string | null;
      origem_payload: Record<string, unknown> | null;
    };

    if (reg.status === "token_gerado" || reg.status === "email_enviado") {
      await admin
        .from("franquia_onboardings")
        .update({
          franqueada_id: franqueadaId,
          status: "onboarding_iniciado",
          onboarding_iniciado_em: new Date().toISOString(),
        })
        .eq("id", reg.id);
    }

    const perfil = reg.origem_payload?.perfil;
    if (perfil && typeof perfil === "object") {
      await aplicarPrefillScanner(
        admin,
        franqueadaId,
        perfil as Record<string, unknown>,
      );
    }
  } catch (e) {
    console.error("[sso] vincularOnboarding falhou:", e);
  }
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
