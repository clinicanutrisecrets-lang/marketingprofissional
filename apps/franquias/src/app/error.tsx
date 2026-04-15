"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-muted px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-6xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-bold text-brand-text">Ops, algo deu errado</h1>
        <p className="mb-6 text-sm text-brand-text/60">
          Nosso time já foi notificado. Tenta recarregar ou volta pra home.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="rounded-lg border border-brand-text/10 bg-white px-5 py-2.5 text-sm font-medium text-brand-text hover:border-brand-primary"
          >
            Voltar pro início
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-xs text-brand-text/30">
            Erro: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
