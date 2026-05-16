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

type Props = {
  franqueadaId: string;
  aprovacao: Record<string, unknown> | null;
  posts: Array<Record<string, unknown>>;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_LABEL: Record<string, string> = {
  feed_imagem: "Feed",
  feed_carrossel: "Carousel",
  reels: "Reels",
  stories: "Stories",
};

export function AprovacaoViewEN({ franqueadaId: _franqueadaId, aprovacao, posts }: Props) {
  const router = useRouter();
  const [postsState, setPostsState] = useState(posts);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!aprovacao || postsState.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-3 text-5xl">📭</div>
        <h2 className="mb-2 text-xl font-semibold">
          No week awaiting approval
        </h2>
        <p className="mb-6 text-sm text-brand-text/60">
          When the system generates the next week of posts, they will appear here.
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={async () => {
            setGenerating(true);
            setErr(null);
            const r = await gerarSemanaManual();
            setGenerating(false);
            if (r.ok) {
              setMsg(`${r.total} posts generated! Reloading...`);
              setTimeout(() => window.location.reload(), 500);
            } else {
              setErr(r.erro ?? "Failed to generate");
            }
          }}
          className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {generating ? "Generating week..." : "✨ Generate week now"}
        </button>
        {msg && <div className="mt-3 text-sm text-green-600">{msg}</div>}
        {err && <div className="mt-3 text-sm text-red-600">{err}</div>}
      </div>
    );
  }

  const pending = postsState.filter(
    (p) => (p.status as string) === "aguardando_aprovacao",
  );
  const approved = postsState.filter((p) => (p.status as string) === "aprovado");
  const cancelled = postsState.filter((p) => (p.status as string) === "cancelado");

  async function handleApproveAll() {
    setErr(null);
    startTransition(async () => {
      const r = await aprovarSemanaToda(aprovacao!.id as string);
      if (r.ok) {
        setMsg(
          "Week approved! Posts will be published to Instagram at the scheduled time via the Graph API (instagram_content_publish).",
        );
        setTimeout(() => router.push("/en/dashboard"), 1800);
      } else {
        setErr(r.erro ?? "Error");
      }
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-text/60">
            Week of {new Date(aprovacao.semana_ref as string).toLocaleDateString("en-US")}
          </div>
          <div className="mt-1 text-lg font-semibold text-brand-text">
            {postsState.length} posts · {pending.length} pending · {approved.length} approved
            {cancelled.length > 0 && ` · ${cancelled.length} cancelled`}
          </div>
          {aprovacao.deadline && (
            <div className="mt-0.5 text-xs text-amber-600">
              Deadline: {new Date(aprovacao.deadline as string).toLocaleString("en-US")}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleApproveAll}
          disabled={isPending || pending.length === 0}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {isPending ? "Approving..." : "✓ Approve & publish all"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {err}
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

function ReplaceButton({
  postId,
  onReplaced,
}: {
  postId: string;
  onReplaced: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle() {
    setGenerating(true);
    setErr(null);
    const r = await gerarPostSubstituto(postId);
    setGenerating(false);
    if (r.ok) {
      onReplaced();
    } else {
      setErr(r.erro ?? "Error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={generating}
        className="rounded-md border border-brand-primary bg-brand-primary/5 px-2 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
      >
        {generating ? "Generating..." : "✨ Generate replacement"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
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
  const [editing, setEditing] = useState(false);
  const [copy, setCopy] = useState((post.copy_legenda as string) ?? "");
  const [cta, setCta] = useState((post.copy_cta as string) ?? "");
  const [saving, setSaving] = useState(false);

  const date = post.data_hora_agendada
    ? new Date(post.data_hora_agendada as string)
    : null;
  const dayLabel = date ? `${WEEK_DAYS[date.getDay()]} · ${date.toLocaleDateString("en-US")}` : "—";
  const timeLabel = date ? date.toTimeString().slice(0, 5) : "";
  const status = (post.status as string) ?? "aguardando_aprovacao";
  const imgUrl = post.url_imagem_final as string | null;

  async function saveEdit() {
    setSaving(true);
    const r = await atualizarCopyPost(post.id as string, {
      copy_legenda: copy,
      copy_cta: cta,
    });
    setSaving(false);
    if (r.ok) {
      onUpdate({ ...post, copy_legenda: copy, copy_cta: cta, editado_pela_nutri: true });
      setEditing(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this post?")) return;
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
        <img src={imgUrl} alt="Creative" className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-brand-muted text-4xl">
          🎨
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-brand-primary">
            {TYPE_LABEL[post.tipo_post as string] ?? post.tipo_post as string}
          </span>
          <span className="text-brand-text/50">
            {dayLabel} {timeLabel}
          </span>
        </div>

        {editing ? (
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
              placeholder="Call to action"
              className="w-full rounded-lg border border-brand-text/10 p-2 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setCopy((post.copy_legenda as string) ?? "");
                  setCta((post.copy_cta as string) ?? "");
                }}
                className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs hover:border-brand-text/30"
              >
                Cancel
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
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-brand-text/10 px-2 py-1 text-xs hover:border-brand-primary"
                  >
                    ✎ Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    🗑 Cancel
                  </button>
                </>
              )}
              {status === "aprovado" && (
                <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  ✓ Approved
                </span>
              )}
              {status === "cancelado" && (
                <>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    Cancelled
                  </span>
                  <ReplaceButton
                    postId={post.id as string}
                    onReplaced={() => window.location.reload()}
                  />
                </>
              )}
              {post.editado_pela_nutri && status !== "cancelado" && (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  ✎ edited
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
