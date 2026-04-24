"use client";

import { useState } from "react";

type Tipo = "7a_hooks_alta_tracao" | "7b_pilares_tracao" | "7c_plano_misto" | "7d_bio_destaques" | "7e_analise_viralidade";

const LABELS: Record<Tipo, { titulo: string; subtitulo: string }> = {
  "7a_hooks_alta_tracao": {
    titulo: "30 Hooks de Alta Tração",
    subtitulo: "Frases que param scroll em 3 segundos",
  },
  "7b_pilares_tracao": {
    titulo: "Pilares de Tração",
    subtitulo: "3-5 ângulos que viralizam no seu nicho sem sacrificar posicionamento premium",
  },
  "7c_plano_misto": {
    titulo: "Plano Misto 70/30",
    subtitulo: "Calendário 4 semanas balanceando autoridade + tração",
  },
  "7d_bio_destaques": {
    titulo: "Bio + Destaques pra Follow",
    subtitulo: "Converter visitante em seguidor (não só em lead)",
  },
  "7e_analise_viralidade": {
    titulo: "Análise de Viralidade",
    subtitulo: "O que dos seus posts dá share/save e por quê",
  },
};

export function TracaoView({
  franqueada,
  historico,
}: {
  franqueada: Record<string, unknown>;
  historico: Array<Record<string, unknown>>;
}) {
  const [tipo, setTipo] = useState<Tipo>("7a_hooks_alta_tracao");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [violacoes, setViolacoes] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [objetivoCrescimento, setObjetivoCrescimento] = useState(
    "2-5k seguidores qualificados em 30 dias",
  );

  async function gerar() {
    setLoading(true);
    setErro(null);
    setOutput(null);
    setViolacoes([]);
    try {
      const baseInput = {
        perfil_tipo: "B2C_nutri",
        nicho: franqueada.nicho_principal,
        publico: franqueada.publico_alvo_descricao,
        diferenciais: franqueada.diferenciais,
        objetivo_crescimento: objetivoCrescimento,
      };
      const resp = await fetch("/api/agentes/tracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, input: baseInput }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }
      const j = (await resp.json()) as {
        output: Record<string, unknown>;
        violacoes?: string[];
      };
      setOutput(j.output);
      setViolacoes(j.violacoes ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-2 md:grid-cols-5">
        {(Object.keys(LABELS) as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTipo(t);
              setOutput(null);
            }}
            className={`rounded-xl border p-3 text-left transition ${
              tipo === t
                ? "border-brand-primary bg-brand-primary/5"
                : "border-brand-text/10 bg-white hover:border-brand-primary/40"
            }`}
          >
            <div
              className={`text-xs font-semibold ${
                tipo === t ? "text-brand-primary" : "text-brand-text"
              }`}
            >
              {LABELS[t].titulo}
            </div>
            <div className="mt-1 text-[11px] text-brand-text/60 leading-tight">
              {LABELS[t].subtitulo}
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {(tipo === "7a_hooks_alta_tracao" || tipo === "7b_pilares_tracao") && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-brand-text/60 mb-1">
                Objetivo de crescimento
              </span>
              <input
                value={objetivoCrescimento}
                onChange={(e) => setObjetivoCrescimento(e.target.value)}
                className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}

        {tipo === "7e_analise_viralidade" && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Essa análise usa os últimos 30 posts do seu perfil. Funciona melhor depois de
            3-4 semanas de conteúdo publicado.
          </div>
        )}

        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {loading ? "Gerando…" : `Gerar ${LABELS[tipo].titulo.toLowerCase()}`}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {violacoes.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ Output foi regenerado porque o primeiro continha vocabulário proibido:{" "}
          <strong>{violacoes.join(", ")}</strong>. Versão final abaixo já está limpa.
        </div>
      )}

      {output && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-text mb-4">Resultado</h3>
          <div className="space-y-4">
            {Object.entries(output).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-text/60">
                  {k.replace(/_/g, " ")}
                </div>
                {typeof v === "string" ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-brand-muted/30 p-3 text-sm text-brand-text/85 leading-relaxed">
                    {v}
                  </p>
                ) : Array.isArray(v) ? (
                  <ul className="space-y-2">
                    {v.map((item, idx) => (
                      <li
                        key={idx}
                        className="rounded-lg bg-brand-muted/30 p-3 text-sm text-brand-text/85"
                      >
                        {typeof item === "string" ? (
                          item
                        ) : (
                          <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <pre className="overflow-x-auto rounded-lg bg-brand-muted/30 p-3 text-xs text-brand-text/85">
                    {JSON.stringify(v, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {historico.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-text">Tração gerada antes</h3>
          <ul className="mt-4 space-y-2">
            {historico.map((h) => (
              <li key={h.id as string} className="rounded-lg border border-brand-text/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] uppercase">
                    {(h.tipo as string).replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-brand-text/50">
                    {new Date(h.criado_em as string).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
