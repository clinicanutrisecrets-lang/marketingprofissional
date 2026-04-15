import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarAlertas } from "@/lib/admin/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ status?: string; plano?: string; q?: string }>;
};

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const { status, plano, q } = await searchParams;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/");

  const admin = adminRow as { nome: string; papel: string };

  let query = supabase
    .from("franqueadas")
    .select(
      "id, nome_completo, email, status, plano, onboarding_percentual, onboarding_completo, instagram_handle, atualizado_em",
    )
    .order("criado_em", { ascending: false });

  if (status) query = query.eq("status", status);
  if (plano) query = query.eq("plano", plano);
  if (q) query = query.ilike("nome_completo", `%${q}%`);

  const { data: franqueadas } = await query;
  const alertas = await listarAlertas();
  const alertasUrgentes = alertas.filter((a) => a.urgencia === "urgente");

  const list = (franqueadas ?? []) as Array<{
    id: string;
    nome_completo: string;
    email: string;
    status: string | null;
    plano: string | null;
    onboarding_percentual: number | null;
    onboarding_completo: boolean | null;
    instagram_handle: string | null;
    atualizado_em: string | null;
  }>;

  const stats = {
    total: list.length,
    ativas: list.filter((f) => f.status === "ativo").length,
    onboarding: list.filter((f) => f.status === "onboarding").length,
    pausadas: list.filter((f) => f.status === "pausado").length,
  };

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">Painel Admin</h1>
            <p className="text-sm text-brand-text/60">
              Olá, {admin.nome} · {admin.papel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/franqueadas/convidar"
              className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              + Convidar franqueada
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="rounded-lg border border-brand-text/10 bg-white px-3 py-1.5 text-sm hover:border-brand-primary"
              >
                Sair
              </button>
            </form>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Stat label="Total" value={stats.total} />
          <Stat label="Ativas" value={stats.ativas} color="text-green-600" />
          <Stat label="Em onboarding" value={stats.onboarding} color="text-amber-600" />
          <Stat label="Pausadas" value={stats.pausadas} color="text-red-600" />
        </div>

        {alertasUrgentes.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <h2 className="font-semibold text-red-900">
                {alertasUrgentes.length} alerta{alertasUrgentes.length > 1 ? "s" : ""} urgente
                {alertasUrgentes.length > 1 ? "s" : ""}
              </h2>
            </div>
            <ul className="space-y-1.5 text-sm text-red-800">
              {alertasUrgentes.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Link
                    href={`/admin/franqueadas/${a.franqueadaId}`}
                    className="hover:underline"
                  >
                    <strong>{a.nome}</strong> — {a.mensagem}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form
          action="/admin"
          method="GET"
          className="mb-4 flex flex-wrap gap-2 rounded-lg bg-white p-3"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome..."
            className="flex-1 min-w-[200px] rounded-lg border border-brand-text/10 px-3 py-1.5 text-sm focus:border-brand-primary focus:outline-none"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-sm"
          >
            <option value="">Todos status</option>
            <option value="onboarding">Onboarding</option>
            <option value="ativo">Ativo</option>
            <option value="pausado">Pausado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <select
            name="plano"
            defaultValue={plano ?? ""}
            className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-sm"
          >
            <option value="">Todos planos</option>
            <option value="franquia_basico">Básico</option>
            <option value="franquia_avancado">Avançado</option>
            <option value="franquia_premium">Premium</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-secondary px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-secondary/90"
          >
            Filtrar
          </button>
          {(q || status || plano) && (
            <Link
              href="/admin"
              className="flex items-center rounded-lg border border-brand-text/10 px-3 py-1.5 text-sm hover:border-brand-primary"
            >
              Limpar
            </Link>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-text/5 bg-brand-muted/50 text-left text-xs uppercase tracking-wider text-brand-text/60">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Onboarding</th>
                <th className="px-4 py-3">Atualizada</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.length > 0 ? (
                list.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-brand-muted hover:bg-brand-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{f.nome_completo}</td>
                    <td className="px-4 py-3 text-brand-text/70">{f.email}</td>
                    <td className="px-4 py-3 text-brand-text/70">
                      {f.instagram_handle ? `@${f.instagram_handle}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status ?? "onboarding"} />
                    </td>
                    <td className="px-4 py-3 text-brand-text/70">{f.plano}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-text/10">
                          <div
                            className="h-full bg-brand-primary"
                            style={{ width: `${f.onboarding_percentual ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-brand-text/60">
                          {f.onboarding_percentual ?? 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text/60">
                      {f.atualizado_em ? formatDate(f.atualizado_em) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/franqueadas/${f.id}`}
                        className="text-sm font-medium text-brand-secondary hover:underline"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-brand-text/60">
                    Nenhuma franqueada encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${color ?? "text-brand-text"}`}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    onboarding: { label: "Onboarding", cls: "bg-amber-100 text-amber-800" },
    ativo: { label: "Ativo", cls: "bg-green-100 text-green-800" },
    pausado: { label: "Pausado", cls: "bg-red-100 text-red-800" },
    cancelado: { label: "Cancelado", cls: "bg-gray-100 text-gray-700" },
  };
  const info = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}
