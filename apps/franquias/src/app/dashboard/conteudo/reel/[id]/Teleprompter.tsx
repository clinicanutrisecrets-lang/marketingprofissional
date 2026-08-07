"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { marcarStatusSugestao } from "@/lib/conteudo/actions";

/**
 * Teleprompter com gravação: câmera frontal ao fundo, roteiro rolando por
 * cima, botão de gravar. A nutri lê olhando pra câmera, baixa o vídeo e
 * posta como reel — sem depender de aprovação da Meta.
 */
export function Teleprompter(props: {
  sugestaoId: string;
  tema: string;
  texto: string;
  dicas: string[];
  legenda: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);

  const [temCamera, setTemCamera] = useState<boolean | null>(null);
  const [gravando, setGravando] = useState(false);
  const [rolando, setRolando] = useState(false);
  const [velocidade, setVelocidade] = useState(0.55); // px por frame
  const [fontSize, setFontSize] = useState(30);
  const [espelhado, setEspelhado] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Liga a câmera frontal
  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setTemCamera(true);
      } catch {
        setTemCamera(false); // modo só-teleprompter
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Rolagem automática
  useEffect(() => {
    if (!rolando) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop += velocidade;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setRolando(false);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [rolando, velocidade]);

  function comecarGravacao() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    setErro(null);
    setVideoUrl(null);
    chunksRef.current = [];
    const mime =
      ["video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
      ) ?? "";
    try {
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || "video/webm" });
        setVideoUrl(URL.createObjectURL(blob));
        void marcarStatusSugestao(props.sugestaoId, "gravado");
      };
      rec.start(1000);
      recorderRef.current = rec;
      setGravando(true);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      setRolando(true);
    } catch {
      setErro("Seu navegador não suporta gravação. Use o modo teleprompter e grave com a câmera nativa em outro aparelho.");
    }
  }

  function pararGravacao() {
    recorderRef.current?.stop();
    setGravando(false);
    setRolando(false);
  }

  const extensao = videoUrl && chunksRef.current[0]?.type.includes("mp4") ? "mp4" : "webm";

  return (
    <main className="fixed inset-0 bg-black">
      {/* Câmera ao fundo */}
      {temCamera !== false && (
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${espelhado ? "" : "-scale-x-100"}`}
        />
      )}

      {/* Roteiro rolando */}
      <div
        ref={scrollRef}
        onClick={() => setRolando((r) => !r)}
        className="absolute inset-x-0 top-0 bottom-28 overflow-y-auto px-6 pt-[38vh] pb-[45vh]"
        style={{ background: temCamera === false ? "#111" : "linear-gradient(#000c, #0006 30%, #0006 70%, #000c)" }}
      >
        <p
          className="mx-auto max-w-xl whitespace-pre-line text-center font-semibold leading-relaxed text-white"
          style={{ fontSize, transform: espelhado ? "scaleX(-1)" : undefined }}
        >
          {props.texto}
        </p>
      </div>

      {/* Linha-guia de leitura */}
      <div className="pointer-events-none absolute inset-x-10 top-[40vh] border-t-2 border-amber-400/70" />

      {/* Barra superior */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-black/60 px-4 py-2 text-white">
        <Link href="/dashboard/conteudo" className="text-sm opacity-80">← Sair</Link>
        <p className="flex-1 truncate text-center text-xs opacity-70">{props.tema}</p>
        <button onClick={() => setFontSize((f) => Math.max(18, f - 3))} className="rounded bg-white/10 px-2 text-sm">A−</button>
        <button onClick={() => setFontSize((f) => Math.min(56, f + 3))} className="rounded bg-white/10 px-2 text-sm">A+</button>
        <button onClick={() => setVelocidade((v) => Math.max(0.2, v - 0.15))} className="rounded bg-white/10 px-2 text-sm">🐢</button>
        <button onClick={() => setVelocidade((v) => Math.min(2, v + 0.15))} className="rounded bg-white/10 px-2 text-sm">🐇</button>
        <button onClick={() => setEspelhado((e) => !e)} className="rounded bg-white/10 px-2 text-sm" title="Espelhar texto">🪞</button>
      </div>

      {/* Controles inferiores */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-black/70 px-4 py-4">
        {erro && <p className="text-center text-xs text-amber-300">{erro}</p>}

        {videoUrl ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={videoUrl}
              download={`reel-${props.sugestaoId.slice(0, 6)}.${extensao}`}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white"
            >
              ⬇️ Baixar vídeo
            </a>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(props.legenda);
              }}
              className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white"
            >
              📋 Copiar legenda
            </button>
            <button
              onClick={() => setVideoUrl(null)}
              className="rounded-xl bg-white/15 px-4 py-2.5 text-sm text-white"
            >
              🔁 Regravar
            </button>
          </div>
        ) : temCamera === false ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRolando((r) => !r)}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black"
            >
              {rolando ? "⏸ Pausar rolagem" : "▶️ Rolar roteiro"}
            </button>
            <p className="max-w-xs text-xs text-white/60">
              Sem câmera aqui — use este aparelho como teleprompter e grave com outro.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {gravando ? (
              <button
                onClick={pararGravacao}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-red-600"
                title="Parar gravação"
              >
                <span className="h-6 w-6 rounded bg-white" />
              </button>
            ) : (
              <button
                onClick={comecarGravacao}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white"
                title="Gravar"
              >
                <span className="h-12 w-12 rounded-full bg-red-600" />
              </button>
            )}
            <button
              onClick={() => setRolando((r) => !r)}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white"
            >
              {rolando ? "⏸ Pausar texto" : "▶️ Rolar texto"}
            </button>
          </div>
        )}

        {props.dicas.length > 0 && !gravando && !videoUrl && (
          <p className="max-w-md text-center text-[11px] leading-snug text-white/50">
            💡 {props.dicas.join(" · ")}
          </p>
        )}
      </div>
    </main>
  );
}
