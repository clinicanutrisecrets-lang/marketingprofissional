import Link from "next/link";
import { createPublicAdminClient } from "@/lib/supabase/server";

type Props = {
  nicho?: string;
};

export default async function TendenciasCard({ nicho }: Props) {
  const admin = createPublicAdminClient();

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: tendenciasRaw } = await admin
    .from("tendencias_diarias")
    .select("*")
    .eq("nicho", "saude_integrativa")
    .order("data_ref", { ascending: false })
    .order("relevancia_icp", { ascending: false })
    .limit(5);

  // Datas comemorativas nos proximos 7 dias
  const datasProximas: Array<{ mes: number; dia: number }> = [];
  const base = new Date();
  for (let i = 0; i <= 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    datasProximas.push({ mes: d.getMonth() + 1, dia: d.getDate() });
  }

  const orFilter = datasProximas
    .map((d) => `and(data_mes.eq.${d.mes},data_dia.eq.${d.dia})`)
    .join(",");

  const { data: datasRaw } = await admin
    .from("datas_comemorativas")
    .select("*")
    .eq("ativo", true)
    .or(orFilter)
    .order("prioridade", { ascending: false })
    .limit(3);

  const tendencias = (tendenciasRaw ?? []) as Array<Record<string, unknown>>;
  const datas = (datasRaw ?? []) as Array<Record<string, unknown>>;

  if (tendencias.length === 0 && datas.length === 0) {
    return null;
  }

  void hoje;
  void nicho;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-aline-text/60">
          📰 Em alta hoje no nicho
        </h2>
        <span className="text-xs text-aline-text/40">atualizado diariamente</span>
      </div>

      {datas.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium uppercase text-aline-text/50">
            Datas comemorativas próximas
          </div>
          <div className="space-y-2">
            {datas.map((d) => (
              <div
                key={d.id as string}
                className="flex items-start gap-3 rounded-lg border border-aline-text/5 bg-aline-muted/30 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-aline-scanner text-white">
                  <span className="text-xs leading-none opacity-80">
                    {mesCurto(d.data_mes as number)}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {String(d.data_dia as number).padStart(2, "0")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-aline-text">
                    {d.nome as string}
                  </div>
                  {Boolean(d.ideias_angulo) && (
                    <div className="line-clamp-2 text-xs text-aline-text/60">
                      {d.ideias_angulo as string}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tendencias.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase text-aline-text/50">
            Temas em alta (filtrados pelo ICP)
          </div>
          <div className="space-y-2">
            {tendencias.map((t) => (
              <div
                key={t.id as string}
                className="flex items-start gap-3 rounded-lg border border-aline-text/5 p-3"
              >
                <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-aline-scanner">
                  {"★".repeat(Math.min(Math.round(((t.relevancia_icp as number) ?? 6) / 2), 5))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium text-aline-text">
                    {t.tema as string}
                  </div>
                  {Boolean(t.resumo) && (
                    <div className="line-clamp-2 text-xs text-aline-text/60">
                      {t.resumo as string}
                    </div>
                  )}
                  <div className="mt-1 flex gap-1">
                    {((t.hashtags_sugeridas as string[]) ?? []).slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="rounded bg-aline-muted px-1.5 py-0.5 text-[10px] text-aline-text/60"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function mesCurto(m: number): string {
  return ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][m - 1] ?? "";
}
