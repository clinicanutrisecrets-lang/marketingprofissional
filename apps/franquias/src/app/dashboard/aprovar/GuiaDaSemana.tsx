"use client";

import Link from "next/link";
import type { EstrategiaLida } from "@/lib/aprovacao/estrategia";

/**
 * O guia da semana no topo de Aprovar semana: em que ponto da jornada até o
 * teste ela está e o que os posts desta semana fazem. Curto de propósito
 * (Aline: "não com textão"); o detalhe de cada post fica no próprio card.
 */
export function GuiaDaSemana({ estrategia }: { estrategia: EstrategiaLida }) {
  const etapas = Array.from({ length: estrategia.total }, (_, i) => i + 1);
  return (
    <section className="mb-6 rounded-2xl border border-brand-primary/20 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
          Estratégia da semana · {estrategia.semana} de {estrategia.total}
        </div>
        <div className="flex gap-1" aria-label={`Semana ${estrategia.semana} de ${estrategia.total}`}>
          {etapas.map((n) => (
            <span
              key={n}
              className={`h-1.5 w-8 rounded-full ${n <= estrategia.semana ? "bg-brand-primary" : "bg-brand-text/10"}`}
            />
          ))}
        </div>
      </div>
      <h2 className="mt-1 text-xl font-bold text-brand-text">{estrategia.titulo}</h2>
      {estrategia.frase && <p className="mt-1 text-sm text-brand-text/70">{estrategia.frase}</p>}
      {estrategia.passos.length > 0 && (
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          {estrategia.passos.map((p, i) => (
            <li key={p} className="rounded-lg bg-brand-muted px-3 py-2 text-xs text-brand-text/80">
              <span className="mr-1 font-bold text-brand-primary">{i + 1}.</span>
              {p}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-brand-text/60">
        A jornada leva quem te segue até pedir o teste, em 4 semanas. Cada post abaixo diz o
        papel dele nela. Quer outro assunto?{" "}
        <Link href="/dashboard/briefings" className="font-semibold text-brand-primary underline">
          Pedir conteúdo
        </Link>
        .
      </p>
    </section>
  );
}
