"use client";

import { useState } from "react";
import Link from "next/link";
import { Teleprompter } from "../conteudo/reel/[id]/Teleprompter";

const EXEMPLO = `Você sabia que a resposta do seu corpo à comida está escrita nos seus genes?

Duas pessoas comem exatamente a mesma coisa — uma inflama, a outra não.

Isso não é sorte. É genética e microbiota.

E dá pra investigar isso com precisão.

Quer descobrir o que o seu corpo está tentando te dizer? Me chama no direct!`;

export default function TeleprompterAvulsoPage() {
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState(false);

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
        href="/dashboard"
        className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
      >
        ← Voltar
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-brand-text">🎥 Teleprompter</h1>
        <p className="mt-1 max-w-xl text-sm text-brand-text/60">
          Cole ou escreva o roteiro abaixo e grave lendo direto da tela — o
          texto rola sozinho enquanto a câmera te filma. Baixe o vídeo e poste
          como reel.
        </p>
      </header>

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
        <p className="mt-3 text-xs text-brand-text/50">
          💡 Dica: os roteiros prontos da semana (com pauta e legenda) ficam no{" "}
          <Link href="/dashboard/conteudo" className="text-brand-primary underline">
            Estúdio de conteúdo
          </Link>{" "}
          — cards com a etiqueta <strong>REEL</strong>.
        </p>
      </div>
    </main>
  );
}
