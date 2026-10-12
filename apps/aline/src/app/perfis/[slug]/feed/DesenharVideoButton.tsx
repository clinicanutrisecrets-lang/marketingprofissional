"use client";

import { useState } from "react";
import { desenharVideoDoPost } from "@/lib/reel-animado/actions";

/**
 * Botão "Desenhar vídeo" no card de reel do feed: o reel animado do
 * Avançado (personagem com o sintoma circulado, gene, alimentos desenhados),
 * a partir da legenda do post. Sem avatar. Leva uns 10 minutos.
 */
export function DesenharVideoButton({
  postId,
  emProducao,
  temVideo,
}: {
  postId: string;
  emProducao: boolean;
  temVideo: boolean;
}) {
  const [estado, setEstado] = useState<"parado" | "indo" | "pedido" | "erro">(emProducao ? "pedido" : "parado");
  const [msg, setMsg] = useState("");

  async function desenhar(e: React.MouseEvent) {
    e.preventDefault();
    if (temVideo && !window.confirm("Este post já tem vídeo. Desenhar um novo no lugar dele?")) return;
    setEstado("indo");
    const r = await desenharVideoDoPost({ postId });
    if (r.ok) {
      setEstado("pedido");
    } else {
      setEstado("erro");
      setMsg(r.erro);
    }
  }

  if (estado === "pedido") {
    return (
      <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
        desenhando, uns 10 min
      </span>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        onClick={desenhar}
        disabled={estado === "indo"}
        title="Desenha o vídeo a partir da legenda: personagem, sintoma circulado, gene e alimentos. Sem avatar."
        className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-800 hover:bg-white disabled:opacity-60"
      >
        {estado === "indo" ? "pedindo…" : temVideo ? "Desenhar de novo" : "Desenhar vídeo"}
      </button>
      {estado === "erro" && (
        <span className="max-w-[10rem] rounded bg-rose-50 px-1.5 py-0.5 text-[10px] leading-tight text-rose-800">{msg}</span>
      )}
    </span>
  );
}
