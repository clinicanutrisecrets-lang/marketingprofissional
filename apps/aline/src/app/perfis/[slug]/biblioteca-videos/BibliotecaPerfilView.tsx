"use client";

import { useState } from "react";
import {
  adicionarVideoBiblioteca,
  removerVideoBiblioteca,
  buscarPexelsAline,
} from "@/lib/videos/actions";

type Video = Record<string, unknown>;

export function BibliotecaPerfilView({
  perfilId,
  videos: initial,
  corPrimaria,
}: {
  perfilId: string;
  videos: Video[];
  corPrimaria: string;
}) {
  const [videos, setVideos] = useState(initial);
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState("");
  const [titulo, setTitulo] = useState("");
  const [resultado, setResultado] = useState<{
    url: string;
    thumbnail: string;
    duracao: number;
    pexelsId: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    if (!query) return;
    setLoading(true);
    setErro(null);
    setResultado(null);
    const r = await buscarPexelsAline(query);
    setLoading(false);
    if (r.ok && r.video) {
      setResultado(r.video);
      setTitulo(query);
      setTags(query);
    } else {
      setErro(r.erro ?? "Sem resultados");
    }
  }

  async function salvar() {
    if (!resultado) return;
    const r = await adicionarVideoBiblioteca({
      perfilId,
      titulo,
      url: resultado.url,
      tags: tags
        .split(/[\s,]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      fonte: "pexels",
      pexels_video_id: String(resultado.pexelsId),
      thumbnail_url: resultado.thumbnail,
      duracao_seg: resultado.duracao,
    });
    if (r.ok) {
      setVideos((prev) => [
        {
          id: r.id,
          titulo,
          url: resultado.url,
          thumbnail_url: resultado.thumbnail,
          tags: tags.split(/[\s,]+/),
          fonte: "pexels",
          duracao_seg: resultado.duracao,
        },
        ...prev,
      ]);
      setQuery("");
      setTitulo("");
      setTags("");
      setResultado(null);
    }
  }

  async function remover(id: string) {
    if (!confirm("Remover esse vídeo?")) return;
    const r = await removerVideoBiblioteca(id);
    if (r.ok) setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <>
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
          🔎 Buscar no Pexels
        </h2>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && buscar()}
            placeholder='Ex: "healthy food", "yoga sunset", "cooking vegetables"'
            className="flex-1 rounded-lg border border-aline-text/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={buscar}
            disabled={loading || !query}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: corPrimaria }}
          >
            {loading ? "..." : "Buscar"}
          </button>
        </div>

        {erro && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{erro}</div>}

        {resultado && (
          <div className="mt-4 rounded-lg border border-aline-text/10 p-4">
            <video
              src={resultado.url}
              poster={resultado.thumbnail}
              controls
              className="mb-3 w-full rounded-lg"
              style={{ maxHeight: 400 }}
            />
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título"
              className="mb-2 w-full rounded-lg border border-aline-text/10 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (separe por vírgula)"
              className="mb-3 w-full rounded-lg border border-aline-text/10 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={salvar}
              className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: corPrimaria }}
            >
              ➕ Adicionar à biblioteca
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
          Biblioteca ({videos.length})
        </h2>
        {videos.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">🎥</div>
            <p className="text-sm text-aline-text/60">
              Adicione vídeos buscando no Pexels acima.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {videos.map((v) => (
              <div key={v.id as string} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                {v.thumbnail_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={v.thumbnail_url as string}
                    alt={v.titulo as string}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video bg-aline-muted" />
                )}
                <div className="p-3">
                  <h3 className="mb-1 truncate text-sm font-medium">
                    {v.titulo as string}
                  </h3>
                  <div className="mb-2 text-xs text-aline-text/60">
                    {v.fonte === "pexels" ? "🔎 Pexels" : "📤 Upload"}
                    {v.duracao_seg ? ` · ${v.duracao_seg}s` : ""}
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {((v.tags as string[]) ?? []).map((t, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-aline-muted px-2 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(v.id as string)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    🗑 remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
