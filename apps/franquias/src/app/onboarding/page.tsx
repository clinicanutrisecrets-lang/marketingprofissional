import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { Wizard } from "@/components/onboarding/Wizard";
import { OnboardingTokenLogin } from "./OnboardingTokenLogin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ step?: string; token?: string; conectado?: string; erro?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const stepParam = params.step;
  const token = params.token;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cenário 1: chegou pelo link do SaaS (token na URL) e não está logada
  if (token && !user) {
    const admin = createAdminClient();
    const { data: registro } = await admin
      .from("franquia_onboardings")
      .select("id, scanner_user_id, email, nome, status")
      .eq("onboarding_token", token)
      .maybeSingle();

    if (!registro) {
      return (
        <main className="min-h-screen bg-brand-muted flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-brand-text">Link inválido ou expirado</h1>
            <p className="mt-3 text-sm text-brand-text/70">
              Esse link de acesso ao onboarding não foi reconhecido. Entre em contato com a
              equipe Scanner pra receber um novo link.
            </p>
          </div>
        </main>
      );
    }

    const reg = registro as {
      id: string;
      email: string;
      nome: string;
      status: string;
    };

    return <OnboardingTokenLogin email={reg.email} nome={reg.nome} token={token} />;
  }

  // Cenário 2: tem token + está logada → valida match e libera wizard
  if (token && user) {
    const admin = createAdminClient();
    const { data: registro } = await admin
      .from("franquia_onboardings")
      .select("id, email, scanner_user_id, status")
      .eq("onboarding_token", token)
      .maybeSingle();

    if (registro) {
      const reg = registro as {
        id: string;
        email: string;
        scanner_user_id: string;
        status: string;
      };

      // Marca onboarding como iniciado se ainda estava em token_gerado/email_enviado
      if (reg.status === "token_gerado" || reg.status === "email_enviado") {
        await admin
          .from("franquia_onboardings")
          .update({
            status: "onboarding_iniciado",
            onboarding_iniciado_em: new Date().toISOString(),
          })
          .eq("id", reg.id);
      }

      // Vincula franqueada (cria/atualiza) com scanner_saas_user_id
      const { data: franqExistente } = await admin
        .from("franqueadas")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!franqExistente) {
        await admin.from("franqueadas").insert({
          auth_user_id: user.id,
          email: reg.email,
          nome_completo: user.user_metadata?.nome ?? reg.email,
          scanner_saas_user_id: reg.scanner_user_id,
        });
      } else if (reg.scanner_user_id) {
        await admin
          .from("franqueadas")
          .update({ scanner_saas_user_id: reg.scanner_user_id })
          .eq("id", (franqExistente as { id: string }).id);
      }
    }
  }

  // Cenário 3 (padrão): não tem token, não está logada
  if (!user) redirect("/login");

  // Carrega dados pro wizard (cenário 4: logada com ou sem token)
  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const initialData =
    franqueada ??
    ({
      email: user.email ?? "",
      nome_completo: "",
    } as Record<string, unknown>);

  const initialStep = stepParam
    ? Math.max(1, Math.min(10, parseInt(stepParam, 10)))
    : 1;

  return (
    <Wizard
      initialData={initialData as Record<string, unknown>}
      initialStep={initialStep}
    />
  );
}
