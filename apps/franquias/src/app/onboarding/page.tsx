import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "@/components/onboarding/Wizard";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ step?: string; conectado?: string; erro?: string }>;
};

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { step: stepParam } = await searchParams;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Remove o redirect pra permitir edicao depois de completo.
  // A nutri pode sempre voltar e editar qualquer campo.

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
