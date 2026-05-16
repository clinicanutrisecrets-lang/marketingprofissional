import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const OBJECTIVE_LABEL: Record<string, { emoji: string; label: string }> = {
  ganhar_seguidores: { emoji: "👥", label: "Gain followers" },
  receber_mensagens: { emoji: "💬", label: "Receive messages" },
  agendar_consultas: { emoji: "📅", label: "Book consultations" },
  vender_teste_genetico: { emoji: "🧬", label: "Sell genetic test" },
  alcance: { emoji: "🎥", label: "Reach" },
  trafego_site: { emoji: "🌐", label: "Website traffic" },
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "draft",
  aguardando_aprovacao: "awaiting approval",
  ativo: "active",
  pausado: "paused",
  encerrado: "ended",
};

const STATUS_CLS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-700",
  aguardando_aprovacao: "bg-amber-100 text-amber-800",
  ativo: "bg-green-100 text-green-800",
  pausado: "bg-red-100 text-red-800",
  encerrado: "bg-gray-100 text-gray-500",
};

export default async function AnunciosPageEN() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, faz_anuncio_pago, budget_anuncio_mensal, nicho_principal")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");

  const franqueada = f as {
    id: string;
    faz_anuncio_pago: boolean | null;
    budget_anuncio_mensal: number | null;
    nicho_principal: string | null;
  };

  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("*")
    .eq("franqueada_id", franqueada.id)
    .order("criado_em", { ascending: false });

  const list = (anuncios ?? []) as Array<Record<string, unknown>>;

  const active = list.filter((a) => a.status === "ativo");
  const totalSpend = active.reduce((s, a) => s + ((a.gasto_total as number) ?? 0), 0);
  const totalLeads = active.reduce((s, a) => s + ((a.leads as number) ?? 0), 0);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/en/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Back
        </Link>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">Ads</h1>
            <p className="text-sm text-brand-text/60">
              Manage your Meta Ads campaigns via the Marketing API
              (ads_management) with automatic benchmark.
            </p>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Active campaigns" value={active.length.toString()} />
          <StatCard label="Spend (active)" value={formatCurrency(totalSpend)} />
          <StatCard label="Leads generated" value={totalLeads.toString()} />
          <StatCard
            label="Monthly budget"
            value={
              franqueada.budget_anuncio_mensal
                ? formatCurrency(franqueada.budget_anuncio_mensal)
                : "—"
            }
          />
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-5xl">🎯</div>
            <h2 className="mb-2 text-xl font-semibold">No ads yet</h2>
            <p className="text-sm text-brand-text/60">
              Create your first ad to attract leads, followers or appointments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => {
              const obj = OBJECTIVE_LABEL[a.objetivo_negocio as string];
              const status = (a.status as string) ?? "rascunho";
              const evaluation = a.avaliacao_vs_benchmark as string | null;
              return (
                <article
                  key={a.id as string}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{obj?.emoji ?? "🎯"}</span>
                      <div>
                        <h3 className="font-semibold text-brand-text">
                          {(a.nome as string) || "Untitled"}
                        </h3>
                        <p className="text-xs text-brand-text/60">
                          {obj?.label ?? (a.objetivo_negocio as string)} ·{" "}
                          {a.data_inicio
                            ? new Date(a.data_inicio as string).toLocaleDateString("en-US")
                            : "no start date"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[status]}`}
                    >
                      {STATUS_LABEL[status] ?? status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-5 text-xs">
                    <Metric label="Budget/day" value={formatCurrency(a.budget_diario as number)} />
                    <Metric label="Spend" value={formatCurrency((a.gasto_total as number) ?? 0)} />
                    <Metric label="Clicks" value={((a.cliques as number) ?? 0).toString()} />
                    <Metric label="Leads" value={((a.leads as number) ?? 0).toString()} />
                    <Metric
                      label="CPL"
                      value={a.cpl ? formatCurrency(a.cpl as number) : "—"}
                      tag={evaluationTag(evaluation)}
                    />
                  </div>

                  {a.tema_criativo && (
                    <div className="mt-3 border-t border-brand-muted pt-3 text-sm text-brand-text/70">
                      <strong className="text-xs uppercase tracking-wider text-brand-text/60">
                        Theme:{" "}
                      </strong>
                      {a.tema_criativo as string}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand-text">{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  tag,
}: {
  label: string;
  value: string;
  tag?: { label: string; cor: string } | null;
}) {
  return (
    <div>
      <div className="text-brand-text/60">{label}</div>
      <div className="mt-0.5 flex items-center gap-1 font-semibold">
        {value}
        {tag && (
          <span
            className={`rounded px-1 py-0.5 text-[10px] font-medium ${tag.cor}`}
          >
            {tag.label}
          </span>
        )}
      </div>
    </div>
  );
}

function evaluationTag(a: string | null) {
  if (!a) return null;
  const map: Record<string, { label: string; cor: string }> = {
    excelente: { label: "🟢 great", cor: "bg-green-100 text-green-800" },
    bom: { label: "🟢 good", cor: "bg-green-100 text-green-800" },
    mediano: { label: "🟡 average", cor: "bg-yellow-100 text-yellow-800" },
    ruim: { label: "🔴 poor", cor: "bg-red-100 text-red-800" },
  };
  return map[a] ?? null;
}
