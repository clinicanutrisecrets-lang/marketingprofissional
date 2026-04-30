import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Recomendacao = {
  prioridade: "alta" | "media" | "baixa";
  acao: string;
  campanha: string;
  justificativa: string;
  impacto_estimado: string;
};

type Alerta = {
  tipo: string;
  mensagem: string;
  campanha: string;
};

type PageProps = { params: Promise<{ id: string }> };

export default async function RevisaoDetalhePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("franqueadas_revisoes_ads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const r = data as Record<string, unknown>;

  // Marca como visualizada
  if (!r.visualizado_em) {
    await supabase
      .from("franqueadas_revisoes_ads")
      .update({ visualizado_em: new Date().toISOString() })
      .eq("id", id);
  }

  const recomendacoes = (r.recomendacoes as Recomendacao[] | null) ?? [];
  const alertas = (r.alertas as Alerta[] | null) ?? [];
  const status = (r.status_geral as string) || "sem_dados";

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard/revisoes-ads"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Todas as revisões
        </Link>

        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <StatusBanner status={status} />
          <h1 className="mt-4 text-2xl font-bold text-brand-text">
            Revisão {formatPeriodo(r.periodo_inicio as string, r.periodo_fim as string)}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-brand-text/80">
            {(r.resumo_executivo as string) ?? "—"}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Campanhas" value={String(r.campanhas_analisadas ?? 0)} />
            <Stat
              label="Gasto"
              value={`R$ ${Number(r.gasto_total ?? 0).toFixed(2)}`}
            />
            <Stat label="Leads" value={String(r.leads_totais ?? 0)} />
            <Stat
              label="CPL médio"
              value={
                r.cpl_medio
                  ? `R$ ${Number(r.cpl_medio).toFixed(2)}`
                  : "—"
              }
            />
          </div>
        </header>

        {alertas.length > 0 && (
          <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-800">
              ⚠️ Alertas ({alertas.length})
            </h2>
            <ul className="space-y-2">
              {alertas.map((a, i) => (
                <li key={i} className="text-sm text-orange-900">
                  <strong>[{a.campanha}]</strong> {a.mensagem}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-text/60">
            Recomendações ({recomendacoes.length})
          </h2>
          {recomendacoes.length === 0 ? (
            <p className="text-sm text-brand-text/60">
              Nenhuma ação recomendada agora — siga monitorando.
            </p>
          ) : (
            <ol className="space-y-4">
              {recomendacoes.map((rec, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-brand-text/10 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <PrioridadeBadge prioridade={rec.prioridade} />
                    <span className="text-xs text-brand-text/50">
                      {rec.campanha}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-brand-text">
                    {rec.acao}
                  </p>
                  <p className="mt-1 text-sm text-brand-text/70">
                    <strong>Por quê:</strong> {rec.justificativa}
                  </p>
                  <p className="mt-1 text-sm text-brand-primary">
                    💡 {rec.impacto_estimado}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-brand-text/40">
          Análise gerada por IA com base nos dados do Meta Ads dos últimos 7 dias.
          As ações requerem confirmação no painel do Meta.
        </p>
      </div>
    </main>
  );
}

function StatusBanner({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    excelente: { label: "Excelente", bg: "bg-green-100", text: "text-green-800" },
    bom: { label: "Bom", bg: "bg-emerald-100", text: "text-emerald-800" },
    mediano: { label: "Mediano", bg: "bg-amber-100", text: "text-amber-800" },
    preocupante: { label: "Preocupante", bg: "bg-orange-100", text: "text-orange-800" },
    critico: { label: "Crítico", bg: "bg-red-100", text: "text-red-800" },
    sem_dados: { label: "Sem dados", bg: "bg-gray-100", text: "text-gray-700" },
  };
  const info = map[status] ?? map.sem_dados!;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${info.bg} ${info.text}`}
    >
      {info.label}
    </div>
  );
}

function PrioridadeBadge({ prioridade }: { prioridade: string }) {
  const map: Record<string, string> = {
    alta: "bg-red-100 text-red-800",
    media: "bg-amber-100 text-amber-800",
    baixa: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${map[prioridade] ?? map.baixa}`}
    >
      Prioridade {prioridade}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-brand-text/50">{label}</div>
      <div className="mt-1 text-lg font-bold text-brand-text">{value}</div>
    </div>
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
  return `${di} a ${df}`;
}
