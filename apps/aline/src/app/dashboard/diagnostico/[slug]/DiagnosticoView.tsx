"use client";

import { useState } from "react";

type Mudanca = {
  ordem: number;
  titulo: string;
  descricao: string;
  impacto: "alto" | "medio" | "baixo";
  esforco: "baixo" | "medio" | "alto";
  onde_aplicar: string;
};

type Diagnostico = {
  id: string;
  diagnostico_primeira_impressao: string;
  clareza_posicionamento: string;
  linha_editorial_atual: string;
  forcas: string[];
  fraquezas: string[];
  gargalos_crescimento: string[];
  gargalos_conversao: string[];
  erros_percepcao: string[];
  oportunidades_rapidas: string[];
  ideias_reposicionamento: string[];
  sugestoes_bio: string[];
  sugestoes_destaques: string[];
  sugestoes_linha_editorial: string;
  mudancas_priorizadas: Mudanca[];
  criado_em: string;
  ia_custo_usd: number | null;
  latencia_ms: number | null;
};

type Props = {
  perfilSlug: string;
  diagnosticoInicial: Record<string, unknown> | null;
};

export function DiagnosticoView({ perfilSlug, diagnosticoInicial }: Props) {
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(
    (diagnosticoInicial as unknown as Diagnostico | null) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerarNovo() {
    setLoading(true);
    setErro(null);
    try {
      const resp = await fetch("/api/agentes/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilSlug }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }
      window.location.reload();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  if (!diagnostico) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Ainda sem diagnóstico</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Em ~30 segundos o agente analisa o perfil e entrega 10 mudanças priorizadas.
        </p>
        {erro && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        )}
        <button
          type="button"
          onClick={gerarNovo}
          disabled={loading}
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-3 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Analisando…" : "Gerar diagnóstico"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div className="text-xs text-zinc-500">
          <div>
            Gerado em{" "}
            <strong>
              {new Date(diagnostico.criado_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </strong>
          </div>
          <div className="mt-0.5 flex gap-3 text-[11px] text-zinc-400">
            {diagnostico.ia_custo_usd !== null && (
              <span>Custo: ${diagnostico.ia_custo_usd.toFixed(3)}</span>
            )}
            {diagnostico.latencia_ms !== null && (
              <span>Latência: {(diagnostico.latencia_ms / 1000).toFixed(1)}s</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={gerarNovo}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading ? "Gerando…" : "Atualizar análise"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {/* MUDANÇAS PRIORIZADAS */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">10 mudanças priorizadas</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Ordem recomendada — quick wins primeiro.
        </p>
        <ol className="mt-5 space-y-4">
          {diagnostico.mudancas_priorizadas.map((m) => (
            <li key={m.ordem} className="flex gap-4 rounded-lg border border-zinc-200 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                {m.ordem}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-semibold text-zinc-900">{m.titulo}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                    {m.onde_aplicar}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-700">{m.descricao}</p>
                <div className="mt-2 flex gap-4 text-[11px] text-zinc-500">
                  <span>
                    Impacto:{" "}
                    <strong
                      className={
                        m.impacto === "alto"
                          ? "text-green-700"
                          : m.impacto === "medio"
                            ? "text-amber-700"
                            : "text-zinc-500"
                      }
                    >
                      {m.impacto}
                    </strong>
                  </span>
                  <span>
                    Esforço: <strong>{m.esforco}</strong>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* LEITURA */}
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Como o perfil é lido</h2>
        <div className="mt-4 space-y-4 text-sm text-zinc-800 leading-relaxed">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
              Primeira impressão
            </div>
            <p>{diagnostico.diagnostico_primeira_impressao}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
              Clareza de posicionamento
            </div>
            <p>{diagnostico.clareza_posicionamento}</p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">
              Linha editorial atual
            </div>
            <p>{diagnostico.linha_editorial_atual}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Bloco titulo="Forças" itens={diagnostico.forcas} cor="green" />
        <Bloco titulo="Fraquezas" itens={diagnostico.fraquezas} cor="red" />
        <Bloco titulo="Gargalos de crescimento" itens={diagnostico.gargalos_crescimento} cor="amber" />
        <Bloco titulo="Gargalos de conversão" itens={diagnostico.gargalos_conversao} cor="amber" />
        <Bloco titulo="Erros de percepção" itens={diagnostico.erros_percepcao} cor="red" />
        <Bloco titulo="Oportunidades rápidas" itens={diagnostico.oportunidades_rapidas} cor="green" />
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Sugestões acionáveis</h2>
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Novas versões de bio</h3>
            <ul className="space-y-2">
              {diagnostico.sugestoes_bio.map((b, i) => (
                <li key={i} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Destaques sugeridos</h3>
            <div className="flex flex-wrap gap-2">
              {diagnostico.sugestoes_destaques.map((d, i) => (
                <span key={i} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm">
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Linha editorial recomendada</h3>
            <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800">
              {diagnostico.sugestoes_linha_editorial}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Ideias de reposicionamento</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-800">
              {diagnostico.ideias_reposicionamento.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function Bloco({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: string[];
  cor: "green" | "red" | "amber";
}) {
  const corMap = {
    green: "border-green-200 bg-green-50/50",
    red: "border-red-200 bg-red-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  };
  return (
    <section className={`rounded-2xl border p-5 ${corMap[cor]}`}>
      <h3 className="text-sm font-semibold text-zinc-900">{titulo}</h3>
      <ul className="mt-3 space-y-2 text-sm text-zinc-800">
        {itens.map((i, idx) => (
          <li key={idx} className="leading-relaxed">• {i}</li>
        ))}
      </ul>
    </section>
  );
}
