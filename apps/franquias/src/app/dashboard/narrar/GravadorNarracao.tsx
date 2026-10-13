"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  indiceNoTempo,
  palavrasAcesas,
  trechoApertado,
  type Trecho,
} from "@/lib/narracao/roteiro";
import {
  montarNarracaoAction,
  prepararNarracaoAction,
  type Narracao,
  type OrigemNarracao,
} from "@/lib/narracao/actions";

type Fase = "pronta" | "contagem" | "ensaio" | "gravando" | "revisar" | "enviando";

/** Formatos que o MediaRecorder costuma aceitar: Chrome/Android grava webm, iPhone grava mp4. */
function mimeDeGravacao(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"]) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

const ANTECIPACOES = [
  { s: 0, rotulo: "No tempo" },
  { s: 0.6, rotulo: "Um pouco antes" },
  { s: 1.2, rotulo: "Bem antes" },
];

/**
 * Gravar a voz por cima do vídeo com o texto em karaokê (Aline, 13/10/2026).
 * O vídeo toca sem som; o trecho da cena acende palavra a palavra no ritmo
 * do vídeo. "Ver o texto antes" adianta o texto pra quem lê devagar.
 */
export function GravadorNarracao(props: {
  origem: OrigemNarracao;
  refId: string;
  videoUrl: string;
  trechos: Trecho[];
  aviso: string | null;
  narracoes: Narracao[];
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inicioRecRef = useRef(0);
  const atrasoRef = useRef(0);
  const blobRef = useRef<Blob | null>(null);

  const [fase, setFase] = useState<Fase>("pronta");
  const [conta, setConta] = useState(3);
  const [tempo, setTempo] = useState(0);
  const [antecipa, setAntecipa] = useState(0.6);
  const [vozUrl, setVozUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Relógio do karaokê: lê o tempo do vídeo a cada quadro.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v) setTempo(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Enquanto alguma narração está sendo montada, a lista se atualiza sozinha.
  const montando = props.narracoes.some((n) => n.status === "montando");
  useEffect(() => {
    if (!montando) return;
    const id = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(id);
  }, [montando, router]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (vozUrl) URL.revokeObjectURL(vozUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // O texto só corre adiantado enquanto o vídeo toca (ensaio ou gravação).
  const tocando = fase === "ensaio" || fase === "gravando";
  const tTexto = tempo + (tocando ? antecipa : 0);
  const idx = indiceNoTempo(props.trechos, tTexto);
  const atual = idx >= 0 ? props.trechos[idx]! : null;
  const primeiro = props.trechos[0];
  const proximo =
    idx >= 0 ? (props.trechos[idx + 1] ?? null) : primeiro && tTexto < primeiro.de ? primeiro : null;

  async function ensaiar() {
    setErro(null);
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setFase("ensaio");
    try {
      await v.play();
    } catch {
      setFase("pronta");
    }
  }

  async function gravar() {
    setErro(null);
    setOk(null);
    const v = videoRef.current;
    if (!v) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setErro("Não consegui usar o microfone. Libere o microfone para este site no navegador e tente de novo.");
      return;
    }
    streamRef.current = stream;
    const mime = mimeDeGravacao();
    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      setErro("Este navegador não grava áudio. Tente pelo Chrome ou pelo Safari atualizado.");
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || "audio/webm" });
      blobRef.current = blob;
      setVozUrl((antiga) => {
        if (antiga) URL.revokeObjectURL(antiga);
        return URL.createObjectURL(blob);
      });
      setFase("revisar");
    };
    recRef.current = rec;
    v.pause();
    v.currentTime = 0;
    setFase("contagem");
    for (let n = 3; n >= 1; n--) {
      setConta(n);
      await new Promise((r) => setTimeout(r, 1000));
    }
    rec.start(250);
    inicioRecRef.current = performance.now();
    setFase("gravando");
    v.onplaying = () => {
      // Quanto a voz começou antes do vídeo: o worker corta isso do início.
      atrasoRef.current = performance.now() - inicioRecRef.current;
      v.onplaying = null;
    };
    try {
      await v.play();
    } catch {
      parar();
    }
  }

  function parar() {
    const v = videoRef.current;
    v?.pause();
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    else if (fase === "ensaio") setFase("pronta");
  }

  function aoTerminarVideo() {
    if (fase === "gravando") parar();
    else if (fase === "ensaio") setFase("pronta");
  }

  async function ouvir() {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v || !a) return;
    v.currentTime = 0;
    a.currentTime = atrasoRef.current / 1000;
    await Promise.all([v.play(), a.play()]).catch(() => undefined);
  }

  function regravar() {
    audioRef.current?.pause();
    videoRef.current?.pause();
    blobRef.current = null;
    setFase("pronta");
  }

  async function usar() {
    const blob = blobRef.current;
    if (!blob) return;
    setFase("enviando");
    setErro(null);
    try {
      const mime = blob.type || "audio/webm";
      const prep = await prepararNarracaoAction({
        origem: props.origem,
        ref: props.refId,
        mime,
        tamanhoBytes: blob.size,
      });
      if (!prep.ok) throw new Error(prep.msg);
      const { error } = await createClient()
        .storage.from("franqueadas-assets")
        .uploadToSignedUrl(prep.path, prep.token, blob, { contentType: mime });
      if (error) throw new Error("a gravação não subiu, confira a internet e tente de novo");
      const r = await montarNarracaoAction({ id: prep.id, atrasoMs: atrasoRef.current });
      if (!r.ok) throw new Error(r.msg);
      setOk(r.msg);
      setFase("pronta");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "não consegui enviar, tente de novo");
      setFase("revisar");
    }
  }

  const ocupado = fase === "contagem" || fase === "gravando" || fase === "enviando";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="relative mx-auto w-full max-w-[320px]">
        <video
          ref={videoRef}
          src={props.videoUrl}
          muted
          playsInline
          preload="auto"
          onEnded={aoTerminarVideo}
          className="aspect-[9/16] w-full rounded-2xl bg-black object-contain"
        />
        {fase === "contagem" && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-7xl font-bold text-white">
            {conta}
          </div>
        )}
        {fase === "gravando" && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> GRAVANDO
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {props.aviso && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{props.aviso}</p>
        )}

        {props.trechos.length > 0 && (
          <div className="min-h-[180px] rounded-2xl bg-brand-text p-5 text-white">
            {atual ? (
              <>
                <p className="text-2xl font-semibold leading-snug">
                  <Karaoke texto={atual.texto} acesas={palavrasAcesas(atual, tTexto)} />
                </p>
                {trechoApertado(atual) && (
                  <p className="mt-2 text-xs text-amber-300">Trecho corrido: fale um pouco mais rápido aqui.</p>
                )}
              </>
            ) : (
              <p className="text-lg text-white/60">
                {fase === "pronta" ? "Aperte Ensaiar ou Gravar: o texto aparece aqui." : "…"}
              </p>
            )}
            {proximo && <p className="mt-4 text-sm text-white/45">Depois: {proximo.texto}</p>}
          </div>
        )}

        {props.trechos.length > 0 && fase !== "revisar" && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-brand-text/70">
            <span className="font-semibold">Ver o texto:</span>
            {ANTECIPACOES.map((a) => (
              <button
                key={a.s}
                type="button"
                disabled={ocupado}
                onClick={() => setAntecipa(a.s)}
                className={`rounded-full px-3 py-1 ${antecipa === a.s ? "bg-brand-primary text-white" : "bg-white text-brand-text"}`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(fase === "pronta" || fase === "ensaio") && (
            <>
              <button
                type="button"
                onClick={gravar}
                className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white hover:opacity-90"
              >
                🎙️ Gravar
              </button>
              {fase === "pronta" ? (
                <button
                  type="button"
                  onClick={ensaiar}
                  className="rounded-full border border-brand-text/20 bg-white px-5 py-3 text-sm font-semibold text-brand-text"
                >
                  ▶ Ensaiar sem gravar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={parar}
                  className="rounded-full border border-brand-text/20 bg-white px-5 py-3 text-sm font-semibold text-brand-text"
                >
                  ■ Parar ensaio
                </button>
              )}
            </>
          )}
          {fase === "gravando" && (
            <button
              type="button"
              onClick={parar}
              className="rounded-full bg-brand-text px-6 py-3 text-sm font-bold text-white"
            >
              ■ Parar
            </button>
          )}
          {(fase === "revisar" || fase === "enviando") && (
            <>
              <button
                type="button"
                onClick={ouvir}
                disabled={fase === "enviando"}
                className="rounded-full border border-brand-text/20 bg-white px-5 py-3 text-sm font-semibold text-brand-text"
              >
                ▶ Ouvir com o vídeo
              </button>
              <button
                type="button"
                onClick={regravar}
                disabled={fase === "enviando"}
                className="rounded-full border border-brand-text/20 bg-white px-5 py-3 text-sm font-semibold text-brand-text"
              >
                ↺ Regravar
              </button>
              <button
                type="button"
                onClick={usar}
                disabled={fase === "enviando"}
                className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {fase === "enviando" ? "Enviando…" : "✓ Usar esta narração"}
              </button>
            </>
          )}
        </div>
        {vozUrl && <audio ref={audioRef} src={vozUrl} className="hidden" />}
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
        {ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>}

        {props.narracoes.length > 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-brand-text">Suas narrações deste vídeo</h2>
            <ul className="mt-2 space-y-2">
              {props.narracoes.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-brand-text/60">
                    {new Date(n.criado_em).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {n.status === "pronto" && n.url ? (
                    <a
                      href={n.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                    >
                      ⬇ Baixar vídeo com a sua voz
                    </a>
                  ) : n.status === "erro" ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">não deu certo, envie de novo</span>
                  ) : (
                    <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
                      montando o vídeo (uns 2 min)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {props.trechos.length > 0 && (
          <details className="rounded-2xl bg-white p-4 text-sm shadow-sm">
            <summary className="cursor-pointer font-semibold text-brand-text">Ler o roteiro inteiro antes</summary>
            <ol className="mt-3 space-y-2">
              {props.trechos.map((t, i) => (
                <li key={i} className={i === idx ? "font-semibold text-brand-text" : "text-brand-text/70"}>
                  <span className="mr-2 text-xs text-brand-text/40">
                    {Math.floor(t.de)}s
                  </span>
                  {t.texto}
                  {trechoApertado(t) && <span className="ml-1 text-xs text-amber-600">(corrido)</span>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}

function Karaoke({ texto, acesas }: { texto: string; acesas: number }) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  return (
    <>
      {palavras.map((p, i) => (
        <span key={i} className={i < acesas ? "text-white" : "text-white/35"}>
          {p}{" "}
        </span>
      ))}
    </>
  );
}
