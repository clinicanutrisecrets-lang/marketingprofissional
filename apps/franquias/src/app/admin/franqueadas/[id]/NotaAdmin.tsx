"use client";

import { useState, useTransition } from "react";
import { salvarNotaInterna } from "@/lib/admin/actions";

export function NotaAdmin({
  franqueadaId,
  notaInicial,
}: {
  franqueadaId: string;
  notaInicial: string;
}) {
  const [nota, setNota] = useState(notaInicial);
  const [salvando, setSalvando] = useState(false);
  const [, startTransition] = useTransition();

  function salvar() {
    setSalvando(true);
    startTransition(async () => {
      await salvarNotaInterna(franqueadaId, nota);
      setSalvando(false);
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold">📝 Nota interna (admin)</h3>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={salvar}
        placeholder="Anotações, contexto, follow-ups..."
        rows={4}
        className="w-full rounded-lg border border-brand-text/10 px-3 py-2 text-xs"
      />
      {salvando && (
        <div className="mt-1 text-xs text-brand-text/50">Salvando...</div>
      )}
    </div>
  );
}
