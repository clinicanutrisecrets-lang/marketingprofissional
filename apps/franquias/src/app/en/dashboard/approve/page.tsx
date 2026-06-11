import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EnApprovePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const admin = createAdminClient();
  const { data: fData } = await admin
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const franqueadaId = (fData as Record<string, unknown> | null)?.id as string | undefined;

  const { data: postsRaw } = await admin
    .from("posts_agendados")
    .select("id, tipo_post, legenda, imagem_url, status, agendado_para, criado_em")
    .eq("franqueada_id", franqueadaId ?? "")
    .eq("status", "aguardando_aprovacao")
    .order("criado_em", { ascending: false })
    .limit(20);

  const posts = (postsRaw ?? []) as Array<Record<string, unknown>>;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-6">
          <Link href="/en/dashboard" className="text-xs font-medium text-brand-text/60 hover:text-brand-primary">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-brand-text">Content Approval</h1>
          <p className="text-sm text-brand-text/60">
            Review AI-generated posts before they are published to your Instagram
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-brand-text">All caught up!</p>
            <p className="mt-1 text-sm text-brand-text/60">
              No posts waiting for your approval right now.
            </p>
            <p className="mt-4 text-xs text-brand-text/40">
              Every Sunday morning, AI generates a weekly content pack for your approval.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              <strong>{posts.length} post{posts.length !== 1 ? "s" : ""}</strong> waiting for your review.
              Approved posts will be automatically published on the scheduled date.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((p) => (
                <div key={p.id as string} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  {p.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imagem_url as string}
                      alt="Post image"
                      className="h-52 w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-brand-text/5 px-2 py-0.5 text-xs font-medium text-brand-text/60">
                        {(p.tipo_post as string)?.replace("_", " ") ?? "post"}
                      </span>
                      {p.agendado_para && (
                        <span className="text-xs text-brand-text/40">
                          Scheduled: {new Date(p.agendado_para as string).toLocaleDateString("en-US")}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-4 text-sm text-brand-text">
                      {p.legenda as string}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/dashboard/aprovar?id=${p.id as string}`}
                        className="flex-1 rounded-lg bg-brand-primary py-2 text-center text-sm font-semibold text-white hover:opacity-90"
                      >
                        Review &amp; approve
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
