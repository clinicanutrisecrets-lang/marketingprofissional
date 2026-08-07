"use client";

import { useState, useTransition } from "react";
import { gerarSugestoesAction } from "@/lib/conteudo/actions";

export function GerarSugestoesButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const r = await gerarSugestoesAction();
            setMsg(r.msg);
          })
        }
        className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Gerando (30s a 1min)..." : "✨ Gerar sugestões da semana"}
      </button>
      {msg && <p className="text-xs text-brand-text/60">{msg}</p>}
    </div>
  );
}
