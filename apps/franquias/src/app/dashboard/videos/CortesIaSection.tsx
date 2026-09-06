"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CorteIa } from "@/lib/corte/actions";

/**
 * Lista das gravações enviadas pra edição automática (teste fechado — só
 * aparece pra quem está em CORTE_IA_EMAILS). Enquanto houver corte em
 * andamento, a página se atualiza sozinha a cada 20 s.
 */

/** Worker passou muito do prazo (~5 min): mostrar como falha, não como espera. */
const LIMITE_MS = 25 * 60 * 1000;
function travou(c: CorteIa): boolean {
  if (c.status !== "enviado" && c.status !== "processando") return false;
  const t = new Date(c.criado_em).getTime();
  return Number.isFinite(t) && Date.now() - t > LIMITE_MS;
}

const ETAPA: Record<string, string> = {
  transcrevendo: "🎧 transcrevendo",
  planejando: "🧠 planejando cortes e legendas",
  renderizando: "🎞️ renderizando",
};

export function CortesIaSection({ cortes }: { cortes: CorteIa[] }) {
  const router = useRouter();
  const emAndamento = cortes.some(
    (c) => (c.status === "enviado" || c.status === "processando") && !travou(c),
  );

  useEffect(() => {
    if (!emAndamento) return;
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [emAndamento, router]);

  return (
    <section id="cortes-ia" className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">
            ✨ Cortes com IA{" "}
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              teste
            </span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
            Grave até 1 minuto no teleprompter e clique em &quot;Editar com IA&quot;: a
            gravação volta em 9:16 com legendas dinâmicas, palavra-chave por
            trecho e b-roll da sua biblioteca. Pronto em uns 3 a 5 minutos.
          </p>
        </div>
        <Link
          href="/dashboard/teleprompter"
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          🎥 Gravar agora
        </Link>
      </div>

      {cortes.length === 0 ? (
        <p className="mt-4 text-sm text-brand-text/50">Nenhuma gravação enviada ainda.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {cortes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-muted/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-brand-text">{c.tema}</p>
                <p className="text-xs text-brand-text/50">
                  {c.duracao_seg ? `${Math.round(Number(c.duracao_seg))}s · ` : ""}
                  {new Date(c.criado_em).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {c.status === "pronto" && c.url ? (
                <div className="flex items-center gap-2">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-text ring-1 ring-brand-text/10"
                  >
                    ▶️ Ver
                  </a>
                  <a
                    href={c.url}
                    download
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white"
                  >
                    ⬇️ Baixar MP4
                  </a>
                </div>
              ) : c.status === "erro" ? (
                <span
                  title={c.erro_msg ?? undefined}
                  className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                >
                  erro — grave de novo{c.erro_msg ? ` (${c.erro_msg.slice(0, 60)})` : ""}
                </span>
              ) : travou(c) ? (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  não ficou pronto — grave de novo
                </span>
              ) : (
                <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {ETAPA[c.etapa ?? ""] ?? "⏳ na fila"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
