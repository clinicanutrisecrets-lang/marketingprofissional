"use client";

import { useState } from "react";
import Link from "next/link";
import { Teleprompter } from "../conteudo/reel/[id]/Teleprompter";

export type RoteiroSemana = {
  id: string;
  tema: string;
  hook: string;
  duracao: number;
  gravado: boolean;
};

const EXEMPLO = `Você sabia que a resposta do seu corpo à comida está escrita nos seus genes?

Duas pessoas comem exatamente a mesma coisa — uma inflama, a outra não.

Isso não é sorte. É genética e microbiota.

E dá pra investigar isso com precisão.

Quer descobrir o que o seu corpo está tentando te dizer? Me chama no direct!`;

export function TeleprompterHub({ roteiros }: { roteiros: RoteiroSemana[] }) {
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);
  const [modo, setModo] = useState<"semana" | "livre">(roteiros.length ? "semana" : "livre");

  if (gravando) {
    return (
      <Teleprompter
        sugestaoId=""
        tema="Roteiro livre"
        texto={texto}
        dicas={["Grave na vertical", "Luz de frente (janela ou ring light)", "Fale como se fosse pra uma amiga"]}
        legenda=""
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl py-6 lg:py-10 lg:pl-6">
      <Link
        href="/dashboard/videos"
        className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
      >
        ← Voltar pra Vídeos
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-brand-text">🎥 Teleprompter</h1>
        <p className="mt-1 max-w-xl text-sm text-brand-text/60">
          O texto rola na tela enquanto a câmera te filma. Escolha um roteiro
          pronto da semana ou cole o seu.
        </p>
      </header>

      {/* Alternância entre os dois modos */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setModo("semana")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            modo === "semana"
              ? "bg-brand-primary text-white"
              : "bg-white text-brand-text/70 ring-1 ring-brand-text/15"
          }`}
        >
          ✨ Roteiros da semana ({roteiros.length})
        </button>
        <button
          onClick={() => setModo("livre")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${
            modo === "livre"
              ? "bg-brand-primary text-white"
              : "bg-white text-brand-text/70 ring-1 ring-brand-text/15"
          }`}
        >
          ✏️ Colar meu texto
        </button>
      </div>

      {modo === "semana" ? (
        roteiros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-8 text-center">
            <p className="text-sm text-brand-text/60">
              Nenhum roteiro gerado ainda. Os roteiros são criados junto com as
              sugestões da semana, com pauta do seu nicho.
            </p>
            <Link
              href="/dashboard/conteudo"
              className="mt-4 inline-block rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              ✨ Gerar sugestões da semana
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {roteiros.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text">
                      {r.tema}
                      {r.gravado && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          ✓ já gravado
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-xs text-brand-text/60">
                      🎬 “{r.hook}” · ~{r.duracao}s
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/conteudo/reel/${r.id}`}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    🎥 Gravar este
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/60">
            Seu roteiro
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            maxLength={4000}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder={EXEMPLO}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => texto.trim() && setGravando(true)}
              disabled={!texto.trim()}
              className="rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
            >
              🎬 Abrir teleprompter e gravar
            </button>
            <button
              onClick={() => setTexto(EXEMPLO)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-brand-primary ring-1 ring-brand-primary/30 hover:bg-brand-primary/5"
            >
              Usar roteiro de exemplo
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
