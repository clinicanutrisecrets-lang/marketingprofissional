"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aprovarCriativo } from "./actions";

export function AprovarVariacaoButton({
  anuncioId,
  variacaoIdx,
  disabled,
}: {
  anuncioId: string;
  variacaoIdx: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErro(null);
    const r = await aprovarCriativo(anuncioId, variacaoIdx);
    if (r.ok) {
      router.push("/dashboard/anuncios");
    } else {
      setErro(r.erro ?? "Erro ao aprovar");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-50"
      >
        {loading ? "Aprovando..." : "✅ Selecionar esta variação"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
