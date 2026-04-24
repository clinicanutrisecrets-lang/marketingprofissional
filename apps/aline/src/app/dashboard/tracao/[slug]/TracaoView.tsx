"use client";

import { useState } from "react";

type Tipo =
  | "7a_hooks_alta_tracao"
  | "7b_pilares_tracao"
  | "7c_plano_misto"
  | "7d_bio_destaques"
  | "7e_analise_viralidade"
  | "7f_compartilhamento_lateral"
  | "7g_plano_reativacao";

const LABELS: Record<Tipo, { titulo: string; subtitulo: string }> = {
  "7a_hooks_alta_tracao": { titulo: "30 Hooks de Alta Tração", subtitulo: "Frases que param scroll em 3s" },
  "7b_pilares_tracao": { titulo: "Pilares de Tração", subtitulo: "3-5 ângulos compartilháveis premium" },
  "7c_plano_misto": { titulo: "Plano Misto 70/30", subtitulo: "Calendário 4 semanas" },
  "7d_bio_destaques": { titulo: "Bio + Destaques", subtitulo: "Converter visitante em seguidor" },
  "7e_analise_viralidade": { titulo: "Análise de Viralidade", subtitulo: "O que dá share/save" },
  "7f_compartilhamento_lateral": { titulo: "Conteúdo de Compartilhamento", subtitulo: "Pra mandar pra amiga/colega" },
  "7g_plano_reativacao": { titulo: "Plano Reativação 14d", subtitulo: "Ressuscitar engajamento" },
};

export function TracaoView({
  perfilSlug,
  historico,
}: {
  perfilSlug: string;
  historico: Array<Record<string, unknown>>;
}) {
  const [tipo, setTipo] = useState<Tipo>("7a_hooks_alta_tracao");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [violacoes, setViolacoes] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [objetivoCrescimento, setObjetivoCrescimento] = useState(
    "crescimento orgânico — foco em compartilhamentos",
  );
  const [assuntoEspecifico, setAssuntoEspecifico] = useState("");
  const [formatoAlvo, setFormatoAlvo] = useState<"carrossel" | "reels" | "post_longo">("carrossel");
  const [contextoCompartilhamento, setContextoCompartilhamento] = useState(
    perfilSlug === "scannerdasaude" ? "nutri manda pra colega no grupo profissional" : "mulher manda pra amiga",
  );

  async function gerar() {
    setLoading(true);
    setErro(null);
    setOutput(null);
    setViolacoes([]);
    try {
      const baseInput: Record<string, unknown> = {
        objetivo_crescimento: objetivoCrescimento,
      };
      if (tipo === "7f_compartilhamento_lateral") {
        baseInput.dor_ou_assunto_especifico = assuntoEspecifico;
        baseInput.formato_alvo = formatoAlvo;
        baseInput.contexto_compartilhamento = contextoCompartilhamento;
      }

      const resp = await fetch("/api/agentes/tracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilSlug, tipo, input: baseInput }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }
      const j = (await resp.json()) as { output: Record<string, unknown>; violacoes?: string[] };
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
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        {(Object.keys(LABELS) as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTipo(t);
              setOutput(null);
            }}
            className={`rounded-xl border p-3 text-left transition ${
              tipo === t ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"
            }`}
          >
            <div className={`text-xs font-semibold ${tipo === t ? "text-zinc-900" : "text-zinc-700"}`}>
              {LABELS[t].titulo}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 leading-tight">{LABELS[t].subtitulo}</div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm space-y-3">
        {(tipo === "7a_hooks_alta_tracao" || tipo === "7b_pilares_tracao") && (
          <label className="block">
            <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
              Objetivo de crescimento
            </span>
            <input
              value={objetivoCrescimento}
              onChange={(e) => setObjetivoCrescimento(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
        )}

        {tipo === "7f_compartilhamento_lateral" && (
          <>
            <label className="block">
              <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                Dor / assunto específico
              </span>
              <input
                value={assuntoEspecifico}
                onChange={(e) => setAssuntoEspecifico(e.target.value)}
                placeholder={
                  perfilSlug === "scannerdasaude"
                    ? "ex: anamnese que escala consultório"
                    : "ex: ansiedade + intestino"
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                  Formato alvo
                </span>
                <select
                  value={formatoAlvo}
                  onChange={(e) => setFormatoAlvo(e.target.value as typeof formatoAlvo)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="carrossel">Carrossel</option>
                  <option value="reels">Reels</option>
                  <option value="post_longo">Post longo</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                  Contexto compartilhamento
                </span>
                <input
                  value={contextoCompartilhamento}
                  onChange={(e) => setContextoCompartilhamento(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </>
        )}

        {tipo === "7e_analise_viralidade" && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Melhor rodar após 3-4 semanas de posts publicados.
          </div>
        )}

        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-5 py-3 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Gerando…" : `Gerar ${LABELS[tipo].titulo.toLowerCase()}`}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {violacoes.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ⚠ Output foi regenerado (vocabulário proibido: <strong>{violacoes.join(", ")}</strong>).
        </div>
      )}

      {output && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Resultado</h3>
          <div className="space-y-4">
            {Object.entries(output).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  {k.replace(/_/g, " ")}
                </div>
                {typeof v === "string" ? (
                  <p className="whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 leading-relaxed">
                    {v}
                  </p>
                ) : Array.isArray(v) ? (
                  <ul className="space-y-2">
                    {v.map((item, idx) => (
                      <li key={idx} className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800">
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
                  <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-800">
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
          <h3 className="text-lg font-semibold text-zinc-900">Últimos gerados</h3>
          <ul className="mt-4 space-y-2">
            {historico.map((h) => (
              <li key={h.id as string} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase">
                    {(h.tipo as string).replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-zinc-400">
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
