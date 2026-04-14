"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  aprovarSemanaToda,
  atualizarCopyPost,
  cancelarPost,
  gerarSemanaManual,
  gerarPostSubstituto,
} from "@/lib/posts/actions";
import { formatDate } from "@/lib/utils";

type Props = {
  franqueadaId: string;
  aprovacao: Record<string, unknown> | null;
  posts: Array<Record<string, unknown>>;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPO_LABEL: Record<string, string> = {
  feed_imagem: "Feed",
  feed_carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

export function AprovacaoView({ franqueadaId, aprovacao, posts }: Props) {
  const router = useRouter();
  const [postsState, setPostsState] = useState(posts);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  if (!aprovacao || postsState.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-5xl">📭</div>
        <h2 className="mb-2 text-xl font-semibold">
          Nenhuma semana aguardando aprovação
        </h2>
        <p className="mb-6 text-sm text-brand-text/60">
          Quando o sistema gerar a próxima semana de posts, eles aparecem aqui.
        </p>
        <button
          type="button"
          disabled={gerando}
          onClick={async () => {
            setGerando(true);
            setErro(null);
            const r = await gerarSemanaManual();
            setGerando(false);
            if (r.ok) {
              setMsg(`${r.total} posts gerados! Recarregando...`);
              setTimeout(() => window.location.reload(), 500);
            } else {
              setErro(r.erro ?? "Erro ao gerar");
            }
          }}
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {gerando ? "Gerando semana..." : "✨ Gerar semana agora"}
        </button>
        {msg && <div className="mt-3 text-sm text-green-600">{msg}</div>}
        {erro && <div className="mt-3 text-sm text-red-600">{erro}</div>}
      </div>
    );
  }

  const pendentes = postsState.filter(
    (p) => (p.status as string) === "aguardando_aprovacao",
  );
  const aprovados = postsState.filter((p) => (p.status as string) === "aprovado");
  const cancelados = postsState.filter((p) => (p.status as string) === "cancelado");

  async function handleAprovarTudo() {
    setErro(null);
    startTransition(async () => {
      const r = await aprovarSemanaToda(aprovacao!.id as string);
      if (r.ok) {
        setMsg("Semana aprovada! Posts serão publicados no horário agendado.");
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setErro(r.erro ?? "Erro");
      }
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-text/60">
            Semana de {formatDate(aprovacao.semana_ref as string)}
          </div>
          <div className="mt-1 text-lg font-semibold text-brand-text">
            {postsState.length} posts · {pendentes.length} pendentes · {aprovados.length} aprovados
            {cancelados.length > 0 && ` · ${cancelados.length} cancelados`}
          </div>
          {aprovacao.deadline && (
            <div className="mt-0.5 text-xs text-amber-600">
              Deadline: {new Date(aprovacao.deadline as string).toLocaleString("pt-BR")}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAprovarTudo}
          disabled={isPending || pendentes.length === 0}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPending ? "Aprovando..." : "✓ Aprovar tudo de uma vez"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {postsState.map((post) => (
          <PostCard
            key={post.id as string}
            post={post}
            onUpdate={(updated) =>
              setPostsState((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
              )
            }
          />
        ))}
      </div>
    </>
  );
}

function SubstituirButton({
  postId,
  onSubstituido,
}: {
  postId: string;
  onSubstituido: () => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handle() {
    setGerando(true);
    setErro(null);
    const r = await gerarPostSubstituto(postId);
    setGerando(false);
    if (r.ok) {
      onSubstituido();
    } else {
      setErro(r.erro ?? "Erro");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={gerando}
        className="rounded-md border border-brand-primary bg-brand-primary/5 px-2 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
      >
        {gerando ? "Gerando..." : "✨ Gerar substituto"}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </>
  );
}

function PostCard({
  post,
  onUpdate,
}: {
  post: Record<string, unknown>;
  onUpdate: (p: Record<string, unknown>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [copy, setCopy] = useState((post.copy_legenda as string) ?? "");
  const [cta, setCta] = useState((post.copy_cta as string) ?? "");
  const [salvando, setSalvando] = useState(false);

  const data = post.data_hora_agendada
    ? new Date(post.data_hora_agendada as string)
    : null;
  const diaLabel = data ? `${DIAS_SEMANA[data.getDay()]} · ${data.toLocaleDateString("pt-BR")}` : "—";
  const horaLabel = data ? data.toTimeString().slice(0, 5) : "";
  const status = (post.status as string) ?? "aguardando_aprovacao";
  const imgUrl = post.url_imagem_final as string | null;

  async function salvarEdicao() {
    setSalvando(true);
    const r = await atualizarCopyPost(post.id as string, {
      copy_legenda: copy,
      copy_cta: cta,
    });
    setSalvando(false);
    if (r.ok) {
      onUpdate({ ...post, copy_legenda: copy, copy_cta: cta, editado_pela_nutri: true });
      setEditando(false);
    }
  }

  async function handleCancelar() {
    if (!confirm("Cancelar esse post?")) return;
    const r = await cancelarPost(post.id as string);
    if (r.ok) onUpdate({ ...post, status: "cancelado" });
  }

  const cardClasses =
    status === "aprovado"
      ? "border-green-300 bg-green-50/30"
      : status === "cancelado"
        ? "border-gray-200 bg-gray-50 opacity-60"
        : "border-brand-text/10 bg-white";

  return (
    <div className={`overflow-hidden rounded-2xl border-2 shadow-sm ${cardClasses}`}>
      {imgUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={imgUrl} alt="Criativo" className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-brand-muted text-4xl">
          🎨
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-brand-primary">
            {TIPO_LABEL[post.tipo_post as string] ?? post.tipo_post as string}
          </span>
          <span className="text-brand-text/50">
            {diaLabel} {horaLabel}
          </span>
        </div>

        {editando ? (
          <div className="space-y-2">
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-brand-text/10 p-2 text-xs"
            />
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="CTA"
              className="w-full rounded-lg border border-brand-text/10 p-2 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={salvando}
                className="flex-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setCopy((post.copy_legenda as string) ?? "");
                  setCta((post.copy_cta as string) ?? "");
                }}
                className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs hover:border-brand-text/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2 line-clamp-4 text-sm text-brand-text whitespace-pre-wrap">
              {copy}
            </p>
            {cta && (
              <p className="mb-2 text-xs font-semibold text-brand-primary">{cta}</p>
            )}
            {Array.isArray(post.hashtags) && (post.hashtags as string[]).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {(post.hashtags as string[]).slice(0, 4).map((h, i) => (
                  <span key={i} className="text-[10px] text-brand-primary">
                    #{h}
                  </span>
                ))}
                {(post.hashtags as string[]).length > 4 && (
                  <span className="text-[10px] text-brand-text/50">
                    +{(post.hashtags as string[]).length - 4}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {status === "aguardando_aprovacao" && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="rounded-md border border-brand-text/10 px-2 py-1 text-xs hover:border-brand-primary"
                  >
                    ✎ Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    🗑 Cancelar
                  </button>
                </>
              )}
              {status === "aprovado" && (
                <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  ✓ Aprovado
                </span>
              )}
              {status === "cancelado" && (
                <>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    Cancelado
                  </span>
                  <SubstituirButton
                    postId={post.id as string}
                    onSubstituido={() => window.location.reload()}
                  />
                </>
              )}
              {post.editado_pela_nutri && status !== "cancelado" && (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  ✎ editado
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
