import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiagnosticoView } from "./DiagnosticoView";

export const dynamic = "force-dynamic";

export default async function DiagnosticoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, nome_completo")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) redirect("/onboarding");

  const { data: diagnosticoAtual } = await supabase
    .from("diagnosticos_perfil")
    .select("*")
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <a
          href="/dashboard"
          className="text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Dashboard
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">
          Diagnóstico Estratégico do Perfil
        </h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Análise do seu Instagram cruzada com os dados do onboarding. Brutalmente honesta,
          específica e acionável.
        </p>

        <DiagnosticoView
          franqueadaId={(franqueada as { id: string }).id}
          diagnosticoInicial={diagnosticoAtual as Record<string, unknown> | null}
        />
      </div>
    </main>
  );
}
