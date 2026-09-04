"use client";

import { useState } from "react";
import type { PostBibliotecaRow } from "@/lib/biblioteca/gate";

export type PostBiblioteca = PostBibliotecaRow;

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

  const arquivo = post.imagem_url?.split("/").pop() ?? "post.jpg";

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-primary/70">
        Post {post.ordem} · {post.colecao ? post.colecao : post.mes_ref}
        {post.formato === "story" && " · story 9:16"}
      </p>
      <h3 className="mb-3 text-sm font-semibold leading-snug text-brand-text">
        {post.titulo}
      </h3>

      {post.imagem_url && (
        // Arte pronta: a nutri precisa VER antes de baixar. Story é 9:16 —
        // moldura de feed cortaria o texto de cima e o CTA de baixo.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imagem_url}
          alt={post.titulo}
          className={`mb-3 w-full rounded-xl object-cover ${
            post.formato === "story" ? "aspect-[9/16]" : "aspect-[4/5]"
          }`}
          loading="lazy"
        />
      )}

      {post.observacao && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          ⚠️ {post.observacao}
        </p>
      )}

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
        {post.imagem_url && (
          <a
            href={post.imagem_url}
            download={arquivo}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            title="Baixar a arte pronta pra postar"
          >
            ⬇️ Baixar a arte
          </a>
        )}
        {post.canva_url && (
          <a
            href={post.canva_url}
            target="_blank"
            rel="noreferrer"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              post.imagem_url
                ? "bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20"
                : "bg-brand-primary text-white hover:opacity-90"
            }`}
            title="Abrir o modelo no Canva pra trocar a logo e baixar"
          >
            🎨 Editar no Canva ↗
          </a>
        )}
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
