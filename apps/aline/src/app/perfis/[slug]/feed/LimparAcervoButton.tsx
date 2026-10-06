"use client";

import { useState } from "react";
import { limparAcervoAntigo } from "@/lib/feed/actions";

export function LimparAcervoButton({ perfilId, quantos }: { perfilId: string; quantos: number }) {
  const [estado, setEstado] = useState<"parado" | "indo" | "feito" | "erro">("parado");
  const [msg, setMsg] = useState("");

  if (quantos === 0) return null;

  async function limpar() {
    // 🔴 Apagar não tem volta: confirma antes, dizendo quantos e o que sobra.
    const ok = window.confirm(
      `Apagar ${quantos} ${quantos === 1 ? "post antigo" : "posts antigos"} que nunca foram ao ar?\n\n` +
        `O que já foi publicado não é tocado. Não dá pra desfazer por aqui.`,
    );
    if (!ok) return;
    setEstado("indo");
    const r = await limparAcervoAntigo(perfilId);
    if (r.ok) {
      setEstado("feito");
      setMsg(`${r.apagados} ${r.apagados === 1 ? "post apagado" : "posts apagados"}.`);
      window.location.reload();
    } else {
      setEstado("erro");
      setMsg(r.erro ?? "não deu certo");
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-900">
        <strong>{quantos}</strong> {quantos === 1 ? "post antigo" : "posts antigos"} de antes de 6 de outubro,
        que nunca foram ao ar e seguem esperando aprovação. É o que entope a tela e some com o planejamento novo.
      </p>
      <button
        onClick={limpar}
        disabled={estado === "indo"}
        className="mt-3 rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {estado === "indo" ? "Apagando…" : "Apagar e começar limpo"}
      </button>
      {msg && (
        <p className={`mt-2 text-sm ${estado === "erro" ? "text-rose-700" : "text-amber-900"}`}>{msg}</p>
      )}
    </div>
  );
}
