"use client";

import { useState, useTransition } from "react";
import { useDropzone } from "react-dropzone";
import {
  adicionarVideoBiblioteca,
  removerVideoBiblioteca,
  atualizarTagsVideo,
  buscarPexels,
} from "@/lib/videos/actions";
import { sugerirTagsParaVideo } from "@/lib/videos/sugerir-tags";
import { uploadArquivo } from "@/lib/arquivos/actions";

type Video = Record<string, unknown>;

export function BibliotecaView({ videos: initial }: { videos: Video[] }) {
  const [videos, setVideos] = useState(initial);
  const [aba, setAba] = useState<"upload" | "pexels">("upload");

  return (
    <>
      <div className="mb-4 flex gap-2 rounded-lg bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setAba("upload")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
            aba === "upload" ? "bg-brand-primary text-white" : "text-brand-text/60"
          }`}
        >
          📤 Upload meu vídeo
        </button>
        <button
          type="button"
          onClick={() => setAba("pexels")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium ${
            aba === "pexels" ? "bg-brand-primary text-white" : "text-brand-text/60"
          }`}
        >
          🔎 Buscar no Pexels
        </button>
      </div>

      {aba === "upload" ? (
        <UploadForm onAdded={(v) => setVideos((prev) => [v, ...prev])} />
      ) : (
        <PexelsSearch onAdded={(v) => setVideos((prev) => [v, ...prev])} />
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
          Sua biblioteca ({videos.length})
        </h2>

        {videos.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">🎥</div>
            <p className="text-sm text-brand-text/60">
              Comece subindo seus primeiros vídeos. Quanto mais variados, melhor a
              IA escolhe nas gerações automáticas.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {videos.map((v) => (
              <VideoCard
                key={v.id as string}
                video={v}
                onRemoved={(id) => setVideos((prev) => prev.filter((x) => x.id !== id))}
                onTagsUpdated={(id, tags) =>
                  setVideos((prev) =>
                    prev.map((x) => (x.id === id ? { ...x, tags } : x)),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function UploadForm({ onAdded }: { onAdded: (v: Video) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sugerindoTags, setSugerindoTags] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "video/*": [".mp4", ".mov", ".webm"] },
    multiple: false,
    onDrop: (files) => setArquivo(files[0] ?? null),
  });

  async function handleSugerirTags() {
    if (!titulo.trim()) {
      setErro("Preencha o título primeiro");
      return;
    }
    setSugerindoTags(true);
    const r = await sugerirTagsParaVideo(titulo);
    setSugerindoTags(false);
    if (r.ok && r.tags) {
      setTags([...new Set([...tags, ...r.tags])]);
      setMsg(`${r.tags.length} tags sugeridas pela IA`);
      setTimeout(() => setMsg(null), 2500);
    } else {
      setErro(r.erro ?? "Erro");
    }
  }

  function adicionarTagManual() {
    const novas = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    setTags([...new Set([...tags, ...novas])]);
    setTagsInput("");
  }

  async function handleSubmit() {
    if (!arquivo || !titulo) {
      setErro("Arquivo e título são obrigatórios");
      return;
    }
    setUploading(true);
    setErro(null);

    // Upload pra Storage
    const fd = new FormData();
    fd.append("file", arquivo);
    fd.append("tipo", "outro");
    const upload = await uploadArquivo(fd);
    if (!upload.ok || !upload.url) {
      setErro(upload.erro ?? "Falha no upload");
      setUploading(false);
      return;
    }

    // Adiciona na biblioteca
    const r = await adicionarVideoBiblioteca({
      titulo,
      url: upload.url,
      tags,
      fonte: "upload",
    });

    setUploading(false);
    if (r.ok) {
      onAdded({
        id: r.id!,
        titulo,
        url: upload.url,
        tags,
        fonte: "upload",
      });
      setArquivo(null);
      setTitulo("");
      setTags([]);
      setMsg("Vídeo adicionado!");
      setTimeout(() => setMsg(null), 2500);
    } else {
      setErro(r.erro ?? "Erro");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          isDragActive
            ? "border-brand-primary bg-brand-primary/5"
            : "border-brand-text/15 hover:border-brand-primary/40"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-sm text-brand-text">
          {arquivo ? `📹 ${arquivo.name}` : "Arraste um vídeo ou clique pra selecionar"}
        </div>
        <div className="mt-1 text-xs text-brand-text/50">
          MP4, MOV, WEBM · até 100MB · ideal 5-30s
        </div>
      </div>

      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder='Título descritivo (ex: "Café preparado de manhã")'
        className="w-full rounded-lg border border-brand-text/10 px-4 py-2 text-sm"
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium">Tags</label>
          <button
            type="button"
            onClick={handleSugerirTags}
            disabled={sugerindoTags || !titulo}
            className="text-xs font-medium text-brand-primary hover:underline disabled:opacity-60"
          >
            {sugerindoTags ? "Pensando..." : "✨ Sugerir com IA"}
          </button>
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs text-brand-primary"
            >
              {t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionarTagManual())}
            placeholder='Digite tags separadas por vírgula e dê Enter'
            className="flex-1 rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={adicionarTagManual}
            className="rounded-lg border border-brand-text/10 px-3 py-2 text-sm hover:border-brand-primary"
          >
            +
          </button>
        </div>
      </div>

      {msg && <div className="rounded-lg bg-green-50 p-2 text-xs text-green-700">{msg}</div>}
      {erro && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{erro}</div>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={uploading || !arquivo || !titulo}
        className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {uploading ? "Enviando..." : "💾 Adicionar à biblioteca"}
      </button>
    </div>
  );
}

function PexelsSearch({ onAdded }: { onAdded: (v: Video) => void }) {
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState<{
    url: string;
    thumbnail: string;
    duracao: number;
    pexelsId: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  async function handleBuscar() {
    if (!query.trim()) return;
    setLoading(true);
    setErro(null);
    setResultado(null);
    const r = await buscarPexels(query);
    setLoading(false);
    if (r.ok && r.video) {
      setResultado(r.video);
      setTitulo(query);
      setTags(query.toLowerCase().split(/\s+/).filter(Boolean));
    } else {
      setErro(r.erro ?? "Sem resultados");
    }
  }

  async function handleSalvar() {
    if (!resultado) return;
    const r = await adicionarVideoBiblioteca({
      titulo,
      url: resultado.url,
      tags,
      fonte: "pexels",
      pexels_video_id: String(resultado.pexelsId),
      thumbnail_url: resultado.thumbnail,
      duracao_seg: resultado.duracao,
    });
    if (r.ok) {
      onAdded({
        id: r.id!,
        titulo,
        url: resultado.url,
        thumbnail_url: resultado.thumbnail,
        tags,
        fonte: "pexels",
      });
      setResultado(null);
      setQuery("");
      setTitulo("");
      setTags([]);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
      <div>
        <p className="mb-2 text-xs text-brand-text/60">
          Busque vídeos prontos no Pexels (banco gratuito de stock). Tente:
          <em> "healthy food", "vegetables", "running outdoors", "morning coffee"</em>
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            placeholder="Buscar (em inglês funciona melhor)"
            className="flex-1 rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleBuscar}
            disabled={loading || !query}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {loading ? "..." : "Buscar"}
          </button>
        </div>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{erro}</div>}

      {resultado && (
        <div className="rounded-lg border border-brand-text/10 p-4">
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
            className="mb-2 w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={tags.join(", ")}
            onChange={(e) =>
              setTags(
                e.target.value
                  .split(",")
                  .map((t) => t.trim().toLowerCase())
                  .filter(Boolean),
              )
            }
            placeholder="Tags separadas por vírgula"
            className="mb-3 w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSalvar}
            className="w-full rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary/90"
          >
            ➕ Adicionar à biblioteca
          </button>
        </div>
      )}
    </div>
  );
}

function VideoCard({
  video,
  onRemoved,
  onTagsUpdated,
}: {
  video: Video;
  onRemoved: (id: string) => void;
  onTagsUpdated: (id: string, tags: string[]) => void;
}) {
  const [editandoTags, setEditandoTags] = useState(false);
  const [tagsInput, setTagsInput] = useState(((video.tags as string[]) ?? []).join(", "));
  const tags = (video.tags as string[]) ?? [];

  async function salvarTags() {
    const novas = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    await atualizarTagsVideo(video.id as string, novas);
    onTagsUpdated(video.id as string, novas);
    setEditandoTags(false);
  }

  async function handleRemover() {
    if (!confirm("Remover esse vídeo da biblioteca?")) return;
    await removerVideoBiblioteca(video.id as string);
    onRemoved(video.id as string);
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {video.thumbnail_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={video.thumbnail_url as string}
          alt={video.titulo as string}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-brand-muted text-3xl">
          🎬
        </div>
      )}
      <div className="p-3">
        <h3 className="mb-1 truncate text-sm font-medium">{video.titulo as string}</h3>
        <div className="mb-2 flex items-center gap-2 text-xs text-brand-text/60">
          {video.fonte === "pexels" ? "🔎 Pexels" : "📤 Upload"}
          {video.duracao_seg ? ` · ${video.duracao_seg}s` : ""}
          {video.usado_quantas_vezes ? ` · usado ${video.usado_quantas_vezes}x` : ""}
        </div>
        {editandoTags ? (
          <div className="mb-2 space-y-1">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded border border-brand-text/10 px-2 py-1 text-xs"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={salvarTags}
                className="rounded bg-brand-primary px-2 py-0.5 text-xs text-white"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setEditandoTags(false)}
                className="rounded border border-brand-text/10 px-2 py-0.5 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs text-brand-primary"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditandoTags(!editandoTags)}
            className="text-xs text-brand-text/60 hover:text-brand-primary"
          >
            ✎ tags
          </button>
          <button
            type="button"
            onClick={handleRemover}
            className="text-xs text-red-500 hover:underline"
          >
            🗑 remover
          </button>
        </div>
      </div>
    </div>
  );
}
