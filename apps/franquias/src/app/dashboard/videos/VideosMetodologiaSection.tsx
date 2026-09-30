"use client";

import { useState } from "react";
import {
  VIDEOS_METODOLOGIA,
  roteiroComoTexto,
  tempoRoteiro,
  type VideoMetodologia,
} from "@/lib/videos/metodologia";

/**
 * Vídeos prontos da metodologia: baixar, narrar (ou pôr música), postar e
 * fixar no perfil. Sem marca de ninguém — é o método explicado em vídeo, pra
 * cada profissional usar como dela.
 */
export function VideosMetodologiaSection() {
  return (
    <section id="videos-metodologia" className="mb-8">
      <h2 className="text-xl font-bold text-brand-text">📌 Vídeos prontos da metodologia</h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
        Três vídeos pra você postar como seus e deixar fixados no perfil. Sem
        marca de ninguém. Os que vêm sem voz trazem o roteiro pra você narrar,
        ou é só colocar uma música.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {VIDEOS_METODOLOGIA.map((v) => (
          <CartaoVideo key={v.id} v={v} />
        ))}
      </div>
    </section>
  );
}

function CartaoVideo({ v }: { v: VideoMetodologia }) {
  const [copiado, setCopiado] = useState<"" | "legenda" | "roteiro">("");

  async function copiar(texto: string, qual: "legenda" | "roteiro") {
    try {
      // `navigator.clipboard` é undefined fora de contexto seguro.
      await navigator.clipboard?.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      // clipboard bloqueado: o texto continua visível pra copiar à mão
    }
  }

  const teleprompter = `/dashboard/teleprompter?texto=${encodeURIComponent(roteiroComoTexto(v, false))}`;

  return (
    <article className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
      <video
        src={v.arquivo}
        poster={v.poster}
        controls
        playsInline
        preload="none"
        className="aspect-[9/16] w-full rounded-xl bg-black object-cover"
      />
      <h3 className="mt-3 font-bold text-brand-text">{v.titulo}</h3>
      <p className="mt-1 text-xs text-brand-text/50">
        {tempoRoteiro(v.duracaoSeg)} · {v.temVoz ? "já narrado" : "sem voz"}
      </p>
      <p className="mt-2 text-sm text-brand-text/70">{v.resumo}</p>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-brand-text/70">
        {v.comoUsar.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={v.arquivo}
          download
          className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white"
        >
          Baixar vídeo
        </a>
        <button
          type="button"
          onClick={() => copiar(v.legenda, "legenda")}
          className="rounded-lg border border-brand-primary px-3 py-2 text-sm font-semibold text-brand-primary"
        >
          {copiado === "legenda" ? "Legenda copiada ✓" : "Copiar legenda"}
        </button>
      </div>

      <details className="mt-3 rounded-lg bg-brand-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-text">
          {v.temVoz ? "Roteiro (pra gravar com a sua voz)" : "Roteiro pra narrar"}
        </summary>
        <div className="mt-2 space-y-3">
          {v.roteiro.map((t) => (
            <p key={t.de} className="text-brand-text/80">
              <span className="mr-1 font-mono text-xs text-brand-text/50">
                {tempoRoteiro(t.de)} a {tempoRoteiro(t.ate)}
              </span>
              {t.texto}
            </p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copiar(roteiroComoTexto(v), "roteiro")}
            className="rounded-lg border border-brand-text/20 px-3 py-1.5 text-xs font-semibold text-brand-text"
          >
            {copiado === "roteiro" ? "Roteiro copiado ✓" : "Copiar roteiro"}
          </button>
          <a
            href={teleprompter}
            className="rounded-lg border border-brand-text/20 px-3 py-1.5 text-xs font-semibold text-brand-text"
          >
            Ler no teleprompter
          </a>
        </div>
      </details>

      <details className="mt-2 rounded-lg bg-brand-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-text">Legenda sugerida</summary>
        <p className="mt-2 whitespace-pre-line text-brand-text/80">{v.legenda}</p>
      </details>
    </article>
  );
}
