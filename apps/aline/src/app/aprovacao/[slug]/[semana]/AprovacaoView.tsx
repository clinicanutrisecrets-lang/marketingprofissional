"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aprovarBlocoSemanal,
  cancelarPost,
  editarPostAprovacao,
  regenerarArteAction,
} from "@/lib/posts/aprovacao-actions";

type Props = {
  perfilSlug: string;
  perfilNome: string;
  perfilCor: string;
  semanaRef: string;
  posts: Array<Record<string, unknown>>;
};

export function AprovacaoView({
  perfilSlug,
  perfilNome,
  perfilCor,
  semanaRef,
  posts: postsIniciais,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [posts, setPosts] = useState(postsIniciais);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null);

  const aguardando = posts.filter((p) => p.status === "aguardando_aprovacao").length;
  const aprovados = posts.filter((p) => p.status === "aprovado").length;
  const cancelados = posts.filter((p) => p.status === "cancelado").length;
  const semMidia = posts.filter((p) => p.midia_pendente && p.status !== "cancelado").length;

  function handleAprovarTudo() {
    startTransition(async () => {
      const r = await aprovarBlocoSemanal({ perfilSlug, semanaRef });
      if (r.ok) {
        setFeedback(`✓ ${r.aprovados} posts aprovados`);
        router.refresh();
      } else {
        setFeedback(`✗ ${r.erro}`);
      }
    });
  }

  function handleEditar(postId: string, campo: string, valor: unknown) {
    setPosts((cur) =>
      cur.map((p) => (p.id === postId ? { ...p, [campo]: valor } : p)),
    );
  }

  function handleSalvar(post: Record<string, unknown>) {
    startTransition(async () => {
      const r = await editarPostAprovacao({
        postId: post.id as string,
        copy_legenda: post.copy_legenda as string,
        copy_cta: post.copy_cta as string,
        hashtags: post.hashtags as string[],
        data_hora_agendada: post.data_hora_agendada as string,
      });
      setFeedback(r.ok ? "✓ salvo" : `✗ ${r.erro}`);
    });
  }

  function handleCancelar(postId: string) {
    if (!confirm("Cancelar este post?")) return;
    startTransition(async () => {
      const r = await cancelarPost(postId);
      if (r.ok) {
        setPosts((cur) =>
          cur.map((p) => (p.id === postId ? { ...p, status: "cancelado" } : p)),
        );
        setFeedback("✓ cancelado");
      } else {
        setFeedback(`✗ ${r.erro}`);
      }
    });
  }

  function handleRegenerar(postId: string) {
    if (!confirm("Regenerar arte deste post? A imagem atual sera substituida.")) return;
    setRegenerandoId(postId);
    setFeedback("Gerando nova arte… (10-30s)");
    (async () => {
      const r = await regenerarArteAction(postId);
      setRegenerandoId(null);
      if (r.ok) {
        setPosts((cur) =>
          cur.map((p) => (p.id === postId ? { ...p, midia_url: r.url, midia_pendente: false } : p)),
        );
        setFeedback(
          `✓ arte regenerada${typeof r.custoUsd === "number" ? ` (custo: $${r.custoUsd.toFixed(4)})` : ""}`,
        );
      } else {
        setFeedback(`✗ ${r.erro}`);
      }
    })();
  }

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/aprovacao"
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar
        </Link>

        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-aline-text/50">
            @{perfilSlug}
          </p>
          <h1 className="text-2xl font-bold text-aline-text">{perfilNome}</h1>
          <p className="mt-1 text-sm text-aline-text/60">
            Semana de {formatSemana(semanaRef)} · {posts.length} posts
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Pill label={`Aguardando: ${aguardando}`} cls="bg-amber-100 text-amber-800" />
            <Pill label={`Aprovados: ${aprovados}`} cls="bg-green-100 text-green-800" />
            {semMidia > 0 && (
              <Pill label={`Sem arte: ${semMidia}`} cls="bg-orange-100 text-orange-800" />
            )}
            {cancelados > 0 && (
              <Pill label={`Cancelados: ${cancelados}`} cls="bg-gray-100 text-gray-600" />
            )}
          </div>

          {aguardando > 0 && (
            <button
              onClick={handleAprovarTudo}
              disabled={isPending}
              className="mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              style={{ background: perfilCor }}
            >
              Aprovar os {aguardando} posts em bloco
            </button>
          )}

          {feedback && (
            <p className="mt-3 text-sm text-aline-text/70">{feedback}</p>
          )}
        </header>

        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id as string}
              className={`rounded-2xl bg-white p-5 shadow-sm ${
                post.status === "cancelado" ? "opacity-50" : ""
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold uppercase text-white"
                    style={{ background: perfilCor }}
                  >
                    {post.tipo as string}
                  </span>
                  {Boolean(post.pilar) && (
                    <span className="text-aline-text/50">
                      {(post.pilar as string).replace(/_/g, " ")}
                    </span>
                  )}
                  {Boolean(post.midia_pendente) && (
                    <Pill label="sem arte" cls="bg-orange-100 text-orange-800" />
                  )}
                </div>
                <StatusBadge status={post.status as string} />
              </div>

              {/* Preview da arte + botao regenerar */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl bg-aline-bg/40">
                  {post.midia_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.midia_url as string}
                      alt={(post.angulo as string) ?? "post"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-aline-text/40">
                      sem imagem
                    </div>
                  )}
                  {regenerandoId === post.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs text-aline-text">
                      gerando…
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between gap-3">
                  {Boolean(post.angulo) && (
                    <p className="text-xs italic text-aline-text/60">
                      ângulo: {post.angulo as string}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleRegenerar(post.id as string)}
                      disabled={isPending || regenerandoId !== null || post.status === "cancelado"}
                      className="rounded-lg bg-aline-scanner/10 px-3 py-1.5 text-xs font-medium text-aline-scanner hover:bg-aline-scanner/20 disabled:opacity-50"
                    >
                      🔄 Regenerar arte
                    </button>
                    {Boolean(post.midia_url) && (
                      <a
                        href={post.midia_url as string}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-aline-text/5 px-3 py-1.5 text-xs font-medium hover:bg-aline-text/10"
                      >
                        Ver tamanho real ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-aline-text/50">
                Data e hora
              </label>
              <input
                type="datetime-local"
                value={toDatetimeLocal(post.data_hora_agendada as string)}
                onChange={(e) =>
                  handleEditar(post.id as string, "data_hora_agendada", fromDatetimeLocal(e.target.value))
                }
                className="rounded-lg border border-aline-text/10 bg-aline-bg/30 p-2 text-sm focus:border-aline-scanner focus:outline-none"
                disabled={post.status === "cancelado"}
              />

              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wide text-aline-text/50">
                Legenda
              </label>
              <textarea
                rows={5}
                value={(post.copy_legenda as string) ?? ""}
                onChange={(e) => handleEditar(post.id as string, "copy_legenda", e.target.value)}
                className="w-full rounded-lg border border-aline-text/10 bg-aline-bg/30 p-3 text-sm focus:border-aline-scanner focus:outline-none"
                disabled={post.status === "cancelado"}
              />

              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wide text-aline-text/50">
                CTA
              </label>
              <input
                type="text"
                value={(post.copy_cta as string) ?? ""}
                onChange={(e) => handleEditar(post.id as string, "copy_cta", e.target.value)}
                className="w-full rounded-lg border border-aline-text/10 bg-aline-bg/30 p-2 text-sm focus:border-aline-scanner focus:outline-none"
                disabled={post.status === "cancelado"}
              />

              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wide text-aline-text/50">
                Hashtags
              </label>
              <input
                type="text"
                value={((post.hashtags as string[]) ?? []).join(" ")}
                onChange={(e) =>
                  handleEditar(
                    post.id as string,
                    "hashtags",
                    e.target.value.split(/\s+/).filter(Boolean).map((h) => h.replace(/^#/, "")),
                  )
                }
                placeholder="separe por espaco, sem #"
                className="w-full rounded-lg border border-aline-text/10 bg-aline-bg/30 p-2 text-xs focus:border-aline-scanner focus:outline-none"
                disabled={post.status === "cancelado"}
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleSalvar(post)}
                  disabled={isPending || post.status === "cancelado"}
                  className="rounded-lg bg-aline-text/5 px-3 py-1.5 text-xs font-medium hover:bg-aline-text/10 disabled:opacity-50"
                >
                  Salvar edicao
                </button>
                {post.status !== "cancelado" && (
                  <button
                    onClick={() => handleCancelar(post.id as string)}
                    disabled={isPending}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    aguardando_aprovacao: { label: "Aguardando", cls: "bg-amber-100 text-amber-800" },
    aprovado: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
    agendado: { label: "Agendado", cls: "bg-purple-100 text-purple-800" },
    postado: { label: "Postado", cls: "bg-gray-100 text-gray-700" },
    erro: { label: "Erro", cls: "bg-red-100 text-red-800" },
    cancelado: { label: "Cancelado", cls: "bg-gray-100 text-gray-500" },
  };
  const info = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return <Pill label={info.label} cls={info.cls} />;
}

function formatSemana(s: string): string {
  return new Date(`${s}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** ISO timestamp -> formato datetime-local (YYYY-MM-DDTHH:mm) em horario local */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** datetime-local input value -> ISO timestamp UTC */
function fromDatetimeLocal(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}
