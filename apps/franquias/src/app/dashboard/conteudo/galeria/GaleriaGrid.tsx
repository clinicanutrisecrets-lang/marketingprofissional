"use client";

import { useState } from "react";
import { excluirArteGaleria } from "@/lib/conteudo/actions";

export type ArteGerada = {
  id: string;
  url: string;
  params: { headline?: string; layout?: string; formato?: string } | null;
  criado_em: string;
};

export function GaleriaGrid({ artes: iniciais }: { artes: ArteGerada[] }) {
  const [artes, setArtes] = useState(iniciais);

  async function excluir(id: string) {
    setArtes((a) => a.filter((x) => x.id !== id));
    await excluirArteGaleria(id);
  }

  if (artes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-10 text-center text-brand-text/60">
        Nenhuma arte salva ainda. Crie no editor e clique em “Salvar na galeria”.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {artes.map((a) => (
        <figure key={a.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.params?.headline ?? "Arte"} className="w-full" />
          <figcaption className="flex items-center justify-between gap-2 p-3">
            <span className="truncate text-xs text-brand-text/60">
              {a.params?.headline ?? "Arte"}
            </span>
            <span className="flex shrink-0 gap-2">
              <a
                href={a.url}
                download
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white"
              >
                ⬇️
              </a>
              <button
                onClick={() => void excluir(a.id)}
                className="rounded-lg px-2 py-1 text-xs text-brand-text/40 ring-1 ring-brand-text/15 hover:text-red-600"
                title="Excluir"
              >
                ✕
              </button>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
