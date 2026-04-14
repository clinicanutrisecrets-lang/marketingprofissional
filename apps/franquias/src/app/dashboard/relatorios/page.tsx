import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");

  const { data: relatorios } = await supabase
    .from("relatorios_semanais")
    .select("*")
    .eq("franqueada_id", (f as { id: string }).id)
    .order("semana_inicio", { ascending: false })
    .limit(12);

  const lista = (relatorios ?? []) as Array<Record<string, unknown>>;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Relatórios semanais</h1>
          <p className="text-sm text-brand-text/60">
            Performance dos seus posts + análise IA
          </p>
        </header>

        {lista.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-2 text-4xl">📊</div>
            <p className="text-sm text-brand-text/70">
              Nenhum relatório ainda. Quando seus posts começarem a ser publicados,
              aparecerão aqui toda sexta-feira.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {lista.map((r) => (
              <article key={r.id as string} className="rounded-2xl bg-white p-6 shadow-sm">
                <header className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Semana de {formatDate(r.semana_inicio as string)}
                    </h2>
                    <p className="text-xs text-brand-text/60">
                      a {formatDate(r.semana_fim as string)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-brand-primary">
                      {Number(r.taxa_engajamento ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-brand-text/60">engajamento</div>
                  </div>
                </header>

                <div className="mb-4 grid grid-cols-3 gap-4">
                  <Metric label="Posts" value={(r.total_posts as number) ?? 0} />
                  <Metric label="Alcance" value={formatK((r.total_alcance as number) ?? 0)} />
                  <Metric label="Interações" value={formatK((r.total_engajamento as number) ?? 0)} />
                </div>

                {r.insight_manual_vs_ia && (
                  <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                    💡 {r.insight_manual_vs_ia as string}
                  </div>
                )}

                {r.analise_claude && (
                  <div className="mb-3 whitespace-pre-wrap text-sm text-brand-text/80">
                    {r.analise_claude as string}
                  </div>
                )}

                {Array.isArray(r.recomendacoes) && (r.recomendacoes as string[]).length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                      Recomendações
                    </h3>
                    <ul className="space-y-1 text-sm text-brand-text/80">
                      {(r.recomendacoes as string[]).map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-brand-muted p-3">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
