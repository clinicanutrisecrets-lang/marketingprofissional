import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarConvites } from "@/lib/admin/convites";
import ConvidarForm from "./ConvidarForm";

export const dynamic = "force-dynamic";

export default async function ConvidarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/admin/login?forbidden=1");

  const convites = await listarConvites();

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/admin/franqueadas"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Convidar franqueada</h1>
          <p className="text-sm text-brand-text/60">
            Gera um link único de convite e envia por email. Expira em 14 dias.
          </p>
        </header>

        <ConvidarForm />

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Convites recentes
          </h2>
          {convites.length === 0 ? (
            <p className="rounded-lg border border-brand-text/5 bg-white p-6 text-sm text-brand-text/60">
              Nenhum convite enviado ainda.
            </p>
          ) : (
            <div className="divide-y divide-brand-text/5 rounded-2xl bg-white shadow-sm">
              {convites.map((c) => (
                <div key={c.id as string} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-brand-text">
                        {c.nome_completo as string}
                      </div>
                      <div className="text-xs text-brand-text/60">
                        {c.email as string} · {c.plano as string}
                      </div>
                      <div className="mt-1 text-xs text-brand-text/40">
                        Enviado em {new Date(c.criado_em as string).toLocaleDateString("pt-BR")} · Expira em{" "}
                        {new Date(c.expira_em as string).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <StatusBadge status={c.status as string} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    aceito: { label: "Aceito", cls: "bg-green-100 text-green-800" },
    expirado: { label: "Expirado", cls: "bg-gray-100 text-gray-600" },
    cancelado: { label: "Cancelado", cls: "bg-red-50 text-red-700" },
  };
  const info = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}
