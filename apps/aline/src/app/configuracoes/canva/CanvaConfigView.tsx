"use client";

import Link from "next/link";
import { useTransition } from "react";

type Status = {
  conectado: boolean;
  canva_user_email: string | null;
  conectado_em: string | null;
  expira_em: string | null;
  scopes_concedidos: string[] | null;
} | null;

type Design = Record<string, unknown>;

export default function CanvaConfigView({
  status,
  designs,
  flash,
}: {
  status: Status;
  designs: Design[];
  flash: { ok: boolean; erro: string | null };
}) {
  const [pending, startTransition] = useTransition();
  const conectado = !!status?.conectado;

  function desconectar() {
    if (!confirm("Tem certeza que quer desconectar a conta Canva? O pipeline cai pro fallback Gemini.")) return;
    startTransition(async () => {
      const r = await fetch("/api/canva/disconnect", { method: "POST" });
      if (r.ok) window.location.reload();
      else alert("Erro ao desconectar");
    });
  }

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Dashboard
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-aline-text">Integração Canva</h1>
          <p className="mt-2 text-aline-text/70">
            Quando conectado, o pipeline duplica designs do seu pool, edita texto +
            foto hero e exporta PNG. Sem Canva, cai automaticamente no fallback
            Gemini/Sharp.
          </p>
        </header>

        {flash.ok && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Canva conectado com sucesso!
          </div>
        )}
        {flash.erro && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            Falha na conexão: {flash.erro}
          </div>
        )}

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Status da conexão</h2>

          {conectado ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                <span className="font-medium text-green-700">Conectado</span>
              </div>
              {status?.canva_user_email && (
                <div className="text-aline-text/70">
                  Conta: <strong>{status.canva_user_email}</strong>
                </div>
              )}
              {status?.conectado_em && (
                <div className="text-aline-text/60">
                  Desde:{" "}
                  {new Date(status.conectado_em).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              )}
              {status?.expira_em && (
                <div className="text-aline-text/60">
                  Token expira:{" "}
                  {new Date(status.expira_em).toLocaleString("pt-BR")} (auto-refresh ativo)
                </div>
              )}
              {status?.scopes_concedidos && status.scopes_concedidos.length > 0 && (
                <div className="text-xs text-aline-text/50">
                  Scopes: {status.scopes_concedidos.join(", ")}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={desconectar}
                  disabled={pending}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {pending ? "Desconectando..." : "Desconectar"}
                </button>
                <a
                  href="/api/canva/connect"
                  className="rounded-lg border border-aline-text/10 px-4 py-2 text-sm hover:border-aline-scanner"
                >
                  Reconectar
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="font-medium text-amber-700">Não conectado</span>
              </div>
              <p className="text-aline-text/60">
                Sem conexão Canva, o pipeline usa Gemini (fallback). Pra ativar designs
                do pool Scanner 2.0, clique abaixo.
              </p>
              <a
                href="/api/canva/connect"
                className="inline-block rounded-lg bg-aline-scanner px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Conectar Canva →
              </a>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">
            Pool de designs ({designs.length})
          </h2>
          <p className="mb-4 text-sm text-aline-text/60">
            Designs disponíveis pra duplicate-and-edit. O selector escolhe baseado em
            tipo + tags do post + LRU.
          </p>

          {designs.length === 0 ? (
            <div className="rounded-lg bg-aline-bg p-4 text-sm text-aline-text/50">
              Pool vazio. Rode a migration 008 ou adicione designs.
            </div>
          ) : (
            <div className="space-y-2">
              {designs.map((d, i) => (
                <DesignRow key={(d.id as string) ?? i} design={d} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function DesignRow({ design }: { design: Design }) {
  const tipo = (design.tipo as string) ?? "—";
  const tags = (design.tags as string[]) ?? [];
  const designId = (design.design_id as string) ?? "—";
  const descricao = (design.descricao as string) ?? "—";
  const ativo = (design.ativo as boolean) ?? false;
  const usoCount = (design.uso_count as number) ?? 0;
  const ultimoUso = design.ultimo_uso as string | null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-aline-text/5 p-3">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <code className="rounded bg-aline-bg px-2 py-0.5 text-xs">{designId}</code>
          <span className="text-xs uppercase tracking-wider text-aline-text/50">
            {tipo}
          </span>
          {!ativo && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              inativo
            </span>
          )}
        </div>
        <div className="text-sm text-aline-text">{descricao}</div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-aline-bg px-2 py-0.5 text-xs text-aline-text/60"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="text-right text-xs text-aline-text/40">
        <div>Usos: {usoCount}</div>
        {ultimoUso && (
          <div>
            Último: {new Date(ultimoUso).toLocaleDateString("pt-BR")}
          </div>
        )}
      </div>
    </div>
  );
}
