import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { formatK, formatDate } from "@/lib/utils";
import { GerarReelButton } from "@/components/GerarReelButton";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function PerfilPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  const { data: perfilData } = await aline
    .from("perfis")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!perfilData) notFound();
  const perfil = perfilData as Record<string, unknown>;
  const cor = (perfil.cor_primaria as string) || "#0BB8A8";

  const { data: posts } = await aline
    .from("posts")
    .select("*")
    .eq("perfil_id", perfil.id as string)
    .order("data_hora_agendada", { ascending: false })
    .limit(20);

  const list = (posts ?? []) as Array<Record<string, unknown>>;

  const stats = {
    total: list.length,
    postados: list.filter((p) => p.status === "postado").length,
    agendados: list.filter((p) => p.status === "agendado" || p.status === "aprovado").length,
    aguardando: list.filter((p) => p.status === "aguardando_aprovacao").length,
  };

  const pilares = (perfil.pilares as Array<{ nome: string; pct: number }>) ?? [];

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar
        </Link>

        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-white"
                style={{ background: cor }}
              >
                @
              </div>
              <div>
                <h1 className="text-2xl font-bold text-aline-text">
                  @{perfil.instagram_handle as string}
                </h1>
                <p className="text-sm text-aline-text/60">{perfil.nome as string}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {perfil.instagram_conta_id ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  Instagram conectado
                </span>
              ) : (
                <a
                  href={`/api/auth/instagram/connect?slug=${perfil.slug as string}`}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                >
                  Conectar Instagram →
                </a>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-aline-text/70">{perfil.objetivo as string}</p>
        </header>

        <section className="mb-6 flex flex-wrap gap-3">
          <GerarReelButton perfilId={perfil.id as string} corPrimaria={cor} />
          <Link
            href={`/perfis/${perfil.slug}/biblioteca-videos`}
            className="rounded-lg border border-aline-text/10 bg-white px-4 py-2 text-sm font-medium hover:border-aline-scanner"
          >
            🎬 Biblioteca de vídeos
          </Link>
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Posts total" value={stats.total.toString()} />
          <StatCard label="Postados" value={stats.postados.toString()} cor="text-green-600" />
          <StatCard label="Agendados" value={stats.agendados.toString()} />
          <StatCard
            label="Aguardando"
            value={stats.aguardando.toString()}
            cor={stats.aguardando > 0 ? "text-amber-600" : "text-aline-text"}
          />
        </div>

        {pilares.length > 0 && (
          <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
              Pilares de conteúdo
            </h2>
            <div className="space-y-2">
              {pilares.map((p, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{p.nome.replace(/_/g, " ")}</span>
                    <span className="text-aline-text/60">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-aline-text/5">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${p.pct}%`, background: cor }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {Boolean(perfil.regras_especiais) && (
              <div className="mt-4 rounded-lg bg-aline-muted p-3 text-xs text-aline-text/70">
                <strong className="text-aline-text/80">Regra especial:</strong>{" "}
                {String(perfil.regras_especiais ?? "")}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
            Posts recentes
          </h2>
          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-aline-text/60">
              Nenhum post ainda. O sistema de geração semanal está sendo
              configurado.
            </p>
          ) : (
            <div className="divide-y divide-aline-text/5">
              {list.map((post) => (
                <div key={post.id as string} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <span className="font-medium uppercase" style={{ color: cor }}>
                          {(post.tipo as string) ?? "post"}
                        </span>
                        <span className="text-aline-text/40">·</span>
                        <span className="text-aline-text/60">
                          {formatDate(post.data_hora_agendada as string)}
                        </span>
                        {Boolean(post.origem) && (
                          <>
                            <span className="text-aline-text/40">·</span>
                            <span className="text-aline-text/60">
                              {(post.origem as string).replace(/_/g, " ")}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-aline-text/80">
                        {(post.copy_legenda as string) ?? "—"}
                      </p>
                    </div>
                    <PostStatus status={(post.status as string) ?? "gerando"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, cor }: { label: string; value: string; cor?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-aline-text/60">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${cor ?? "text-aline-text"}`}>{value}</div>
    </div>
  );
}

function PostStatus({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    gerando: { label: "Gerando", cls: "bg-blue-100 text-blue-800" },
    aguardando_aprovacao: { label: "Aguardando", cls: "bg-amber-100 text-amber-800" },
    aprovado: { label: "Aprovado", cls: "bg-green-100 text-green-800" },
    agendado: { label: "Agendado", cls: "bg-purple-100 text-purple-800" },
    postado: { label: "Postado", cls: "bg-gray-100 text-gray-700" },
    erro: { label: "Erro", cls: "bg-red-100 text-red-800" },
    cancelado: { label: "Cancelado", cls: "bg-gray-100 text-gray-500" },
  };
  const info = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}
