"use client";

import { useState } from "react";
import { DesenharVideoButton } from "./DesenharVideoButton";
import { MontarArteButton } from "./MontarArteButton";
import { acentuar } from "@/lib/acentos-ptbr";

/**
 * O card do feed que ABRE (Aline, 12/10/2026: "não dá pra clicar pra ver, nem
 * expandir a arte, nem ver a legenda"). Tocar no quadradinho abre o post
 * inteiro: as artes slide a slide (ou o vídeo), a legenda, a chamada e as
 * hashtags. Nos reels, o botão de desenhar o vídeo fica grande ali dentro, e
 * não escondido no canto do card.
 */

export type MidiaCard = { url: string; tipo: string };

export type PostCardDados = {
  id: string;
  tipo: string;
  status: string;
  rotuloTipo: string;
  selo: { texto: string; classe: string };
  titulo: string;
  data: string;
  pilar: string | null;
  legenda: string | null;
  cta: string | null;
  hashtags: string[];
  midias: MidiaCard[];
};

export function PostCard({ post, formato }: { post: PostCardDados; formato: "grade" | "story" }) {
  const [aberto, setAberto] = useState(false);
  const capa = post.midias.find((m) => m.tipo !== "video") ?? null;
  const video = post.midias.find((m) => m.tipo === "video") ?? null;
  const ehReel = post.tipo === "reels";

  return (
    <>
      {formato === "grade" ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <Miniatura capa={capa} video={video} rotulo={post.rotuloTipo} />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${post.selo.classe}`}>{post.selo.texto}</span>
            <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{post.rotuloTipo}</span>
          </div>
          {ehReel && post.status !== "postado" && !video && (
            <span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-800 shadow">
              {post.status === "gerando" ? "desenhando o vídeo…" : "▶ Desenhar vídeo"}
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
            <p className="text-[11px] font-medium leading-snug text-white line-clamp-2">{post.titulo}</p>
            <p className="mt-0.5 text-[10px] text-white/75">
              {post.data}
              {post.pilar ? ` · ${acentuar(post.pilar.replace(/_/g, " "))}` : ""}
            </p>
          </div>
        </button>
      ) : (
        <button type="button" onClick={() => setAberto(true)} className="block w-28 flex-none text-left">
          <div className="aspect-[9/16] overflow-hidden rounded-lg bg-slate-100 ring-2 ring-slate-300 ring-offset-2">
            <Miniatura capa={capa} video={video} rotulo="sem arte" />
          </div>
          <p className="mt-1 text-[11px] leading-tight text-slate-600 line-clamp-2">{post.titulo}</p>
          <p className="text-[10px] text-slate-400">{post.data}</p>
        </button>
      )}

      {aberto && <Detalhe post={post} onFechar={() => setAberto(false)} />}
    </>
  );
}

function Miniatura({ capa, video, rotulo }: { capa: MidiaCard | null; video: MidiaCard | null; rotulo: string }) {
  if (capa) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={capa.url} alt="" className="h-full w-full object-cover" />;
  }
  if (video) return <video src={video.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <span className="text-center text-[10px] leading-tight text-slate-500">
        {rotulo}
        <br />
        <span className="text-slate-400">sem arte ainda</span>
      </span>
    </div>
  );
}

function Detalhe({ post, onFechar }: { post: PostCardDados; onFechar: () => void }) {
  const [i, setI] = useState(0);
  const total = post.midias.length;
  const atual = total > 0 ? post.midias[Math.min(i, total - 1)] : null;
  const ehStory = post.tipo.startsWith("stories");
  const ehReel = post.tipo === "reels";
  const temVideo = post.midias.some((m) => m.tipo === "video");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onFechar}>
      <div
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{post.titulo}</p>
            <p className="text-xs text-slate-500">
              {post.rotuloTipo} · {post.data} · <span className={`rounded px-1 ${post.selo.classe}`}>{post.selo.texto}</span>
            </p>
          </div>
          <button onClick={onFechar} className="ml-3 rounded-lg px-3 py-1 text-sm text-slate-600 hover:bg-slate-100" aria-label="Fechar">
            Fechar
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className={`relative mx-auto overflow-hidden rounded-xl bg-slate-100 ${ehStory || ehReel ? "aspect-[9/16] max-w-[320px]" : "aspect-[4/5]"}`}>
              {atual ? (
                atual.tipo === "video" ? (
                  <video key={atual.url} src={atual.url} controls playsInline className="h-full w-full object-contain bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={atual.url} alt="" className="h-full w-full object-contain" />
                )
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
                  Este post ainda não tem arte.
                  {ehReel ? " Use o botão abaixo pra desenhar o vídeo." : ehStory ? "" : " Use o botão abaixo pra montar."}
                </div>
              )}
              {total > 1 && (
                <>
                  <button
                    onClick={() => setI((v) => (v - 1 + total) % total)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2.5 py-1 text-lg shadow"
                    aria-label="Anterior"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setI((v) => (v + 1) % total)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2.5 py-1 text-lg shadow"
                    aria-label="Próxima"
                  >
                    ›
                  </button>
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">
                    {Math.min(i, total - 1) + 1} / {total}
                  </span>
                </>
              )}
            </div>
            {total > 1 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {post.midias.map((m, k) => (
                  <button
                    key={m.url + k}
                    onClick={() => setI(k)}
                    className={`h-14 w-11 flex-none overflow-hidden rounded border-2 ${k === i ? "border-slate-800" : "border-transparent"}`}
                  >
                    {m.tipo === "video" ? (
                      <span className="flex h-full items-center justify-center bg-slate-800 text-[10px] text-white">vídeo</span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
            {ehReel && post.status !== "postado" && (
              <div className="mt-3">
                <DesenharVideoButton postId={post.id} emProducao={post.status === "gerando"} temVideo={temVideo} variante="grande" />
              </div>
            )}
            {!ehReel && !ehStory && post.status !== "postado" && (
              <div className="mt-3">
                <MontarArteButton postId={post.id} temArte={total > 0} />
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Legenda</p>
              {post.legenda ? (
                <p className="mt-1 whitespace-pre-line text-slate-800">{post.legenda}</p>
              ) : (
                <p className="mt-1 text-slate-400">Sem legenda ainda.</p>
              )}
            </div>
            {post.cta && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chamada</p>
                <p className="mt-1 whitespace-pre-line text-slate-800">{post.cta}</p>
              </div>
            )}
            {post.hashtags.length > 0 && (
              <p className="text-xs text-sky-700">{post.hashtags.join(" ")}</p>
            )}
            {(post.legenda || post.cta) && (
              <CopiarLegenda texto={[post.legenda, post.cta, post.hashtags.join(" ")].filter(Boolean).join("\n\n")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopiarLegenda({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          setOk(false);
        }
      }}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      {ok ? "Copiado" : "Copiar legenda completa"}
    </button>
  );
}
