"use client";

import { useState, useTransition } from "react";
import { gerarReelAnimadoAction, type DuracaoReel } from "@/lib/conteudo/reel-actions";

export type ReelAnimado = {
  id: string;
  tema: string;
  duracao: string;
  status: "gerando" | "pronto" | "erro";
  url: string | null;
  criado_em: string;
};

/** Render passou MUITO do prazo (~10 min): tratar como falha, não como espera. */
const LIMITE_RENDER_MS = 40 * 60 * 1000;
function travou(r: ReelAnimado): boolean {
  if (r.status !== "gerando") return false;
  const t = new Date(r.criado_em).getTime();
  return Number.isFinite(t) && Date.now() - t > LIMITE_RENDER_MS;
}

export function ReelAnimadoSection({ reels }: { reels: ReelAnimado[] }) {
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState<DuracaoReel>("60s");
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
          onChange={(e) => setDuracao(e.target.value as DuracaoReel)}
          className="rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
        >
          {/* Teto de 1min30 (Juliana, 01/09/2026): o motor corta as cenas
              excedentes do fim, então não existe opção acima de 90s. */}
          <option value="30s">~30 segundos</option>
          <option value="60s">~60 segundos</option>
          <option value="90s">~90 segundos (máximo)</option>
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
              ) : travou(r) ? (
                // 🔴 "renderizando" eterno é pior que erro: a nutri fica
                // esperando algo que não vem. Quando o worker nem chega a
                // rodar (ex.: a conta do GitHub travada por cobrança), ninguém
                // marca 'erro' no banco — o registro fica em 'gerando' pra
                // sempre. Passou muito do prazo, a tela assume a falha.
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                  não ficou pronto — gere de novo
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
