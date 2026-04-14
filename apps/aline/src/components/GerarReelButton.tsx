"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarReelHeyGen, gerarApenasScript } from "@/lib/posts/reel-actions";

type Props = { perfilId: string; corPrimaria: string };

export function GerarReelButton({ perfilId, corPrimaria }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [briefing, setBriefing] = useState("");
  const [duracao, setDuracao] = useState(60);
  const [gerandoVideo, setGerandoVideo] = useState(false);
  const [gerandoScript, setGerandoScript] = useState(false);
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [scriptPreview, setScriptPreview] = useState<{
    titulo: string;
    script: string;
    cta_legenda: string;
    hashtags: string[];
  } | null>(null);

  async function handleScriptOnly() {
    if (!briefing.trim()) {
      setErro("Descreve o tema do reel");
      return;
    }
    setGerandoScript(true);
    setErro(null);
    setScriptPreview(null);
    const r = await gerarApenasScript({ perfilId, briefing, duracaoSeg: duracao });
    setGerandoScript(false);
    if (r.ok && r.script) {
      setScriptPreview(r.script);
    } else {
      setErro(r.erro ?? "Erro");
    }
  }

  async function handleGerarVideo() {
    if (!briefing.trim()) {
      setErro("Descreve o tema do reel");
      return;
    }
    setGerandoVideo(true);
    setErro(null);
    setMsg("⏳ Gerando vídeo... isso pode levar 2-5 minutos. Não feche a aba.");
    startTransition(async () => {
      const r = await gerarReelHeyGen({ perfilId, briefing, duracaoSeg: duracao });
      setGerandoVideo(false);
      if (r.ok) {
        setMsg("✅ Reel gerado! Recarregando...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setErro(r.erro ?? "Erro");
        setMsg(null);
      }
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow"
        style={{ background: corPrimaria }}
      >
        🎬 Gerar reel com avatar
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">🎬 Gerar reel HeyGen</h3>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setScriptPreview(null);
            setErro(null);
            setMsg(null);
          }}
          className="text-xs text-aline-text/60 hover:text-aline-text"
        >
          fechar
        </button>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-aline-text/70">
          Tema do reel (1-2 linhas)
        </label>
        <textarea
          value={briefing}
          onChange={(e) => setBriefing(e.target.value)}
          rows={3}
          placeholder='Ex: "Sinergia entre vitamina D e K2 explicada de forma simples pra mães"'
          className="w-full rounded-lg border border-aline-text/10 p-2 text-sm focus:border-aline-scanner focus:outline-none"
        />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs font-medium text-aline-text/70">Duração:</label>
        <select
          value={duracao}
          onChange={(e) => setDuracao(Number(e.target.value))}
          className="rounded-lg border border-aline-text/10 px-2 py-1 text-sm"
        >
          <option value={30}>30s</option>
          <option value={60}>60s</option>
          <option value={90}>90s</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleScriptOnly}
          disabled={gerandoScript || gerandoVideo}
          className="rounded-lg border border-aline-scanner bg-aline-scanner/5 px-3 py-1.5 text-xs font-medium text-aline-scanner hover:bg-aline-scanner/10 disabled:opacity-60"
        >
          {gerandoScript ? "Gerando..." : "📝 Só preview do script"}
        </button>
        <button
          type="button"
          onClick={handleGerarVideo}
          disabled={gerandoScript || gerandoVideo}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-60"
          style={{ background: corPrimaria }}
        >
          {gerandoVideo ? "Renderizando..." : "🎬 Gerar vídeo completo"}
        </button>
      </div>

      {scriptPreview && (
        <div className="mt-4 rounded-xl bg-aline-muted p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-aline-text/60">
            Preview do script
          </div>
          <div className="mb-2 text-sm font-bold">{scriptPreview.titulo}</div>
          <div className="mb-3 whitespace-pre-wrap text-sm text-aline-text">
            {scriptPreview.script}
          </div>
          <div className="mb-2 text-xs font-medium text-aline-scanner">
            CTA: {scriptPreview.cta_legenda}
          </div>
          <div className="flex flex-wrap gap-1">
            {scriptPreview.hashtags.map((h, i) => (
              <span key={i} className="text-xs text-aline-scanner/80">
                #{h}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-aline-text/50">
            Gostou? Clica em "🎬 Gerar vídeo completo" pra renderizar com seu avatar.
          </div>
        </div>
      )}

      {msg && (
        <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          {msg}
        </div>
      )}
      {erro && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          {erro}
        </div>
      )}
    </div>
  );
}
