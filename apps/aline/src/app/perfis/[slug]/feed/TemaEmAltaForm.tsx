"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarPostTemaEmAlta } from "@/lib/arte-post/actions";

/**
 * Post de tema em alta: ela escreve o que todo mundo está comentando e o post
 * nasce no feed já com a arte, pela leitura dela (Fábrica da Saúde + curadoria).
 */
export function TemaEmAltaForm({ perfilSlug, diaPadrao }: { perfilSlug: string; diaPadrao: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tema, setTema] = useState("");
  const [assunto, setAssunto] = useState("");
  const [dia, setDia] = useState(diaPadrao);
  const [estado, setEstado] = useState<"parado" | "indo" | "ok" | "erro">("parado");
  const [msg, setMsg] = useState("");

  async function criar() {
    setEstado("indo");
    setMsg("");
    const r = await criarPostTemaEmAlta({ perfilSlug, tema, assunto, dia });
    if (!r.ok) {
      setEstado("erro");
      setMsg(r.erro);
      return;
    }
    setEstado(r.arte ? "ok" : "erro");
    setMsg(r.arte ? "Post pronto no feed, aguardando a sua aprovação. Toque nele pra ler os slides e a legenda." : r.aviso ?? "");
    if (r.arte) {
      setTema("");
      setAssunto("");
    }
    router.refresh();
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-slate-50"
      >
        <span className="font-semibold text-slate-900">Post de tema em alta</span>
        <span className="block text-slate-500">Algo que todo mundo está comentando vira um carrossel pela sua leitura.</span>
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div>
        <p className="font-semibold text-slate-900">Post de tema em alta</p>
        <p className="text-slate-500">
          Escreva o assunto como você contaria pra alguém. O post usa só o que você escrever sobre ele: não inventa título, fala nem número, e o conteúdo de saúde sai da curadoria do Scanner.
        </p>
      </div>
      <label className="block">
        <span className="text-slate-700">O que está em alta</span>
        <textarea
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Ex.: a Netflix lançou um documentário sobre intestino e todo mundo está comentando."
          className="mt-1 w-full rounded-lg border border-slate-300 p-2"
        />
      </label>
      <label className="block">
        <span className="text-slate-700">Ligar com qual assunto da sua área (opcional)</span>
        <input
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          maxLength={120}
          placeholder="Ex.: microbiota intestinal"
          className="mt-1 w-full rounded-lg border border-slate-300 p-2"
        />
      </label>
      <label className="block">
        <span className="text-slate-700">Dia da publicação (18h30)</span>
        <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 p-2" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={criar}
          disabled={estado === "indo" || tema.trim().length < 12}
          className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {estado === "indo" ? "Montando, leva perto de um minuto…" : "Criar o post"}
        </button>
        <button onClick={() => setAberto(false)} disabled={estado === "indo"} className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100">
          Fechar
        </button>
      </div>
      {msg && (
        <p className={`rounded p-2 text-xs ${estado === "erro" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{msg}</p>
      )}
    </div>
  );
}
