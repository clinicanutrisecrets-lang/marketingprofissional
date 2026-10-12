"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { montarArteDoPost } from "@/lib/arte-post/actions";

/**
 * Botão que monta a arte do carrossel com a curadoria do Scanner, no molde dos
 * sete passos e nas cores do perfil. Leva perto de um minuto por post.
 */
export function MontarArteButton({ postId, temArte }: { postId: string; temArte: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"parado" | "indo" | "ok" | "erro">("parado");
  const [msg, setMsg] = useState("");

  async function montar() {
    if (temArte && !window.confirm("Este post já tem arte. Montar de novo no lugar dela?")) return;
    setEstado("indo");
    setMsg("");
    const r = await montarArteDoPost(postId);
    if (r.ok) {
      setEstado("ok");
      setMsg(`${r.slides} slides prontos${r.comFoto ? ", com a foto da receita na capa" : ""}.`);
      router.refresh();
    } else {
      setEstado("erro");
      setMsg(r.erro);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={montar}
        disabled={estado === "indo"}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {estado === "indo" ? "Montando a arte, leva perto de um minuto…" : temArte ? "Refazer a arte deste post" : "Montar a arte deste post"}
      </button>
      {msg && (
        <p className={`rounded p-2 text-xs ${estado === "erro" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{msg}</p>
      )}
    </div>
  );
}

/**
 * "Montar as artes que faltam": um post por vez, cada um na sua chamada (cada
 * montagem leva perto de um minuto; todas juntas estourariam o tempo da função).
 */
export function MontarArtesQueFaltam({ postIds }: { postIds: string[] }) {
  const router = useRouter();
  const [feitos, setFeitos] = useState(0);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [indo, setIndo] = useState(false);

  if (postIds.length === 0) return null;

  async function montarTodas() {
    if (!window.confirm(`Montar a arte de ${postIds.length} posts? Leva perto de um minuto cada, deixe esta tela aberta.`)) return;
    setIndo(true);
    setFeitos(0);
    setFalhas([]);
    for (const id of postIds) {
      const r = await montarArteDoPost(id);
      if (!r.ok) setFalhas((f) => [...f, r.erro]);
      setFeitos((n) => n + 1);
      router.refresh();
    }
    setIndo(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={montarTodas}
          disabled={indo}
          className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {indo ? `Montando ${feitos + 1} de ${postIds.length}…` : `Montar as artes que faltam (${postIds.length})`}
        </button>
        <span className="text-xs text-slate-500">
          Carrosséis e posts de imagem, com a curadoria do Scanner e as cores do perfil. Reels e stories têm botão próprio.
        </span>
      </div>
      {!indo && feitos > 0 && (
        <p className="mt-2 text-xs text-slate-600">
          {feitos - falhas.length} de {feitos} montados.
          {falhas.length > 0 && ` Não saíram: ${falhas.slice(0, 3).join(" · ")}`}
        </p>
      )}
    </div>
  );
}
