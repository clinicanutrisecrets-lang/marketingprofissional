"use client";

import { useMemo, useState } from "react";

type Franqueada = {
  id: string;
  nome_completo: string;
  nome_comercial: string | null;
  status: string;
  instagram_handle: string | null;
};

type Diagnostico = {
  id: string;
  franqueada_id: string;
  status: string;
  criado_em: string;
  ia_tokens_input: number | null;
  ia_tokens_output: number | null;
  ia_custo_usd: number | null;
  latencia_ms: number | null;
};

type Props = {
  franqueadas: Franqueada[];
  diagnosticos: Diagnostico[];
};

export function AdminDiagnosticosView({ franqueadas, diagnosticos }: Props) {
  const [executando, setExecutando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const ultimoDiagPorFranqueada = useMemo(() => {
    const m = new Map<string, Diagnostico>();
    for (const d of diagnosticos) {
      if (!m.has(d.franqueada_id)) m.set(d.franqueada_id, d);
    }
    return m;
  }, [diagnosticos]);

  const custoTotalMes = useMemo(() => {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    return diagnosticos
      .filter((d) => new Date(d.criado_em) >= inicioMes)
      .reduce((acc, d) => acc + (d.ia_custo_usd ?? 0), 0);
  }, [diagnosticos]);

  async function gerar(franqueadaId: string) {
    setExecutando(franqueadaId);
    setMensagem(null);
    try {
      const resp = await fetch("/api/agentes/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franqueadaId }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }
      setMensagem({ tipo: "ok", texto: "Diagnóstico gerado. Recarregue a página pra ver." });
    } catch (e) {
      setMensagem({ tipo: "erro", texto: e instanceof Error ? e.message : String(e) });
    } finally {
      setExecutando(null);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Métricas agregadas */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Franqueadas ativas" value={franqueadas.length.toString()} />
        <MetricCard label="Diagnósticos este mês" value={diagnosticos.length.toString()} />
        <MetricCard label="Custo IA este mês" value={`$${custoTotalMes.toFixed(2)}`} />
      </div>

      {mensagem && (
        <div
          className={`rounded-lg p-3 text-sm ${
            mensagem.tipo === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-brand-muted/50 text-left text-xs uppercase tracking-wider text-brand-text/60">
            <tr>
              <th className="px-4 py-3">Franqueada</th>
              <th className="px-4 py-3">Instagram</th>
              <th className="px-4 py-3">Último diagnóstico</th>
              <th className="px-4 py-3">Custo</th>
              <th className="px-4 py-3">Latência</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-text/5">
            {franqueadas.map((f) => {
              const ultimo = ultimoDiagPorFranqueada.get(f.id);
              return (
                <tr key={f.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-text">
                      {f.nome_comercial ?? f.nome_completo}
                    </div>
                    <div className="text-xs text-brand-text/50">{f.status}</div>
                  </td>
                  <td className="px-4 py-3 text-brand-text/70">
                    {f.instagram_handle ? `@${f.instagram_handle}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {ultimo
                      ? new Date(ultimo.criado_em).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : <span className="text-brand-text/40">nunca</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-text/70">
                    {ultimo?.ia_custo_usd ? `$${ultimo.ia_custo_usd.toFixed(3)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-text/70">
                    {ultimo?.latencia_ms ? `${(ultimo.latencia_ms / 1000).toFixed(1)}s` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => gerar(f.id)}
                      disabled={executando === f.id}
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
                    >
                      {executando === f.id ? "Gerando…" : ultimo ? "Atualizar" : "Gerar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand-text">{value}</div>
    </div>
  );
}
