"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A arte do post na tela de aprovação, slide a slide (Juliana e Viviane,
 * 13/10/2026: "carrossel a gente não consegue passar pro lado e ver o que tem
 * escrito"). Antes o card mostrava só a capa e uma fileira de miniaturas que
 * não abriam nada: pra ler o slide 4 era preciso baixar.
 *
 * Setas, toque pro lado e clique na miniatura trocam o slide; clicar na arte
 * abre em tela cheia, sem corte (story é 9:16 e o card é quadrado).
 */
export function VisorArtes({ artes, story }: { artes: string[]; story?: boolean }) {
  const [i, setI] = useState(0);
  const [cheia, setCheia] = useState(false);
  const toque = useRef<number | null>(null);
  const total = artes.length;
  const atual = Math.min(i, Math.max(total - 1, 0));
  const varios = total > 1;

  const ir = (d: number) => setI((v) => (Math.min(v, total - 1) + d + total) % total);

  useEffect(() => {
    if (!cheia) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCheia(false);
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheia, total]);

  if (!total) return null;

  const arrastar = {
    onTouchStart: (e: React.TouchEvent) => {
      toque.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const ini = toque.current;
      toque.current = null;
      const fim = e.changedTouches[0]?.clientX;
      if (ini == null || fim == null || !varios) return;
      if (Math.abs(fim - ini) > 40) ir(fim < ini ? 1 : -1);
    },
  };

  const seta = (lado: "esq" | "dir", grande?: boolean) => (
    <button
      type="button"
      aria-label={lado === "esq" ? "Slide anterior" : "Próximo slide"}
      onClick={(e) => {
        e.stopPropagation();
        ir(lado === "esq" ? -1 : 1);
      }}
      className={`absolute top-1/2 -translate-y-1/2 ${lado === "esq" ? "left-2" : "right-2"} flex items-center justify-center rounded-full bg-black/55 font-bold text-white hover:bg-black/75 ${grande ? "h-12 w-12 text-2xl" : "h-8 w-8 text-lg"}`}
    >
      {lado === "esq" ? "‹" : "›"}
    </button>
  );

  return (
    <>
      <div className="relative bg-brand-muted" {...arrastar}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artes[atual]}
          alt={varios ? `Slide ${atual + 1} de ${total}` : "Criativo"}
          onClick={() => setCheia(true)}
          title="Clique pra ver em tela cheia"
          className={`w-full cursor-zoom-in ${story ? "aspect-square object-contain" : "aspect-square object-cover"}`}
        />
        {varios && (
          <>
            {seta("esq")}
            {seta("dir")}
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              {atual + 1}/{total}
            </span>
          </>
        )}
      </div>
      {varios && (
        <div className="flex gap-1 overflow-x-auto bg-brand-muted p-1">
          {artes.map((u, n) => (
            <button
              key={u}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Ver slide ${n + 1}`}
              className={`flex-none rounded ${n === atual ? "ring-2 ring-brand-primary" : "opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Slide ${n + 1}`} className="h-14 w-11 rounded object-cover" />
            </button>
          ))}
        </div>
      )}

      {cheia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setCheia(false)}
          {...arrastar}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artes[atual]}
            alt={varios ? `Slide ${atual + 1} de ${total}` : "Criativo"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          {varios && (
            <>
              {seta("esq", true)}
              {seta("dir", true)}
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">
                {atual + 1} de {total}
              </span>
            </>
          )}
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setCheia(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
