import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuditoriaView } from "./AuditoriaView";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) redirect("/onboarding");

  const { data: auditoriaAtual } = await supabase
    .from("auditorias_conteudo")
    .select("*")
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">
          Auditoria de Conteúdo + 20 Ideias
        </h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Análise dos seus últimos posts, identificação de gaps e 20 ideias prontas pra
          virar post — ordenadas por impacto.
        </p>

        <AuditoriaView auditoriaInicial={auditoriaAtual as Record<string, unknown> | null} />
      </div>
    </main>
  );
}
