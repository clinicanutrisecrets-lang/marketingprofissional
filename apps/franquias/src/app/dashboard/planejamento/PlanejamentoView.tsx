"use client";

import { useState } from "react";

type Tipo = "skill_2_mecanismo_unico" | "skill_3_posicionamento_oferta" | "skill_5_funil_organico";

const LABELS: Record<Tipo, { titulo: string; subtitulo: string }> = {
  skill_2_mecanismo_unico: {
    titulo: "Mecanismo Único da Oferta",
    subtitulo: "10 nomes fortes pro seu produto + top 3 eleitos",
  },
  skill_3_posicionamento_oferta: {
    titulo: "Posicionamento e Oferta Irresistível",
    subtitulo: "Promessa, ângulo, bullets, stack, bônus, headlines",
  },
  skill_5_funil_organico: {
    titulo: "Funil Orgânico (Lead → Venda)",
    subtitulo: "Conteúdo topo/meio/fundo, iscas, sequência, calendário",
  },
};

export function PlanejamentoView({
  franqueada,
  planejamentosRecentes,
}: {
  franqueada: Record<string, unknown>;
  planejamentosRecentes: Array<Record<string, unknown>>;
}) {
  const [tipo, setTipo] = useState<Tipo>("skill_2_mecanismo_unico");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<Record<string, unknown> | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Skill 2
  const [s2Produto, setS2Produto] = useState("Consulta nutricional de precisão + teste nutrigenético");
  const [s2Dor, setS2Dor] = useState("");
  const [s2Promessa, setS2Promessa] = useState("");
  const [s2Objecoes, setS2Objecoes] = useState("");
  const [s2Concorrentes, setS2Concorrentes] = useState("");

  // Skill 3
  const [s3Produto, setS3Produto] = useState("Consulta nutricional");
  const [s3Preco, setS3Preco] = useState(String(franqueada.valor_consulta_inicial ?? "650"));
  const [s3Transformacao, setS3Transformacao] = useState("");
  const [s3Provas, setS3Provas] = useState("");
  const [s3Objecoes, setS3Objecoes] = useState("");
  const [s3Concorrentes, setS3Concorrentes] = useState("");
  const [s3Formato, setS3Formato] = useState("Consulta 60min presencial/online + plano escrito + retornos 30d");

  // Skill 5
  const [s5Ticket, setS5Ticket] = useState(String(franqueada.valor_consulta_inicial ?? "650"));
  const [s5Consciencia, setS5Consciencia] = useState("pouco_consciente");
  const [s5Conteudo, setS5Conteudo] = useState("");
  const [s5Tempo, setS5Tempo] = useState("3h");
  const [s5Canal, setS5Canal] = useState("Instagram");

  async function gerar() {
    setLoading(true);
    setErro(null);
    setOutput(null);
    try {
      let input: Record<string, unknown> = {};
      if (tipo === "skill_2_mecanismo_unico") {
        input = {
          produto: s2Produto,
          publico: franqueada.publico_alvo_descricao,
          dor_principal: s2Dor,
          promessa: s2Promessa,
          diferenciais: franqueada.diferenciais,
          objecoes: s2Objecoes,
          concorrentes: s2Concorrentes,
        };
      } else if (tipo === "skill_3_posicionamento_oferta") {
        input = {
          produto: s3Produto,
          preco: s3Preco,
          publico: franqueada.publico_alvo_descricao,
          transformacao_prometida: s3Transformacao,
          provas: s3Provas,
          objecoes: s3Objecoes,
          concorrentes: s3Concorrentes,
          formato_entrega: s3Formato,
        };
      } else {
        input = {
          produto: "Consulta + teste genético",
          publico: franqueada.publico_alvo_descricao,
          ticket: s5Ticket,
          consciencia_audiencia: s5Consciencia,
          tipo_conteudo_atual: s5Conteudo,
          tempo_disponivel_semanal: s5Tempo,
          canal_principal: s5Canal,
        };
      }

      const resp = await fetch("/api/agentes/planejamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, input }),
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
      {/* Abas */}
      <div className="flex gap-2">
        {(Object.keys(LABELS) as Tipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTipo(t);
              setOutput(null);
            }}
            className={`flex-1 rounded-xl border p-4 text-left transition ${
              tipo === t
                ? "border-brand-primary bg-brand-primary/5"
                : "border-brand-text/10 bg-white hover:border-brand-primary/40"
            }`}
          >
            <div className={`text-sm font-semibold ${tipo === t ? "text-brand-primary" : "text-brand-text"}`}>
              {LABELS[t].titulo}
            </div>
            <div className="mt-1 text-xs text-brand-text/60">{LABELS[t].subtitulo}</div>
          </button>
        ))}
      </div>

      {/* Form por tipo */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        {tipo === "skill_2_mecanismo_unico" && (
          <div className="space-y-3">
            <Campo label="Produto/serviço" value={s2Produto} onChange={setS2Produto} />
            <Campo label="Dor principal do público" value={s2Dor} onChange={setS2Dor} textarea />
            <Campo label="Promessa que você faz hoje" value={s2Promessa} onChange={setS2Promessa} textarea />
            <Campo label="Objeções comuns que ouve" value={s2Objecoes} onChange={setS2Objecoes} textarea />
            <Campo label="Concorrentes" value={s2Concorrentes} onChange={setS2Concorrentes} textarea />
          </div>
        )}

        {tipo === "skill_3_posicionamento_oferta" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Produto" value={s3Produto} onChange={setS3Produto} />
              <Campo label="Preço" value={s3Preco} onChange={setS3Preco} />
            </div>
            <Campo label="Transformação prometida" value={s3Transformacao} onChange={setS3Transformacao} textarea />
            <Campo label="Provas que tem (depoimentos, dados, casos)" value={s3Provas} onChange={setS3Provas} textarea />
            <Campo label="Objeções comuns" value={s3Objecoes} onChange={setS3Objecoes} textarea />
            <Campo label="Concorrentes" value={s3Concorrentes} onChange={setS3Concorrentes} textarea />
            <Campo label="Formato de entrega" value={s3Formato} onChange={setS3Formato} textarea />
          </div>
        )}

        {tipo === "skill_5_funil_organico" && (
          <div className="space-y-3">
            <Campo label="Ticket médio" value={s5Ticket} onChange={setS5Ticket} />
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-brand-text/60">Consciência do público</label>
              <select value={s5Consciencia} onChange={(e) => setS5Consciencia(e.target.value)} className="mt-1 w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm">
                <option value="inconsciente">Inconsciente do problema</option>
                <option value="pouco_consciente">Pouco consciente — sabe que tem dor</option>
                <option value="consciente_solucao">Consciente da solução</option>
                <option value="consciente_produto">Consciente do produto</option>
              </select>
            </div>
            <Campo label="Tipo de conteúdo que já faz" value={s5Conteudo} onChange={setS5Conteudo} textarea />
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tempo disponível/semana" value={s5Tempo} onChange={setS5Tempo} />
              <Campo label="Canal principal" value={s5Canal} onChange={setS5Canal} />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {loading ? "Gerando planejamento…" : "Gerar planejamento"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      {output && <OutputGenerico output={output} />}

      {planejamentosRecentes.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-brand-text">Planejamentos recentes</h3>
          <ul className="mt-4 space-y-2">
            {planejamentosRecentes.map((p) => (
              <li key={p.id as string} className="rounded-lg border border-brand-text/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {(p.tipo as string).replace("skill_", "").replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-brand-text/50">
                    {new Date(p.criado_em as string).toLocaleDateString("pt-BR")}
                    {p.vigente_ate && ` · válido até ${new Date(p.vigente_ate as string).toLocaleDateString("pt-BR")}`}
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

function Campo({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-brand-text/60 mb-1">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm" />
      )}
    </label>
  );
}

function OutputGenerico({ output }: { output: Record<string, unknown> }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-brand-text mb-4">Resultado</h3>
      <div className="space-y-4">
        {Object.entries(output).map(([k, v]) => (
          <div key={k}>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-brand-text/60">
              {k.replace(/_/g, " ")}
            </div>
            {typeof v === "string" ? (
              <p className="whitespace-pre-wrap rounded-lg bg-brand-muted/30 p-3 text-sm text-brand-text/85 leading-relaxed">{v}</p>
            ) : Array.isArray(v) ? (
              <ul className="space-y-2">
                {v.map((item, idx) => (
                  <li key={idx} className="rounded-lg bg-brand-muted/30 p-3 text-sm text-brand-text/85">
                    {typeof item === "string" ? (
                      item
                    ) : (
                      <pre className="overflow-x-auto text-xs">{JSON.stringify(item, null, 2)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <pre className="overflow-x-auto rounded-lg bg-brand-muted/30 p-3 text-xs text-brand-text/85">{JSON.stringify(v, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
