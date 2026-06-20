import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EnAdsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const admin = createAdminClient();
  const { data: fData } = await admin
    .from("franqueadas")
    .select("id, meta_ads_access_token, meta_ads_token_expiry, meta_ads_account_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const f = fData as Record<string, unknown> | null;

  // FIX 9: Guard — redirect if franqueadaId is missing
  if (!f?.id) redirect("/en/login");

  const metaAdsConnected = !!(f?.meta_ads_access_token);

  const { data: anunciosRaw } = await admin
    .from("anuncios")
    .select("id, status, titulo_campanha, budget_diario, meta_campaign_id, criado_em")
    .eq("franqueada_id", f.id as string)
    .order("criado_em", { ascending: false })
    .limit(10);

  const anuncios = (anunciosRaw ?? []) as Array<Record<string, unknown>>;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-6">
          <Link href="/en/dashboard" className="text-xs font-medium text-brand-text/60 hover:text-brand-primary">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-brand-text">Meta Ads Manager</h1>
          <p className="text-sm text-brand-text/60">
            Manage your paid advertising campaigns on Facebook and Instagram
          </p>
        </header>

        {/* Meta Ads connection status */}
        <section className="mb-6">
          <div className={`rounded-2xl bg-white p-5 shadow-sm border-2 ${metaAdsConnected ? "border-green-100" : "border-dashed border-amber-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${metaAdsConnected ? "bg-green-500" : "bg-amber-400"}`} />
                  <span className="font-semibold text-brand-text">
                    {metaAdsConnected ? "Meta Ads Connected" : "Meta Ads not connected"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-brand-text/60">
                  {metaAdsConnected
                    ? `Ad Account ID: ${(f?.meta_ads_account_id as string) ?? "—"}`
                    : "Connect your Meta Ads account to run campaigns and reach new patients."}
                </p>
              </div>
              {!metaAdsConnected && (
                <a
                  href="/api/auth/meta/ads/start"
                  className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  Connect Meta Ads →
                </a>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
              How automated campaigns work
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: "1", title: "Generate creatives", desc: "AI generates 3 copy variations targeting your ideal patient profile" },
                { step: "2", title: "You approve", desc: "Review and select the winning creative — takes under 2 minutes" },
                { step: "3", title: "Auto-launch", desc: "Campaign goes live automatically on Meta Ads with optimized targeting" },
                { step: "4", title: "Auto-optimize", desc: "AI monitors daily and pauses underperforming ads. You stay in control." },
              ].map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-brand-text">{s.title}</div>
                    <div className="mt-0.5 text-xs text-brand-text/60">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Campaign list */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/60">
              Campaigns
            </h2>
            <Link
              href="/dashboard/anuncios/novo"
              className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              + New campaign
            </Link>
          </div>

          {anuncios.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <p className="text-brand-text/60">No campaigns yet.</p>
              <Link
                href="/dashboard/anuncios/novo"
                className="mt-3 inline-block text-sm font-medium text-brand-primary hover:underline"
              >
                Create your first campaign →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-text/5 text-xs font-medium uppercase tracking-wider text-brand-text/50">
                    <th className="px-4 py-3 text-left">Campaign</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Daily budget</th>
                    <th className="px-4 py-3 text-left">Meta ID</th>
                  </tr>
                </thead>
                <tbody>
                  {anuncios.map((a) => (
                    <tr key={a.id as string} className="border-b border-brand-text/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-brand-text">
                        {(a.titulo_campanha as string) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status as string} />
                      </td>
                      <td className="px-4 py-3 text-brand-text/70">
                        {a.budget_diario ? `R$ ${a.budget_diario}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand-text/40">
                        {(a.meta_campaign_id as string) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    ativo: { label: "Active", color: "bg-green-100 text-green-800" },
    pausado: { label: "Paused", color: "bg-amber-100 text-amber-800" },
    pausado_por_performance_ruim: { label: "Paused (low perf.)", color: "bg-red-100 text-red-800" },
    aguardando_aprovacao: { label: "Awaiting approval", color: "bg-blue-100 text-blue-800" },
    criativo_aprovado: { label: "Creative approved", color: "bg-purple-100 text-purple-800" },
    rascunho: { label: "Draft", color: "bg-gray-100 text-gray-700" },
    encerrado: { label: "Ended", color: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
