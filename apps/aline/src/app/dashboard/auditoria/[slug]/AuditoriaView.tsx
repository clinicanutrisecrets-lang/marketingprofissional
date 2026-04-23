"use client";

import { useState } from "react";

type Ideia = {
  ordem: number;
  titulo: string;
  formato: string;
  angulo: string;
  hook: string;
  estrutura: string;
  cta: string;
  justificativa: string;
  gap_que_preenche: string;
  pilar_alvo?: string;
};

type Auditoria = {
  id: string;
  padroes_conteudo_prende: Array<{ padrao: string; evidencia: string }>;
  padroes_conteudo_converte: Array<{ padrao: string; evidencia: string }>;
  erros_recorrentes: Array<{ erro: string; impacto: string }>;
  temas_saturados: string[];
  temas_subexplorados: string[];
  lacunas_narrativa: string[];
  lacunas_autoridade: string[];
  oportunidades_viralizacao: Array<{ formato: string; angulo: string; justificativa: string }>;
  oportunidades_prova: Array<{ oportunidade: string; onde_aplicar: string }>;
  ideias_por_gap: Ideia[];
  qtd_posts_analisados: number;
  criado_em: string;
  ia_custo_usd: number | null;
  latencia_ms: number | null;
};

type Props = {
  perfilSlug: string;
  auditoriaInicial: Record<string, unknown> | null;
};

export function AuditoriaView({ perfilSlug, auditoriaInicial }: Props) {
  const [auditoria] = useState<Auditoria | null>(
    (auditoriaInicial as unknown as Auditoria | null) ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/agentes/auditoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfilSlug }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({ erro: "Erro" }));
        throw new Error(j.erro || `HTTP ${r.status}`);
      }
      window.location.reload();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  if (!auditoria) {
    return (
      <div className="mt-8 rounded-2xl bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Sem auditoria ainda</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Agente analisa os últimos posts e entrega 20 ideias em ~60s.
        </p>
        {erro && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="mt-6 rounded-lg bg-zinc-900 px-6 py-3 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Analisando…" : "Gerar auditoria"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div className="text-xs text-zinc-500">
          <div>
            {auditoria.qtd_posts_analisados} posts ·{" "}
            {new Date(auditoria.criado_em).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-400">
            {auditoria.ia_custo_usd && `Custo: $${auditoria.ia_custo_usd.toFixed(3)} · `}
            {auditoria.latencia_ms && `${(auditoria.latencia_ms / 1000).toFixed(1)}s`}
          </div>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading ? "Gerando…" : "Nova auditoria"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">20 ideias de conteúdo</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Cada uma pronta pra virar post — respeitando os pilares do perfil.
        </p>
        <ol className="mt-5 space-y-3">
          {auditoria.ideias_por_gap.map((i) => (
            <li key={i.ordem} className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                  {i.ordem}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-zinc-900">{i.titulo}</h3>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                      {i.formato}
                    </span>
                    <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] text-zinc-500">
                      {i.angulo}
                    </span>
                    {i.pilar_alvo && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                        pilar: {i.pilar_alvo}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5 text-sm text-zinc-700">
                    <p><strong className="text-xs uppercase tracking-wider text-zinc-400">Hook:</strong> {i.hook}</p>
                    <p><strong className="text-xs uppercase tracking-wider text-zinc-400">Estrutura:</strong> {i.estrutura}</p>
                    <p><strong className="text-xs uppercase tracking-wider text-zinc-400">CTA:</strong> {i.cta}</p>
                    <p className="text-xs italic text-zinc-500">
                      {i.justificativa}{" "}
                      <span className="ml-1 rounded bg-amber-50 px-1 py-0.5 text-[10px] text-amber-800">
                        {i.gap_que_preenche}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Bloco titulo="O que prende" itens={auditoria.padroes_conteudo_prende} tipo="padrao" cor="green" />
        <Bloco titulo="O que converte" itens={auditoria.padroes_conteudo_converte} tipo="padrao" cor="green" />
      </div>

      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
        <h3 className="text-sm font-semibold text-zinc-900">Erros recorrentes</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-800">
          {auditoria.erros_recorrentes.map((e, i) => (
            <li key={i}>
              <strong>{e.erro}</strong> — <span className="text-zinc-600">{e.impacto}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <ListaSimples titulo="Temas saturados" itens={auditoria.temas_saturados} cor="red" />
        <ListaSimples titulo="Temas subexplorados" itens={auditoria.temas_subexplorados} cor="green" />
        <ListaSimples titulo="Lacunas de narrativa" itens={auditoria.lacunas_narrativa} cor="amber" />
        <ListaSimples titulo="Lacunas de autoridade" itens={auditoria.lacunas_autoridade} cor="amber" />
      </div>
    </div>
  );
}

function Bloco({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: Array<{ padrao: string; evidencia: string }>;
  tipo: "padrao";
  cor: "green";
}) {
  return (
    <section className={`rounded-2xl border border-green-200 bg-green-50/50 p-5`}>
      <h3 className="text-sm font-semibold text-zinc-900">{titulo}</h3>
      <ul className="mt-3 space-y-2.5 text-sm text-zinc-800">
        {itens.map((i, idx) => (
          <li key={idx}>
            <strong>{i.padrao}</strong>
            <div className="text-xs text-zinc-600 mt-0.5">{i.evidencia}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListaSimples({
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
      <ul className="mt-3 space-y-1.5 text-sm text-zinc-800">
        {itens.map((i, idx) => (
          <li key={idx}>• {i}</li>
        ))}
      </ul>
    </section>
  );
}
