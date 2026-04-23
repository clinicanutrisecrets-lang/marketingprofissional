"use client";

import { useState } from "react";

type Depoimento = {
  id: string;
  titulo: string;
  quem_era: string | null;
  problema_inicial: string;
  resultado: string;
};

type Historico = {
  id: string;
  modo: string;
  versao_post_longo: string | null;
  versao_post_curto: string | null;
  criado_em: string;
};

type Modo = "6a_depoimento" | "6b_publico_se_ve" | "6c_ideia_historia";

export function StorytellingView({
  perfilSlug,
  depoimentos,
  historico,
}: {
  perfilSlug: string;
  depoimentos: Depoimento[];
  historico: Historico[];
}) {
  const [modo, setModo] = useState<Modo>("6a_depoimento");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [depoSelecionado, setDepoSelecionado] = useState<string | null>(depoimentos[0]?.id ?? null);
  const [quemEra, setQuemEra] = useState("");
  const [problemaInicial, setProblemaInicial] = useState("");
  const [pontoRuptura, setPontoRuptura] = useState("");
  const [solucaoAplicada, setSolucaoAplicada] = useState("");
  const [resultado, setResultado] = useState("");
  const [objecoes, setObjecoes] = useState("");

  const [dor, setDor] = useState("");
  const [desejo, setDesejo] = useState("");
  const [publico, setPublico] = useState("");
  const [transformacao, setTransformacao] = useState("");

  const [tema, setTema] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [duracao, setDuracao] = useState("45s");

  async function gerar() {
    setLoading(true);
    setErro(null);
    setOutput(null);
    try {
      let input: Record<string, unknown> = {};
      if (modo === "6a_depoimento") {
        const selecionado = depoimentos.find((d) => d.id === depoSelecionado);
        input = selecionado
          ? {
              quem_era: selecionado.quem_era,
              problema_inicial: selecionado.problema_inicial,
              ponto_ruptura: pontoRuptura || undefined,
              solucao_aplicada: solucaoAplicada || "acompanhamento personalizado",
              resultado: selecionado.resultado,
              objecoes_relatadas: objecoes || undefined,
            }
          : {
              quem_era: quemEra,
              problema_inicial: problemaInicial,
              ponto_ruptura: pontoRuptura,
              solucao_aplicada: solucaoAplicada,
              resultado,
              objecoes_relatadas: objecoes,
            };
      } else if (modo === "6b_publico_se_ve") {
        input = { dor, desejo, publico, transformacao };
      } else {
        input = { tema, mensagem, duracao_alvo: duracao };
      }

      const r = await fetch("/api/agentes/storytelling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfilSlug,
          modo,
          depoimentoId: modo === "6a_depoimento" ? depoSelecionado : undefined,
          input,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { output: Record<string, unknown> };
      setOutput(j.output);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex gap-2">
        <BotaoModo ativo={modo === "6a_depoimento"} onClick={() => setModo("6a_depoimento")} titulo="Depoimento → Narrativa" subtitulo="Case real" />
        <BotaoModo ativo={modo === "6b_publico_se_ve"} onClick={() => setModo("6b_publico_se_ve")} titulo="Público se vê" subtitulo="Leitor se reconhece" />
        <BotaoModo ativo={modo === "6c_ideia_historia"} onClick={() => setModo("6c_ideia_historia")} titulo="Ideia → História" subtitulo="Arco memorável" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {modo === "6a_depoimento" && (
          <div className="space-y-4">
            {depoimentos.length > 0 ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Depoimento salvo
                </label>
                <select
                  value={depoSelecionado ?? ""}
                  onChange={(e) => setDepoSelecionado(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="">— Novo (preencher abaixo) —</option>
                  {depoimentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.titulo}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Sem depoimentos salvos ainda. Preencha direto abaixo — depois a gente adiciona
                uma tela pra cadastrar pra reuso.
              </div>
            )}
            {!depoSelecionado && (
              <div className="space-y-3">
                <Campo label="Quem era" value={quemEra} onChange={setQuemEra} placeholder="Ex: Marina, 42, histórico familiar" />
                <Campo label="Problema inicial" value={problemaInicial} onChange={setProblemaInicial} textarea />
                <Campo label="Ponto de ruptura" value={pontoRuptura} onChange={setPontoRuptura} />
                <Campo label="Solução aplicada" value={solucaoAplicada} onChange={setSolucaoAplicada} textarea />
                <Campo label="Resultado (qualitativo)" value={resultado} onChange={setResultado} textarea />
                <Campo label="Objeções relatadas" value={objecoes} onChange={setObjecoes} textarea />
              </div>
            )}
          </div>
        )}
        {modo === "6b_publico_se_ve" && (
          <div className="space-y-3">
            <Campo label="Dor central" value={dor} onChange={setDor} textarea />
            <Campo label="Desejo profundo" value={desejo} onChange={setDesejo} textarea />
            <Campo label="Público (arquétipo)" value={publico} onChange={setPublico} />
            <Campo label="Transformação buscada" value={transformacao} onChange={setTransformacao} textarea />
          </div>
        )}
        {modo === "6c_ideia_historia" && (
          <div className="space-y-3">
            <Campo label="Tema" value={tema} onChange={setTema} />
            <Campo label="Mensagem central" value={mensagem} onChange={setMensagem} textarea />
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Duração alvo
              </label>
              <select value={duracao} onChange={(e) => setDuracao(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                {["15s", "30s", "45s", "60s", "90s"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-5 py-3 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Gerando…" : "Gerar storytelling"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

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
              <li key={h.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase">{h.modo}</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(h.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-zinc-700">
                  {h.versao_post_curto ?? h.versao_post_longo ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
      )}
    </label>
  );
}

function BotaoModo({
  ativo,
  onClick,
  titulo,
  subtitulo,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  subtitulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border p-4 text-left transition ${
        ativo ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:border-zinc-400"
      }`}
    >
      <div className={`text-sm font-semibold ${ativo ? "text-zinc-900" : "text-zinc-700"}`}>{titulo}</div>
      <div className="mt-1 text-xs text-zinc-500">{subtitulo}</div>
    </button>
  );
}
