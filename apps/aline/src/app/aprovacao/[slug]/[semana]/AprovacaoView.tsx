"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aprovarBlocoSemanal,
  cancelarPost,
  editarPostAprovacao,
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

  const aguardando = posts.filter((p) => p.status === "aguardando_aprovacao").length;
  const aprovados = posts.filter((p) => p.status === "aprovado").length;
  const cancelados = posts.filter((p) => p.status === "cancelado").length;

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
                  <span className="text-aline-text/60">
                    {formatDataHora(post.data_hora_agendada as string)}
                  </span>
                  {Boolean(post.pilar) && (
                    <span className="text-aline-text/50">
                      · {(post.pilar as string).replace(/_/g, " ")}
                    </span>
                  )}
                  {Boolean(post.midia_pendente) && (
                    <Pill label="midia pendente" cls="bg-orange-100 text-orange-800" />
                  )}
                </div>
                <StatusBadge status={post.status as string} />
              </div>

              {Boolean(post.angulo) && (
                <p className="mb-2 text-xs italic text-aline-text/60">
                  ângulo: {post.angulo as string}
                </p>
              )}

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-aline-text/50">
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

function formatDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
