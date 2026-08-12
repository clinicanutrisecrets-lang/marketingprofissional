"use client";

import { useState } from "react";

export type PostBiblioteca = {
  id: string;
  titulo: string;
  mes_ref: string;
  canva_url: string;
  legenda: string;
  ordem: number;
};

export function PostBibliotecaCard({ post }: { post: PostBiblioteca }) {
  const [copiado, setCopiado] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(post.legenda);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard bloqueado
    }
  }

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary/70">
        Post {post.ordem} · {post.mes_ref}
      </p>
      <h3 className="mb-3 text-sm font-semibold leading-snug text-brand-text">
        {post.titulo}
      </h3>

      <p
        className={`mb-4 whitespace-pre-line text-xs leading-relaxed text-brand-text/70 ${aberto ? "" : "line-clamp-4"}`}
      >
        {post.legenda}
      </p>
      {post.legenda.length > 180 && (
        <button
          onClick={() => setAberto((a) => !a)}
          className="mb-3 self-start text-[11px] text-brand-primary underline"
        >
          {aberto ? "ver menos" : "ver legenda completa"}
        </button>
      )}

      {/* 🔴 Aqui NÃO entra o "Personalizar aqui" (link pro editor de arte).
          Ele existia e levava a nutri pro editor com o título na URL — mas o
          editor abre em branco, então ela clicava e não achava nada. Dois
          caminhos pro mesmo post confundem; o post pronto é um MODELO DO CANVA,
          e o Canva é o único lugar onde ele de fato se personaliza.
          (Juliana testando, 12/08: "leva pro editor mas lá não aparece nada".)
          Quem quer criar arte do zero usa o Editor de arte pelo menu. */}
      <div className="mt-auto flex flex-wrap gap-2">
        <a
          href={post.canva_url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          title="Abrir o modelo no Canva pra trocar a logo e baixar"
        >
          🎨 Editar no Canva ↗
        </a>
        <button
          onClick={copiar}
          className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
        >
          {copiado ? "✓ Copiada!" : "📋 Copiar legenda"}
        </button>
      </div>
    </article>
  );
}
