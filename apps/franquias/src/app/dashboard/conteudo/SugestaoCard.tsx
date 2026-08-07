"use client";

import { useState } from "react";
import Link from "next/link";
import { marcarStatusSugestao } from "@/lib/conteudo/actions";

export type Sugestao = {
  id: string;
  semana_ref: string;
  ordem: number;
  tipo: "feed_imagem" | "feed_carrossel" | "reel";
  tema: string;
  gatilho_pauta: string | null;
  copy_legenda: string;
  hashtags: string[] | null;
  roteiro: {
    hook: string;
    blocos: string[];
    cta: string;
    duracao_s?: number;
    dicas?: string[];
    teleprompter?: string;
  } | null;
  artes: Array<{ url: string; slide: number }> | null;
  status: string;
};

const LABEL_TIPO: Record<Sugestao["tipo"], { label: string; cor: string }> = {
  feed_imagem: { label: "POST", cor: "bg-emerald-600" },
  feed_carrossel: { label: "CARROSSEL", cor: "bg-indigo-600" },
  reel: { label: "REEL", cor: "bg-rose-600" },
};

export function SugestaoCard({ sugestao: s }: { sugestao: Sugestao }) {
  const [copiado, setCopiado] = useState(false);
  const artes = s.artes ?? [];
  const t = LABEL_TIPO[s.tipo];

  const legendaCompleta = [
    s.copy_legenda,
    (s.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  async function copiarLegenda() {
    try {
      await navigator.clipboard.writeText(legendaCompleta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard bloqueado — usuário pode selecionar manualmente
    }
  }

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white ${t.cor}`}>
          {t.label}
        </span>
        <h3 className="flex-1 text-sm font-semibold text-brand-text">{s.tema}</h3>
        {s.status !== "sugerido" && (
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] text-brand-text/60">
            {s.status}
          </span>
        )}
      </div>

      {s.gatilho_pauta && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          🔥 <strong>Por que agora:</strong> {s.gatilho_pauta}
        </p>
      )}

      {artes.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {artes.map((a) => (
            <a
              key={a.slide}
              href={a.url}
              download={`arte-${s.tipo}-${a.slide}.png`}
              target="_blank"
              rel="noreferrer"
              title={`Baixar slide ${a.slide}`}
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={`Arte ${a.slide}`}
                className="h-36 w-36 rounded-lg object-cover ring-1 ring-black/5 transition hover:ring-brand-primary"
              />
            </a>
          ))}
        </div>
      )}

      {s.tipo === "reel" && s.roteiro && (
        <div className="mb-3 rounded-lg bg-brand-muted/60 px-3 py-2 text-xs text-brand-text/80">
          <p className="font-semibold">🎬 Hook: “{s.roteiro.hook}”</p>
          <p className="mt-1 text-brand-text/60">
            {s.roteiro.blocos.length} blocos · ~{s.roteiro.duracao_s ?? 45}s
          </p>
        </div>
      )}

      <p className="mb-4 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-brand-text/70">
        {s.copy_legenda}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          onClick={copiarLegenda}
          className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
        >
          {copiado ? "✓ Copiado!" : "📋 Copiar legenda"}
        </button>

        {artes.length > 0 && (
          <a
            href={artes[0]!.url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={() => void marcarStatusSugestao(s.id, "baixado")}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            ⬇️ Baixar arte{artes.length > 1 ? `s (${artes.length})` : ""}
          </a>
        )}

        {s.tipo === "reel" && (
          <Link
            href={`/dashboard/conteudo/reel/${s.id}`}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            🎥 Gravar com teleprompter
          </Link>
        )}

        <button
          onClick={() => void marcarStatusSugestao(s.id, "descartado")}
          className="ml-auto rounded-lg px-2 py-1.5 text-xs text-brand-text/40 hover:text-red-600"
          title="Descartar sugestão"
        >
          ✕
        </button>
      </div>
    </article>
  );
}
