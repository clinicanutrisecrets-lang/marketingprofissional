"use client";

import { useState } from "react";
import { desenharVideoDoPost } from "@/lib/reel-animado/actions";
import type { ResumoRoteiro } from "@/lib/reel-animado/publico";

/**
 * "Desenhar vídeo" no card de reel do feed: o reel animado do Avançado
 * (personagem com o sintoma circulado, gene, alimentos desenhados). Sem avatar.
 *
 * Abre uma janela com o que o vídeo explica, pra quem e quanto dura. O roteiro
 * sai SÓ da curadoria do Scanner; sem curadoria sobre o tema, ele recusa.
 * Depois de pedir, mostra o que o vídeo vai citar (gene, exame, alimentos)
 * pra ela conferir antes de postar. Leva uns 10 minutos pra desenhar.
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
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState("");
  const [publico, setPublico] = useState<"paciente" | "profissional">("paciente");
  const [duracao, setDuracao] = useState<"30s" | "60s">("60s");
  const [estado, setEstado] = useState<"parado" | "indo" | "pedido" | "erro">(emProducao ? "pedido" : "parado");
  const [msg, setMsg] = useState("");
  const [roteiro, setRoteiro] = useState<ResumoRoteiro | null>(null);

  async function desenhar() {
    if (temVideo && !window.confirm("Este post já tem vídeo. Desenhar um novo no lugar dele?")) return;
    setEstado("indo");
    setMsg("");
    const r = await desenharVideoDoPost({ postId, tema, publico, duracao });
    if (r.ok) {
      setRoteiro(r.roteiro);
      setEstado("pedido");
    } else {
      setEstado("erro");
      setMsg(r.erro);
    }
  }

  if (estado === "pedido" && !aberto) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); if (roteiro) setAberto(true); }}
        className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700"
      >
        desenhando, uns 10 min
      </button>
    );
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setAberto(true); }}
        className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-800 hover:bg-white"
      >
        {temVideo ? "Desenhar de novo" : "Desenhar vídeo"}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => estado !== "indo" && setAberto(false)}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 text-left text-slate-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {estado === "pedido" && roteiro ? (
              <div className="space-y-3 text-sm">
                <p className="font-semibold">Pedido feito. O vídeo fica pronto em uns 10 minutos.</p>
                <p className="text-slate-600">
                  Roteiro pra <strong>{roteiro.publico === "profissional" ? "profissional" : "paciente"}</strong>,{" "}
                  {roteiro.cenas} cenas, uns {roteiro.duracaoSeg} s. Feito com {roteiro.registrosCurados}{" "}
                  {roteiro.registrosCurados === 1 ? "registro" : "registros"} da curadoria do Scanner.
                </p>
                {roteiro.gancho && <p className="rounded bg-slate-50 p-2 italic">&ldquo;{roteiro.gancho}&rdquo;</p>}
                <Linha rotulo="Genes" itens={roteiro.genes} />
                <Linha rotulo="Exames" itens={roteiro.marcadores} />
                <Linha rotulo="Alimentos" itens={roteiro.alimentos} />
                <p className="text-xs text-slate-500">Quando ficar pronto, o vídeo aparece neste card e o post volta pra aprovação.</p>
                <button onClick={() => setAberto(false)} className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white">
                  Fechar
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">Desenhar o vídeo deste reel</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Vídeo animado com personagem, sintoma circulado, gene e alimentos desenhados. Sem avatar. O conteúdo vem
                    só da curadoria do Scanner.
                  </p>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">O que o vídeo explica</span>
                  <input
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    placeholder="ex.: FTO e a fome à noite"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">Em branco, usa a legenda do post. Use o nome do gene, exame ou bactéria.</span>
                </label>
                <div>
                  <span className="text-xs font-medium text-slate-600">Pra quem</span>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["paciente", "profissional"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPublico(p)}
                        className={`rounded-lg border px-3 py-2 ${publico === p ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}
                      >
                        {p === "paciente" ? "Paciente" : "Profissional"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600">Duração</span>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {(["30s", "60s"] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuracao(d)}
                        className={`rounded-lg border px-3 py-2 ${duracao === d ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"}`}
                      >
                        {d === "30s" ? "30 segundos" : "1 minuto"}
                      </button>
                    ))}
                  </div>
                </div>
                {estado === "erro" && <p className="rounded bg-rose-50 p-2 text-rose-800">{msg}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setAberto(false)} disabled={estado === "indo"} className="flex-1 rounded-lg border border-slate-300 px-4 py-2">
                    Cancelar
                  </button>
                  <button
                    onClick={desenhar}
                    disabled={estado === "indo"}
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
                  >
                    {estado === "indo" ? "Montando o roteiro…" : "Desenhar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Linha({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <p>
      <span className="text-xs font-medium text-slate-500">{rotulo}: </span>
      {itens.join(", ")}
    </p>
  );
}
