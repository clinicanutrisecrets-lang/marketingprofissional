"use client";

import { useMemo } from "react";

type Registro = Record<string, unknown>;

type Props = {
  diagnosticos: Registro[];
  auditorias: Registro[];
  storytellings: Registro[];
  totalFranqueadas: number;
  inicioPeriodo: string;
};

type SkillResumo = {
  nome: string;
  execucoes: number;
  execucoes_7d: number;
  custoUsd: number;
  latenciaP50Ms: number;
  taxaSucesso: number;
  taxaAprovacao?: number;
  alertas: string[];
};

export function SaudeDashboard({
  diagnosticos,
  auditorias,
  storytellings,
  totalFranqueadas,
  inicioPeriodo,
}: Props) {
  const skills = useMemo<SkillResumo[]>(() => {
    const inicio7d = new Date(inicioPeriodo).getTime();

    return [
      resumirSkill("Skill 1 — Diagnóstico de Perfil", diagnosticos, inicio7d, {
        statusAprovado: ["aprovado", "visualizado"],
        alertaLatenciaMs: 45000,
      }),
      resumirSkill("Skill 4 — Auditoria + 20 Ideias", auditorias, inicio7d, {
        statusAprovado: ["aproveitado_parcial", "aproveitado_total"],
        alertaLatenciaMs: 90000,
      }),
      resumirSkill("Skill 6 — Storytelling", storytellings, inicio7d, {
        statusAprovado: ["aprovado", "postado", "usado_em_ad"],
        alertaLatenciaMs: 60000,
      }),
    ];
  }, [diagnosticos, auditorias, storytellings, inicioPeriodo]);

  const custoTotal = useMemo(() => {
    const d = diagnosticos.reduce((s, r) => s + ((r.ia_custo_usd as number) ?? 0), 0);
    const a = auditorias.reduce((s, r) => s + ((r.ia_custo_usd as number) ?? 0), 0);
    const st = storytellings.reduce((s, r) => s + ((r.ia_custo_usd as number) ?? 0), 0);
    return d + a + st;
  }, [diagnosticos, auditorias, storytellings]);

  const execucoesTotal = diagnosticos.length + auditorias.length + storytellings.length;
  const franqueadasAtivas7d = contarFranqueadasAtivasDesde(
    [...diagnosticos, ...auditorias, ...storytellings],
    new Date(inicioPeriodo).getTime(),
  );

  const alertasGlobais = skills.flatMap((s) => s.alertas);

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Execuções no mês" value={execucoesTotal.toString()} />
        <Metric label="Custo IA no mês" value={`$${custoTotal.toFixed(2)}`} />
        <Metric
          label="Franqueadas com atividade (7d)"
          value={`${franqueadasAtivas7d} / ${totalFranqueadas}`}
        />
        <Metric
          label="Alertas ativos"
          value={alertasGlobais.length.toString()}
          cor={alertasGlobais.length === 0 ? "green" : "amber"}
        />
      </div>

      {alertasGlobais.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h3 className="text-sm font-semibold text-amber-900">Alertas proativos</h3>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {alertasGlobais.map((a, i) => (
              <li key={i}>⚠ {a}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-text">Por skill</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-brand-text/60">
              <tr className="border-b border-brand-text/10">
                <th className="py-2 text-left">Skill</th>
                <th className="py-2 text-right">Execuções/mês</th>
                <th className="py-2 text-right">Últimos 7d</th>
                <th className="py-2 text-right">Custo</th>
                <th className="py-2 text-right">Latência p50</th>
                <th className="py-2 text-right">Taxa sucesso</th>
                <th className="py-2 text-right">Taxa aprovação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-text/5">
              {skills.map((s) => (
                <tr key={s.nome}>
                  <td className="py-3 font-medium text-brand-text">{s.nome}</td>
                  <td className="py-3 text-right">{s.execucoes}</td>
                  <td className="py-3 text-right">{s.execucoes_7d}</td>
                  <td className="py-3 text-right">${s.custoUsd.toFixed(3)}</td>
                  <td className="py-3 text-right">{(s.latenciaP50Ms / 1000).toFixed(1)}s</td>
                  <td className="py-3 text-right">{s.taxaSucesso.toFixed(0)}%</td>
                  <td className="py-3 text-right">
                    {s.taxaAprovacao === undefined ? "—" : `${s.taxaAprovacao.toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-brand-text mb-3">Como ler esses números</h3>
        <ul className="space-y-2 text-sm text-brand-text/70 list-disc pl-5">
          <li>
            <strong>Taxa de sucesso:</strong> % das execuções que retornaram JSON válido e
            foram salvas. Abaixo de 90% = investigar erros do Claude.
          </li>
          <li>
            <strong>Taxa de aprovação:</strong> % das saídas em que a nutri aprovou, visualizou
            ou aproveitou o output. Abaixo de 60% = prompt precisa revisão.
          </li>
          <li>
            <strong>Latência p50:</strong> mediana do tempo de execução. Se subir ≥2x acima do
            normal, algo degradou (Claude lento ou dados mais pesados).
          </li>
          <li>
            <strong>Custo mensal por skill:</strong> referência pra decidir se vale ativar ciclo
            recorrente (ex: diagnóstico mensal automático por franqueada).
          </li>
        </ul>
      </section>
    </div>
  );
}

function resumirSkill(
  nome: string,
  registros: Registro[],
  inicio7dMs: number,
  opts: { statusAprovado: string[]; alertaLatenciaMs: number },
): SkillResumo {
  const execucoes = registros.length;
  const execucoes7d = registros.filter(
    (r) => new Date(r.criado_em as string).getTime() >= inicio7dMs,
  ).length;

  const custoUsd = registros.reduce((s, r) => s + ((r.ia_custo_usd as number) ?? 0), 0);

  const latencias = registros
    .map((r) => r.latencia_ms as number)
    .filter((x) => typeof x === "number" && x > 0)
    .sort((a, b) => a - b);
  const latenciaP50Ms = latencias.length ? latencias[Math.floor(latencias.length / 2)] ?? 0 : 0;

  const comResultado = registros.filter((r) => r.id);
  const taxaSucesso = execucoes > 0 ? (comResultado.length / execucoes) * 100 : 100;

  const aprovados = registros.filter((r) =>
    opts.statusAprovado.includes((r.status as string) ?? ""),
  ).length;
  const taxaAprovacao = execucoes > 0 ? (aprovados / execucoes) * 100 : undefined;

  const alertas: string[] = [];
  if (latenciaP50Ms > opts.alertaLatenciaMs) {
    alertas.push(
      `${nome}: latência mediana ${(latenciaP50Ms / 1000).toFixed(1)}s acima do esperado (${(opts.alertaLatenciaMs / 1000).toFixed(0)}s).`,
    );
  }
  if (execucoes >= 5 && taxaAprovacao !== undefined && taxaAprovacao < 60) {
    alertas.push(
      `${nome}: taxa de aprovação ${taxaAprovacao.toFixed(0)}% abaixo de 60%. Prompt pode precisar revisão.`,
    );
  }
  if (execucoes >= 10 && taxaSucesso < 90) {
    alertas.push(
      `${nome}: taxa de sucesso ${taxaSucesso.toFixed(0)}% abaixo de 90%. Verificar logs de erro do Claude.`,
    );
  }

  return {
    nome,
    execucoes,
    execucoes_7d: execucoes7d,
    custoUsd,
    latenciaP50Ms,
    taxaSucesso,
    taxaAprovacao,
    alertas,
  };
}

function contarFranqueadasAtivasDesde(registros: Registro[], desdeMs: number): number {
  const set = new Set<string>();
  for (const r of registros) {
    const d = new Date(r.criado_em as string).getTime();
    if (d >= desdeMs && r.franqueada_id) set.add(r.franqueada_id as string);
  }
  return set.size;
}

function Metric({
  label,
  value,
  cor = "default",
}: {
  label: string;
  value: string;
  cor?: "default" | "green" | "amber" | "red";
}) {
  const corMap = {
    default: "text-brand-text",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${corMap[cor]}`}>{value}</div>
    </div>
  );
}
