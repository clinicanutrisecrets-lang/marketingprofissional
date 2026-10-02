"use client";

import { useEffect, useState } from "react";

const CHAVE = "mp_guia_aberto_v1";

/**
 * O guia do Estúdio no painel, só até ela abrir uma vez (Aline, 02/10/2026:
 * painel mais limpo). Lembrado no aparelho; sem armazenamento (modo privado),
 * o cartão simplesmente continua aparecendo.
 */
export function GuiaPrimeiraVez() {
  const [visivel, setVisivel] = useState(true);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CHAVE)) setVisivel(false);
    } catch {
      /* sem armazenamento: segue visível */
    }
  }, []);
  if (!visivel) return null;
  return (
    <a
      href="https://scannerdasaude.com/guia-estudio-conteudo.pdf"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        try {
          window.localStorage.setItem(CHAVE, "1");
        } catch {
          /* ok */
        }
        setTimeout(() => setVisivel(false), 300);
      }}
      className="mb-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-primary/40 bg-white p-4 transition hover:border-brand-primary hover:bg-brand-primary/5"
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-xl">
        📘
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-brand-text">Primeira vez aqui? Comece pelo guia</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-brand-text/60">
          Como o seu conteúdo é criado toda semana e o que fazer com o pacote. 7 páginas.
        </span>
      </span>
      <span className="flex-shrink-0 rounded-lg bg-brand-primary/10 px-3 py-2 text-[13px] font-semibold text-brand-primary">
        Abrir guia →
      </span>
    </a>
  );
}
