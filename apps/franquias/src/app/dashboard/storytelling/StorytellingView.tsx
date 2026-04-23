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
  depoimentos,
  historico,
}: {
  depoimentos: Depoimento[];
  historico: Historico[];
}) {
  const [modo, setModo] = useState<Modo>("6a_depoimento");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // 6a
  const [depoSelecionado, setDepoSelecionado] = useState<string | null>(
    depoimentos[0]?.id ?? null,
  );
  const [quemEra, setQuemEra] = useState("");
  const [problemaInicial, setProblemaInicial] = useState("");
  const [pontoRuptura, setPontoRuptura] = useState("");
  const [solucaoAplicada, setSolucaoAplicada] = useState("");
  const [resultado, setResultado] = useState("");
  const [objecoes, setObjecoes] = useState("");

  // 6b
  const [dor, setDor] = useState("");
  const [desejo, setDesejo] = useState("");
  const [publico, setPublico] = useState("");
  const [transformacao, setTransformacao] = useState("");

  // 6c
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
        const deposelecionado = depoimentos.find((d) => d.id === depoSelecionado);
        input = deposelecionado
          ? {
              quem_era: deposelecionado.quem_era,
              problema_inicial: deposelecionado.problema_inicial,
              ponto_ruptura: pontoRuptura || undefined,
              solucao_aplicada: solucaoAplicada || "plano nutricional personalizado",
              resultado: deposelecionado.resultado,
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

      const resp = await fetch("/api/agentes/storytelling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modo,
          depoimentoId: modo === "6a_depoimento" ? depoSelecionado : undefined,
          input,
        }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }
      const j = (await resp.json()) as { output: Record<string, unknown> };
      setOutput(j.output);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Abas de modo */}
      <div className="flex gap-2">
        <BotaoModo
          ativo={modo === "6a_depoimento"}
          onClick={() => setModo("6a_depoimento")}
          titulo="Depoimento → Narrativa"
          subtitulo="Case real da sua paciente"
        />
        <BotaoModo
          ativo={modo === "6b_publico_se_ve"}
          onClick={() => setModo("6b_publico_se_ve")}
          titulo="Público se vê na história"
          subtitulo="Narrativa que o leitor reconhece em si"
        />
        <BotaoModo
          ativo={modo === "6c_ideia_historia"}
          onClick={() => setModo("6c_ideia_historia")}
          titulo="Ideia → História curta"
          subtitulo="Qualquer tema em arco memorável"
        />
      </div>

      {/* Form por modo */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {modo === "6a_depoimento" && (
          <div className="space-y-4">
            {depoimentos.length > 0 ? (
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-brand-text/60">
                  Usar depoimento salvo
                </label>
                <select
                  value={depoSelecionado ?? ""}
                  onChange={(e) => setDepoSelecionado(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
                >
                  <option value="">— Novo depoimento (preencher abaixo) —</option>
                  {depoimentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.titulo} — {d.quem_era ?? ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                Você ainda não cadastrou depoimentos. Preencha abaixo — e no futuro use a tela
                de depoimentos pra salvar casos pra reuso.
              </div>
            )}

            {!depoSelecionado && (
              <div className="space-y-3">
                <Campo label="Quem era" value={quemEra} onChange={setQuemEra} placeholder="Ex: Marina, 42, histórico de diabetes na família" />
                <Campo label="Problema inicial" value={problemaInicial} onChange={setProblemaInicial} textarea />
                <Campo label="Ponto de ruptura (o que fez procurar)" value={pontoRuptura} onChange={setPontoRuptura} />
                <Campo label="Solução aplicada" value={solucaoAplicada} onChange={setSolucaoAplicada} textarea />
                <Campo label="Resultado (qualitativo — sem peso/medida)" value={resultado} onChange={setResultado} textarea />
                <Campo label="Objeções que ela relatou" value={objecoes} onChange={setObjecoes} textarea />
              </div>
            )}
          </div>
        )}

        {modo === "6b_publico_se_ve" && (
          <div className="space-y-3">
            <Campo label="Dor central do público" value={dor} onChange={setDor} textarea />
            <Campo label="Desejo profundo" value={desejo} onChange={setDesejo} textarea />
            <Campo label="Público (arquétipo)" value={publico} onChange={setPublico} placeholder="Ex: mulher 40-55, exausta de dietas" />
            <Campo label="Transformação que ela busca" value={transformacao} onChange={setTransformacao} textarea />
          </div>
        )}

        {modo === "6c_ideia_historia" && (
          <div className="space-y-3">
            <Campo label="Tema" value={tema} onChange={setTema} />
            <Campo label="Mensagem central" value={mensagem} onChange={setMensagem} textarea />
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-brand-text/60">
                Duração alvo
              </label>
              <select
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              >
                <option value="15s">15s</option>
                <option value="30s">30s</option>
                <option value="45s">45s</option>
                <option value="60s">60s</option>
                <option value="90s">90s</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {loading ? "Gerando…" : "Gerar storytelling"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {/* Output */}
      {output && <OutputPanel output={output} />}

      {/* Histórico */}
      {historico.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-text">Últimos gerados</h3>
          <ul className="mt-4 space-y-2">
            {historico.map((h) => (
              <li key={h.id} className="rounded-lg border border-brand-text/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {h.modo}
                  </span>
                  <span className="text-xs text-brand-text/50">
                    {new Date(h.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-brand-text/80">
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
      <span className="block text-xs font-medium uppercase tracking-wider text-brand-text/60 mb-1">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
        />
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
        ativo
          ? "border-brand-primary bg-brand-primary/5"
          : "border-brand-text/10 bg-white hover:border-brand-primary/40"
      }`}
    >
      <div className={`text-sm font-semibold ${ativo ? "text-brand-primary" : "text-brand-text"}`}>
        {titulo}
      </div>
      <div className="mt-1 text-xs text-brand-text/60">{subtitulo}</div>
    </button>
  );
}

function OutputPanel({ output }: { output: Record<string, unknown> }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-brand-text mb-4">Resultado</h3>
      <div className="space-y-4">
        {Object.entries(output).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-medium uppercase tracking-wider text-brand-text/60 mb-1">
              {k.replace(/_/g, " ")}
            </div>
            {typeof v === "string" ? (
              <p className="whitespace-pre-wrap rounded-lg bg-brand-muted/30 p-3 text-sm text-brand-text/85 leading-relaxed">
                {v}
              </p>
            ) : (
              <pre className="overflow-x-auto rounded-lg bg-brand-muted/30 p-3 text-xs text-brand-text/85">
                {JSON.stringify(v, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
