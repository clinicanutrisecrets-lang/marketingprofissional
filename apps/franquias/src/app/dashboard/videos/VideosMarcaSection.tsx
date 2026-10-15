"use client";

import { useState } from "react";
import { roteiroComoTexto, tempoRoteiro } from "@/lib/videos/marca";
import type { EstadoVideoMarca } from "@/lib/videos/marca-servidor";

/**
 * Vídeos animados na SUA marca: o mesmo vídeo pra todas, com a cor e a logo
 * de cada profissional. Saem sem voz e sem legenda escrita, pra narrar por
 * cima (roteiro em karaokê) ou postar com música.
 */
export function VideosMarcaSection({ videos }: { videos: EstadoVideoMarca[] }) {
  return (
    <section id="videos-marca" className="mb-8">
      <h2 className="text-xl font-bold text-brand-text">🧬 Vídeos animados com a sua marca</h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
        Vídeos explicando os genes, montados com a sua logo e as suas cores. Eles vêm sem voz: grave a sua
        narração lendo o roteiro, ou poste com uma música.
      </p>
      {videos.some((v) => v.semLogo) && (
        <p className="mt-3 max-w-2xl rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          A sua logo ainda não chegou aqui, então o vídeo sai sem logo. Ela vem do questionário do
          Consultório no Scanner; se você já enviou, fale com o time pelo suporte. Quando a logo entrar, o
          vídeo é refeito sozinho.
        </p>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {videos.map((e) => (
          <CartaoVideoMarca key={e.video.id} e={e} />
        ))}
      </div>
    </section>
  );
}

function CartaoVideoMarca({ e }: { e: EstadoVideoMarca }) {
  const v = e.video;
  const [copiado, setCopiado] = useState<"" | "legenda" | "roteiro">("");
  async function copiar(texto: string, qual: "legenda" | "roteiro") {
    try {
      await navigator.clipboard?.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(""), 2000);
    } catch {
      // clipboard bloqueado: o texto continua visível pra copiar à mão
    }
  }
  const temVideo = !!e.url;
  const teleprompter = `/dashboard/teleprompter?texto=${encodeURIComponent(roteiroComoTexto(v, false))}`;

  return (
    <article className="flex flex-col rounded-2xl bg-white p-4 shadow-sm">
      {temVideo ? (
        <video src={e.url!} poster={v.poster} controls playsInline preload="none" className="aspect-[9/16] w-full rounded-xl bg-black object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.poster} alt="" className="aspect-[9/16] w-full rounded-xl object-cover opacity-60" />
      )}
      <h3 className="mt-3 font-bold text-brand-text">{v.titulo}</h3>
      <p className="mt-1 text-xs text-brand-text/50">{tempoRoteiro(v.duracaoSeg)} · sem voz</p>
      {e.status === "gerando" && (
        <p className="mt-2 rounded-lg bg-brand-muted p-2 text-xs text-brand-text/70">
          {temVideo
            ? "Uma versão nova, com a sua marca atualizada, está sendo montada. Abra esta tela de novo em uns 20 minutos."
            : "O seu vídeo está sendo montado com a sua logo e as suas cores. Leva uns 20 minutos: abra esta tela de novo depois."}
        </p>
      )}
      {(e.status === "erro" || e.status === "indisponivel") && !temVideo && (
        <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
          O vídeo não ficou pronto desta vez. Abra esta tela de novo que ele é montado outra vez.
        </p>
      )}
      <p className="mt-2 text-sm text-brand-text/70">{v.resumo}</p>

      {temVideo && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/dashboard/narrar?origem=marca&ref=${v.id}`} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">
            🎙️ Gravar narração
          </a>
          <a href={e.url!} download target="_blank" rel="noreferrer" className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white">
            Baixar vídeo
          </a>
          <button
            type="button"
            onClick={() => copiar(v.legenda, "legenda")}
            className="rounded-lg border border-brand-primary px-3 py-2 text-sm font-semibold text-brand-primary"
          >
            {copiado === "legenda" ? "Legenda copiada ✓" : "Copiar legenda"}
          </button>
        </div>
      )}

      <details className="mt-3 rounded-lg bg-brand-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-text">Roteiro pra narrar</summary>
        <div className="mt-2 space-y-3">
          {v.roteiro.map((t) => (
            <p key={t.de} className="text-brand-text/80">
              <span className="mr-1 font-mono text-xs text-brand-text/50">
                {tempoRoteiro(t.de)} a {tempoRoteiro(t.ate)}
              </span>
              {t.texto}
            </p>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copiar(roteiroComoTexto(v), "roteiro")}
            className="rounded-lg border border-brand-text/20 px-3 py-1.5 text-xs font-semibold text-brand-text"
          >
            {copiado === "roteiro" ? "Roteiro copiado ✓" : "Copiar roteiro"}
          </button>
          <a href={teleprompter} className="rounded-lg border border-brand-text/20 px-3 py-1.5 text-xs font-semibold text-brand-text">
            Ler no teleprompter
          </a>
        </div>
      </details>

      <details className="mt-2 rounded-lg bg-brand-muted p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-text">Legenda sugerida</summary>
        <p className="mt-2 whitespace-pre-line text-brand-text/80">{v.legenda}</p>
      </details>
    </article>
  );
}
