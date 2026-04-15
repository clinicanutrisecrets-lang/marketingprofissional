import Link from "next/link";
import { listarTendenciasDoDia } from "@/lib/tendencias/orquestrar";
import { buscarDatasProximas, filtrarPorNicho } from "@/lib/tendencias/datas-comemorativas";

type Props = {
  nicho?: string;
  corPrimaria?: string;
};

export default async function TendenciasCard({ nicho, corPrimaria }: Props) {
  const [tendencias, datasRaw] = await Promise.all([
    listarTendenciasDoDia("saude_integrativa", 5),
    buscarDatasProximas(7),
  ]);

  const datas = filtrarPorNicho(datasRaw, nicho ?? "saude_integrativa").slice(0, 3);
  const cor = corPrimaria ?? "#0BB8A8";

  if (tendencias.length === 0 && datas.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-text/60">
          📰 Em alta hoje no seu nicho
        </h2>
        <span className="text-xs text-brand-text/40">atualizado diariamente</span>
      </div>

      {datas.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium uppercase text-brand-text/50">
            Datas comemorativas próximas
          </div>
          <div className="space-y-2">
            {datas.map((d) => (
              <Link
                key={d.id}
                href={`/dashboard/posts/novo?tema=${encodeURIComponent(d.nome)}&data=${d.data_dia}-${d.data_mes}`}
                className="flex items-start gap-3 rounded-lg border border-brand-text/5 bg-brand-muted/30 p-3 transition hover:border-brand-primary hover:bg-brand-muted"
              >
                <div
                  className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-white"
                  style={{ background: cor }}
                >
                  <span className="text-xs leading-none opacity-80">
                    {mesCurto(d.data_mes)}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {String(d.data_dia).padStart(2, "0")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-brand-text">
                    {d.nome}
                  </div>
                  {d.ideias_angulo && (
                    <div className="line-clamp-2 text-xs text-brand-text/60">
                      {d.ideias_angulo}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tendencias.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-brand-text/50">
            Temas em alta (filtrados pro seu público)
          </div>
          <div className="space-y-2">
            {tendencias.map((t) => (
              <Link
                key={t.id as string}
                href={`/dashboard/posts/novo?tema=${encodeURIComponent(t.tema as string)}&angulo=${encodeURIComponent((t.angulo_sugerido as string) ?? "")}`}
                className="flex items-start gap-3 rounded-lg border border-brand-text/5 p-3 transition hover:border-brand-primary hover:bg-brand-muted/30"
              >
                <div className="flex shrink-0 items-center gap-1 text-xs font-bold">
                  <span style={{ color: cor }}>
                    {"★".repeat(Math.min(Math.round(((t.relevancia_icp as number) ?? 6) / 2), 5))}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium text-brand-text">
                    {t.tema as string}
                  </div>
                  {t.resumo && (
                    <div className="line-clamp-2 text-xs text-brand-text/60">
                      {t.resumo as string}
                    </div>
                  )}
                  <div className="mt-1 flex gap-1">
                    {((t.hashtags_sugeridas as string[]) ?? []).slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="rounded bg-brand-muted px-1.5 py-0.5 text-[10px] text-brand-text/60"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-brand-text/40">
        Clica em qualquer item pra criar post com esse tema já pré-preenchido.
      </p>
    </div>
  );
}

function mesCurto(m: number): string {
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1] ?? "";
}
