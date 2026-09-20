"use client";

import { useState, useTransition } from "react";

/**
 * Biblioteca de vídeos (b-roll) — tela compartilhada pelos dois produtos.
 *
 *   Scanner Franquias → biblioteca da franqueada (public.videos_franqueada)
 *   Studio Aline      → biblioteca do perfil     (aline.videos_perfil)
 *
 * As duas telas eram cópias divergentes: a da Aline só tinha Pexels, a das
 * franquias só tinha upload (a aba do Pexels existia mas não era alcançável).
 * Aqui as duas capacidades convivem e cada app injeta as próprias server
 * actions via `acoes` — o componente não conhece Supabase nem schema.
 *
 * O ACERVO compartilhado (public.acervo_videos) entra como uma aba só de
 * leitura: clipe curado que serve pros dois produtos, sem duplicar arquivo.
 *
 * Estilo: só classes neutras do Tailwind (as marcas têm tokens diferentes) +
 * `corPrimaria` inline nos elementos de destaque.
 */

export type VideoBiblioteca = {
  id: string;
  titulo: string;
  descricao?: string | null;
  url: string;
  thumbnail_url?: string | null;
  duracao_seg?: number | null;
  tags?: string[] | null;
  fonte?: string | null;
};

export type VideoPexels = {
  url: string;
  thumbnail: string;
  duracao: number;
  pexelsId: number;
};

export type AcoesBiblioteca = {
  /** Sobe o arquivo e devolve a URL final. Sem isto, a aba de upload some. */
  upload?: (fd: FormData) => Promise<{ ok: boolean; url?: string; erro?: string }>;
  adicionar: (v: {
    titulo: string;
    descricao?: string;
    url: string;
    tags: string[];
    fonte: "upload" | "pexels";
    pexels_video_id?: string;
    thumbnail_url?: string;
    duracao_seg?: number;
  }) => Promise<{ ok: boolean; id?: string; erro?: string }>;
  /**
   * Grava no acervo COMPARTILHADO em vez da biblioteca deste perfil/franqueada.
   * Só quem cura o acervo (admin) recebe isto; sem ela a opção nem aparece.
   */
  adicionarAoAcervo?: (v: {
    titulo: string;
    descricao?: string;
    url: string;
    tags: string[];
    fonte: "upload" | "pexels";
    pexels_video_id?: string;
    thumbnail_url?: string;
    duracao_seg?: number;
  }) => Promise<{ ok: boolean; id?: string; erro?: string }>;
  remover: (id: string) => Promise<{ ok: boolean; erro?: string }>;
  atualizarTags?: (id: string, tags: string[]) => Promise<unknown>;
  /** Sem isto, a aba do Pexels some. */
  buscarPexels?: (q: string) => Promise<{ ok: boolean; video?: VideoPexels; erro?: string }>;
  sugerirTags?: (
    titulo: string,
    descricao?: string,
  ) => Promise<{ ok: boolean; tags?: string[]; erro?: string }>;
};

type Aba = "upload" | "pexels" | "acervo";

const DICA_DESCRICAO =
  'O que se vê na cena (ex: "Mulher de costas caminhando num corredor claro, luz de manhã")';

function normalizarTags(entrada: string): string[] {
  return entrada
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function BibliotecaVideos({
  videos: inicial,
  acervo = [],
  corPrimaria = "#0BB8A8",
  acoes,
}: {
  videos: VideoBiblioteca[];
  acervo?: VideoBiblioteca[];
  corPrimaria?: string;
  acoes: AcoesBiblioteca;
}) {
  const abas: Aba[] = [
    ...(acoes.upload ? (["upload"] as Aba[]) : []),
    ...(acoes.buscarPexels ? (["pexels"] as Aba[]) : []),
    ...(acervo.length > 0 ? (["acervo"] as Aba[]) : []),
  ];
  const [aba, setAba] = useState<Aba>(abas[0] ?? "upload");
  const [videos, setVideos] = useState(inicial);

  const rotulo: Record<Aba, string> = {
    upload: "📤 Subir vídeo",
    pexels: "🔎 Buscar no Pexels",
    acervo: `📚 Acervo (${acervo.length})`,
  };

  function adicionado(v: VideoBiblioteca) {
    setVideos((prev) => [v, ...prev]);
  }

  return (
    <>
      {abas.length > 1 && (
        <div className="mb-4 flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          {abas.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                aba === a ? "text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              style={aba === a ? { background: corPrimaria } : undefined}
            >
              {rotulo[a]}
            </button>
          ))}
        </div>
      )}

      {aba === "upload" && acoes.upload && (
        <FormUpload acoes={acoes} corPrimaria={corPrimaria} onAdded={adicionado} />
      )}
      {aba === "pexels" && acoes.buscarPexels && (
        <FormPexels acoes={acoes} corPrimaria={corPrimaria} onAdded={adicionado} />
      )}
      {aba === "acervo" && <ListaAcervo videos={acervo} />}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Sua biblioteca ({videos.length})
        </h2>
        {videos.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">🎥</div>
            <p className="text-sm text-slate-500">
              Nenhum vídeo seu ainda. Suba os seus acima
              {acervo.length > 0 ? " — o acervo compartilhado já está disponível pra IA usar." : "."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {videos.map((v) => (
              <CardVideo
                key={v.id}
                video={v}
                acoes={acoes}
                onRemoved={(id) => setVideos((p) => p.filter((x) => x.id !== id))}
                onTags={(id, tags) =>
                  setVideos((p) => p.map((x) => (x.id === id ? { ...x, tags } : x)))
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CamposMeta({
  titulo,
  setTitulo,
  descricao,
  setDescricao,
  tags,
  setTags,
  acoes,
  corPrimaria,
}: {
  titulo: string;
  setTitulo: (v: string) => void;
  descricao: string;
  setDescricao: (v: string) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  acoes: AcoesBiblioteca;
  corPrimaria: string;
}) {
  const [tagsInput, setTagsInput] = useState("");
  const [sugerindo, setSugerindo] = useState(false);

  async function sugerir() {
    if (!acoes.sugerirTags || !titulo.trim()) return;
    setSugerindo(true);
    const r = await acoes.sugerirTags(titulo, descricao || undefined);
    setSugerindo(false);
    if (r.ok && r.tags) setTags([...new Set([...tags, ...r.tags])]);
  }

  return (
    <>
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder='Título descritivo (ex: "Mãos cortando vegetais na tábua")'
        className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm"
      />

      <div>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder={DICA_DESCRICAO}
          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Quanto melhor a descrição e as tags, melhor a IA escolhe este clipe pra
          ilustrar o momento certo da fala nos cortes automáticos.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Tags</label>
          {acoes.sugerirTags && (
            <button
              type="button"
              onClick={sugerir}
              disabled={sugerindo || !titulo}
              className="text-xs font-medium hover:underline disabled:opacity-60"
              style={{ color: corPrimaria }}
            >
              {sugerindo ? "Pensando..." : "✨ Sugerir com IA"}
            </button>
          )}
        </div>
        <div className="mb-2 flex flex-wrap gap-1">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              style={{ background: `${corPrimaria}1a`, color: corPrimaria }}
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
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              setTags([...new Set([...tags, ...normalizarTags(tagsInput)])]);
              setTagsInput("");
            }}
            placeholder="Digite tags separadas por vírgula e dê Enter"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              setTags([...new Set([...tags, ...normalizarTags(tagsInput)])]);
              setTagsInput("");
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-slate-400"
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}

function FormUpload({
  acoes,
  corPrimaria,
  onAdded,
}: {
  acoes: AcoesBiblioteca;
  corPrimaria: string;
  onAdded: (v: VideoBiblioteca) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [paraAcervo, setParaAcervo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function enviar() {
    if (!arquivo || !titulo || !acoes.upload) {
      setErro("Escolha o arquivo e preencha o título");
      return;
    }
    setEnviando(true);
    setErro(null);
    const fd = new FormData();
    fd.append("file", arquivo);
    fd.append("tipo", "outro");
    const up = await acoes.upload(fd);
    if (!up.ok || !up.url) {
      setErro(up.erro ?? "Falha no upload");
      setEnviando(false);
      return;
    }
    const noAcervo = paraAcervo && !!acoes.adicionarAoAcervo;
    const salvar = noAcervo ? acoes.adicionarAoAcervo! : acoes.adicionar;
    const r = await salvar({ titulo, descricao, url: up.url, tags, fonte: "upload" });
    setEnviando(false);
    if (!r.ok || !r.id) {
      setErro(r.erro ?? "Erro ao salvar");
      return;
    }
    if (noAcervo) {
      setMsg("Salvo no acervo compartilhado! Recarregue a página pra vê-lo na aba Acervo.");
      setTimeout(() => setMsg(null), 4000);
    } else {
      onAdded({ id: r.id, titulo, descricao, url: up.url, tags, fonte: "upload" });
    }
    setArquivo(null);
    setTitulo("");
    setDescricao("");
    setTags([]);
    if (!noAcervo) {
      setMsg("Vídeo adicionado!");
      setTimeout(() => setMsg(null), 2500);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-6 text-center transition hover:border-slate-400">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
        />
        <div className="text-sm text-slate-700">
          {arquivo ? `📹 ${arquivo.name}` : "Clique pra escolher um vídeo"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          MP4, MOV, WEBM · até 50MB · ideal 6-8s, vertical 9:16, sem texto
        </div>
      </label>

      <CamposMeta
        titulo={titulo}
        setTitulo={setTitulo}
        descricao={descricao}
        setDescricao={setDescricao}
        tags={tags}
        setTags={setTags}
        acoes={acoes}
        corPrimaria={corPrimaria}
      />

      {acoes.adicionarAoAcervo && (
        <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={paraAcervo}
            onChange={(e) => setParaAcervo(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Salvar no <strong>acervo compartilhado</strong> (clipe coringa)
            <span className="block text-xs text-slate-500">
              Fica disponível pra todos os perfis e franqueadas, e pro corte com
              IA. Use pra cena genérica; o que for específico deste perfil deixe
              desmarcado.
            </span>
          </span>
        </label>
      )}

      {msg && <div className="rounded-lg bg-green-50 p-2 text-xs text-green-700">{msg}</div>}
      {erro && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{erro}</div>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !arquivo || !titulo}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: corPrimaria }}
      >
        {enviando ? "Enviando..." : "💾 Adicionar à biblioteca"}
      </button>
    </div>
  );
}

function FormPexels({
  acoes,
  corPrimaria,
  onAdded,
}: {
  acoes: AcoesBiblioteca;
  corPrimaria: string;
  onAdded: (v: VideoBiblioteca) => void;
}) {
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState<VideoPexels | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    if (!query || !acoes.buscarPexels) return;
    setBuscando(true);
    setErro(null);
    setResultado(null);
    const r = await acoes.buscarPexels(query);
    setBuscando(false);
    if (r.ok && r.video) {
      setResultado(r.video);
      setTitulo(query);
      setTags(normalizarTags(query.replace(/\s+/g, ",")));
    } else {
      setErro(r.erro ?? "Sem resultados");
    }
  }

  async function salvar() {
    if (!resultado) return;
    const r = await acoes.adicionar({
      titulo,
      descricao,
      url: resultado.url,
      tags,
      fonte: "pexels",
      pexels_video_id: String(resultado.pexelsId),
      thumbnail_url: resultado.thumbnail,
      duracao_seg: resultado.duracao,
    });
    if (!r.ok || !r.id) {
      setErro(r.erro ?? "Erro ao salvar");
      return;
    }
    onAdded({
      id: r.id,
      titulo,
      descricao,
      url: resultado.url,
      thumbnail_url: resultado.thumbnail,
      duracao_seg: resultado.duracao,
      tags,
      fonte: "pexels",
    });
    setQuery("");
    setTitulo("");
    setDescricao("");
    setTags([]);
    setResultado(null);
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder='Em inglês funciona melhor: "healthy food", "walking morning"'
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={buscar}
          disabled={buscando || !query}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: corPrimaria }}
        >
          {buscando ? "..." : "Buscar"}
        </button>
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{erro}</div>}

      {resultado && (
        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={resultado.url}
            poster={resultado.thumbnail}
            controls
            className="w-full rounded-lg"
            style={{ maxHeight: 400 }}
          />
          <CamposMeta
            titulo={titulo}
            setTitulo={setTitulo}
            descricao={descricao}
            setDescricao={setDescricao}
            tags={tags}
            setTags={setTags}
            acoes={acoes}
            corPrimaria={corPrimaria}
          />
          <button
            type="button"
            onClick={salvar}
            disabled={!titulo}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: corPrimaria }}
          >
            ➕ Adicionar à biblioteca
          </button>
        </div>
      )}
    </div>
  );
}

function ListaAcervo({ videos }: { videos: VideoBiblioteca[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-600">
        Clipes coringa mantidos pela equipe, disponíveis pra todo mundo. A IA já
        usa nos cortes automáticos quando combinam com a fala. Não dá pra editar
        aqui: se faltar algo, peça pra equipe adicionar.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {videos.map((v) => (
          <div key={v.id} className="overflow-hidden rounded-xl bg-slate-50">
            {v.thumbnail_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={v.thumbnail_url}
                alt={v.titulo}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-2xl">
                🎬
              </div>
            )}
            <div className="p-3">
              <h3 className="truncate text-sm font-medium text-slate-800">{v.titulo}</h3>
              {v.descricao && (
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{v.descricao}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {(v.tags ?? []).slice(0, 6).map((t, i) => (
                  <span key={i} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardVideo({
  video,
  acoes,
  onRemoved,
  onTags,
}: {
  video: VideoBiblioteca;
  acoes: AcoesBiblioteca;
  onRemoved: (id: string) => void;
  onTags: (id: string, tags: string[]) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [entrada, setEntrada] = useState((video.tags ?? []).join(", "));
  const [pending, startTransition] = useTransition();
  const tags = video.tags ?? [];

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {video.thumbnail_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={video.thumbnail_url}
          alt={video.titulo}
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-2xl">
          🎬
        </div>
      )}
      <div className="p-3">
        <h3 className="mb-1 truncate text-sm font-medium text-slate-800">{video.titulo}</h3>
        <div className="mb-2 text-xs text-slate-500">
          {video.fonte === "pexels" ? "🔎 Pexels" : "📤 Upload"}
          {video.duracao_seg ? ` · ${video.duracao_seg}s` : ""}
        </div>

        {editando && acoes.atualizarTags ? (
          <div className="mb-2 flex gap-1">
            <input
              type="text"
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const novas = normalizarTags(entrada);
                  await acoes.atualizarTags!(video.id, novas);
                  onTags(video.id, novas);
                  setEditando(false);
                })
              }
              className="rounded bg-slate-800 px-2 py-1 text-xs text-white"
            >
              ok
            </button>
          </div>
        ) : (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-3 text-xs">
          {acoes.atualizarTags && (
            <button
              type="button"
              onClick={() => setEditando((e) => !e)}
              className="text-slate-500 hover:underline"
            >
              {editando ? "cancelar" : "✏️ tags"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                if (!confirm("Remover esse vídeo da biblioteca?")) return;
                const r = await acoes.remover(video.id);
                if (r.ok) onRemoved(video.id);
              })
            }
            className="text-red-500 hover:underline"
          >
            🗑 remover
          </button>
        </div>
      </div>
    </div>
  );
}
