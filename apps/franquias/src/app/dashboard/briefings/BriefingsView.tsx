"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  criarBriefing,
  cancelarBriefing,
  type Briefing,
  type FormatoPreferido,
} from "@/lib/briefings/actions";

const FORMATOS: { value: FormatoPreferido; label: string }[] = [
  { value: "sem_preferencia", label: "Você decide" },
  { value: "feed_imagem", label: "Feed (imagem)" },
  { value: "feed_carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels (vídeo)" },
  { value: "stories", label: "Stories" },
];

export default function BriefingsView({
  pendentes,
  recentes,
  corPrimaria,
}: {
  pendentes: Briefing[];
  recentes: Briefing[];
  corPrimaria: string;
}) {
  const [tema, setTema] = useState("");
  const [angulo, setAngulo] = useState("");
  const [formato, setFormato] = useState<FormatoPreferido>("sem_preferencia");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const proximoDomingo = (() => {
    const d = new Date();
    const diff = (7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  })();

  const dataProximoDomingo = proximoDomingo.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });

  function submeter() {
    setErro(null);
    setOk(false);
    startTransition(async () => {
      const r = await criarBriefing({
        tema,
        angulo_sugerido: angulo || undefined,
        formato_preferido: formato,
        observacoes: observacoes || undefined,
      });
      if (!r.ok) {
        setErro(r.erro ?? "Erro");
        return;
      }
      setTema("");
      setAngulo("");
      setObservacoes("");
      setFormato("sem_preferencia");
      setOk(true);
    });
  }

  function cancelar(id: string) {
    startTransition(async () => {
      await cancelarBriefing(id);
    });
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-brand-text/60 hover:text-brand-primary"
          >
            ← Voltar
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-brand-text">
            Pedidos pra próxima semana
          </h1>
          <p className="mt-2 text-brand-text/70">
            Coloca aqui os temas que você quer ver na sua agenda. Domingo de
            manhã sua equipe de IA monta o pacote da semana priorizando esses
            pedidos.{" "}
            <span className="font-medium text-brand-text">
              Próxima geração: domingo, {dataProximoDomingo}.
            </span>
          </p>
        </header>

        {/* Formulário */}
        <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-text">
            Sobre o que você quer falar?
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-text">
                Tema <span className="text-red-500">*</span>
              </label>
              <textarea
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex.: nutrigenética em mulheres na menopausa, paciente que não emagrece mesmo na dieta, importância do teste genético antes do protocolo..."
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
              <div className="mt-1 text-xs text-brand-text/40">
                {tema.length}/500
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-text">
                  Ângulo sugerido (opcional)
                </label>
                <input
                  type="text"
                  value={angulo}
                  onChange={(e) => setAngulo(e.target.value)}
                  placeholder="Ex.: mito vs verdade, caso anonimizado..."
                  className="w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-brand-text">
                  Formato preferido
                </label>
                <select
                  value={formato}
                  onChange={(e) =>
                    setFormato(e.target.value as FormatoPreferido)
                  }
                  className="w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                >
                  {FORMATOS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-brand-text">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes que ajudam a IA: público específico, gancho, exemplo que você quer usar..."
                rows={2}
                className="w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              />
            </div>

            {erro && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </div>
            )}
            {ok && (
              <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                Pedido salvo. Vai entrar no pacote de domingo.
              </div>
            )}

            <button
              type="button"
              onClick={submeter}
              disabled={pending || !tema.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              style={{ background: corPrimaria }}
            >
              {pending ? "Salvando..." : "Adicionar pedido"}
            </button>
          </div>
        </section>

        {/* Pendentes */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Aguardando próxima geração ({pendentes.length})
          </h2>
          {pendentes.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-brand-text/50 shadow-sm">
              Sem pedidos pendentes. Adicione temas acima — quando o cron rodar
              domingo, eles entram no pacote.
            </div>
          ) : (
            <div className="space-y-3">
              {pendentes.map((b) => (
                <BriefingCard
                  key={b.id}
                  briefing={b}
                  onCancelar={() => cancelar(b.id)}
                  pending={pending}
                />
              ))}
            </div>
          )}
        </section>

        {/* Histórico */}
        {recentes.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
              Histórico recente
            </h2>
            <div className="space-y-2">
              {recentes.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-white p-4 text-sm shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-brand-text">{b.tema}</div>
                      <div className="mt-1 text-xs text-brand-text/50">
                        {b.status === "usado"
                          ? `Usado em ${formatarData(b.usado_em)}`
                          : b.status === "cancelado"
                            ? `Cancelado em ${formatarData(b.cancelado_em)}`
                            : `Expirou — não entrou em nenhuma semana`}
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function BriefingCard({
  briefing,
  onCancelar,
  pending,
}: {
  briefing: Briefing;
  onCancelar: () => void;
  pending: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium text-brand-text">{briefing.tema}</div>
          {briefing.angulo_sugerido && (
            <div className="mt-1 text-sm text-brand-text/60">
              Ângulo: {briefing.angulo_sugerido}
            </div>
          )}
          {briefing.observacoes && (
            <div className="mt-2 text-sm text-brand-text/60">
              {briefing.observacoes}
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-brand-text/40">
            <span>Criado em {formatarData(briefing.criado_em)}</span>
            {briefing.formato_preferido &&
              briefing.formato_preferido !== "sem_preferencia" && (
                <>
                  <span>·</span>
                  <span className="rounded-full bg-brand-muted px-2 py-0.5">
                    {labelFormato(briefing.formato_preferido)}
                  </span>
                </>
              )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          disabled={pending}
          className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs text-brand-text/60 hover:border-red-300 hover:text-red-600 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    usado: { bg: "bg-green-100", text: "text-green-800", label: "Usado" },
    cancelado: { bg: "bg-gray-100", text: "text-gray-700", label: "Cancelado" },
    expirado: { bg: "bg-amber-100", text: "text-amber-800", label: "Expirado" },
  };
  const cfg = map[status] ?? map.expirado;
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      {cfg.label}
    </span>
  );
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function labelFormato(f: string): string {
  return FORMATOS.find((x) => x.value === f)?.label ?? f;
}
