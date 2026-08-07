"use client";

import { useState, useTransition } from "react";
import { gerarReelAnimadoAction } from "@/lib/conteudo/reel-actions";

export type ReelAnimado = {
  id: string;
  tema: string;
  duracao: string;
  status: "gerando" | "pronto" | "erro";
  url: string | null;
  criado_em: string;
};

export function ReelAnimadoSection({ reels }: { reels: ReelAnimado[] }) {
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState<"30s" | "60s">("60s");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-brand-text">🎬 Reels animados</h2>
      <p className="mt-1 text-sm text-brand-text/60">
        Vídeo 9:16 animado no estilo Detetive da Saúde: sintomas, genes,
        alimentos e exames — gerado do zero pra sua marca. Pronto em ~10 min.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          maxLength={120}
          placeholder="Tema — ex.: menopausa, SOP, intestino irritável..."
          className="min-w-56 flex-1 rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
        />
        <select
          value={duracao}
          onChange={(e) => setDuracao(e.target.value as "30s" | "60s")}
          className="rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
        >
          <option value="30s">~30 segundos</option>
          <option value="60s">~60 segundos</option>
        </select>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMsg(null);
              const r = await gerarReelAnimadoAction(tema, duracao);
              setMsg(r.msg);
              if (r.ok) setTema("");
            })
          }
          className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Escrevendo roteiro..." : "🎬 Gerar reel"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-brand-text/60">{msg}</p>}

      {reels.length > 0 && (
        <ul className="mt-5 space-y-2">
          {reels.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-muted/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-brand-text">{r.tema}</p>
                <p className="text-xs text-brand-text/50">
                  {r.duracao} ·{" "}
                  {new Date(r.criado_em).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
              {r.status === "pronto" && r.url ? (
                <a
                  href={r.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white"
                >
                  ⬇️ Baixar MP4
                </a>
              ) : r.status === "erro" ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  erro — tente de novo
                </span>
              ) : (
                <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  🎞️ renderizando (~10 min)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
