"use client";

import Link from "next/link";
import type { EstrategiaLida } from "@/lib/aprovacao/estrategia";

/**
 * O guia da semana no topo de Aprovar semana: o foco da semana e o que cada
 * post faz no caminho até o teste. Curto de propósito
 * (Aline: "não com textão"); o detalhe de cada post fica no próprio card.
 */
export function GuiaDaSemana({ estrategia }: { estrategia: EstrategiaLida }) {
  return (
    <section className="mb-6 rounded-2xl border border-brand-primary/20 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
        Estratégia da semana
      </div>
      <h2 className="mt-1 text-xl font-bold text-brand-text">{estrategia.titulo}</h2>
      {estrategia.frase && <p className="mt-1 text-sm text-brand-text/70">{estrategia.frase}</p>}
      {estrategia.passos.length > 0 && (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {estrategia.passos.map((p, i) => (
            <li key={`${i}-${p}`} className="rounded-lg bg-brand-muted px-3 py-2 text-xs text-brand-text/80">
              <span className="mr-1 font-bold text-brand-primary">{i + 1}.</span>
              {p}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-brand-text/60">
        Toda semana tem um post pra cada ponto do caminho até o teste, de quem acabou de
        chegar a quem já quer começar. Cada post abaixo diz o papel dele. Quer outro assunto?{" "}
        <Link href="/dashboard/briefings" className="font-semibold text-brand-primary underline">
          Pedir conteúdo
        </Link>
        .
      </p>
    </section>
  );
}
