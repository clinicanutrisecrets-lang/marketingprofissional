import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/");

  const { data: franqueadas } = await supabase
    .from("franqueadas")
    .select("id, nome_completo, email, status, plano, onboarding_percentual")
    .order("criado_em", { ascending: false });

  return (
    <main className="min-h-screen bg-brand-muted p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-text">Painel Admin</h1>
          <p className="text-brand-text/60">
            Bem-vinda, {admin.nome} · Papel: {admin.papel}
          </p>
        </header>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-text">
            Franqueadas ({franqueadas?.length ?? 0})
          </h2>
          {franqueadas && franqueadas.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-left text-brand-text/60">
                <tr>
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Plano</th>
                  <th className="pb-2">Onboarding</th>
                </tr>
              </thead>
              <tbody>
                {franqueadas.map((f) => (
                  <tr key={f.id} className="border-t border-brand-muted">
                    <td className="py-2">{f.nome_completo}</td>
                    <td className="py-2 text-brand-text/70">{f.email}</td>
                    <td className="py-2">{f.status}</td>
                    <td className="py-2">{f.plano}</td>
                    <td className="py-2">{f.onboarding_percentual}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-brand-text/60">
              Nenhuma franqueada cadastrada ainda.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
