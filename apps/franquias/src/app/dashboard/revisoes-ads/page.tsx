import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Revisao = {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  campanhas_analisadas: number;
  gasto_total: number | null;
  leads_totais: number | null;
  cpl_medio: number | null;
  status_geral: string | null;
  resumo_executivo: string | null;
  recomendacoes: unknown[] | null;
  alertas: unknown[] | null;
  criado_em: string;
};

export default async function RevisoesAdsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("franqueadas_revisoes_ads")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(20);

  const revisoes = (data ?? []) as Revisao[];

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-text">
            Revisões de tráfego
          </h1>
          <p className="mt-2 text-sm text-brand-text/60">
            Seu gestor de tráfego IA revisa todas suas campanhas Meta Ads automaticamente
            às segundas e quintas.
          </p>
        </header>

        {revisoes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-10 text-center">
            <p className="text-brand-text/60">Nenhuma revisão ainda.</p>
            <p className="mt-2 text-xs text-brand-text/40">
              A próxima roda automaticamente quando você tiver pelo menos uma campanha ativa
              no Meta Ads.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {revisoes.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <Link href={`/dashboard/revisoes-ads/${r.id}`} className="block">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <StatusBadge status={r.status_geral ?? "sem_dados"} />
                        <span className="text-xs text-brand-text/50">
                          {formatPeriodo(r.periodo_inicio, r.periodo_fim)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-brand-text/80">
                        {r.resumo_executivo ?? "—"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-brand-text/60">
                        <span>📊 {r.campanhas_analisadas} campanhas</span>
                        {r.gasto_total != null && (
                          <span>💰 R$ {r.gasto_total.toFixed(2)}</span>
                        )}
                        {r.leads_totais != null && <span>👥 {r.leads_totais} leads</span>}
                        {r.cpl_medio != null && (
                          <span>📉 CPL R$ {r.cpl_medio.toFixed(2)}</span>
                        )}
                        {(r.recomendacoes ?? []).length > 0 && (
                          <span>🎯 {(r.recomendacoes ?? []).length} recomendações</span>
                        )}
                        {(r.alertas ?? []).length > 0 && (
                          <span className="text-orange-600">
                            ⚠️ {(r.alertas ?? []).length} alertas
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-brand-primary">Abrir →</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    excelente: { label: "Excelente", cls: "bg-green-100 text-green-800" },
    bom: { label: "Bom", cls: "bg-emerald-100 text-emerald-800" },
    mediano: { label: "Mediano", cls: "bg-amber-100 text-amber-800" },
    preocupante: { label: "Preocupante", cls: "bg-orange-100 text-orange-800" },
    critico: { label: "Crítico", cls: "bg-red-100 text-red-800" },
    sem_dados: { label: "Sem dados", cls: "bg-gray-100 text-gray-700" },
  };
  const info = map[status] ?? map.sem_dados!;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${info.cls}`}>
      {info.label}
    </span>
  );
}

function formatPeriodo(inicio: string, fim: string): string {
  const opt: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  };
  const di = new Date(`${inicio}T00:00:00Z`).toLocaleDateString("pt-BR", opt);
  const df = new Date(`${fim}T00:00:00Z`).toLocaleDateString("pt-BR", opt);
  return `${di} → ${df}`;
}
