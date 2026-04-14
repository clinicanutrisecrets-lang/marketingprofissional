import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
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

  if (!franqueada) {
    // Usuário novo — envia pro onboarding (que cria a linha automaticamente)
    redirect("/onboarding");
  }

  if (!franqueada.onboarding_completo) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-brand-muted p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-text">
            Olá, {franqueada.nome_comercial || franqueada.nome_completo}
          </h1>
          <p className="text-brand-text/60">
            Bem-vinda ao seu painel Scanner da Saúde
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <Card title="Posts aguardando aprovação" value="—" />
          <Card title="Alcance da semana" value="—" />
          <Card title="Próximo post" value="—" />
        </div>

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-brand-text/60">
            🚧 Painel em construção. Próximas entregas: calendário de aprovação
            semanal, criação de post manual, relatórios e integrações.
          </p>
        </div>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="text-sm text-brand-text/60">{title}</div>
      <div className="mt-2 text-3xl font-bold text-brand-text">{value}</div>
    </div>
  );
}
