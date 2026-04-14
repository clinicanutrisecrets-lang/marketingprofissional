import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { formatK } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  const { data: perfis } = await aline
    .from("perfis")
    .select("*")
    .eq("ativo", true);

  const lista = (perfis ?? []) as Array<Record<string, unknown>>;

  // Busca métricas da última semana de cada perfil
  const ultimaSemanaInicio = new Date();
  ultimaSemanaInicio.setDate(ultimaSemanaInicio.getDate() - 7);
  const semanaIso = ultimaSemanaInicio.toISOString();

  const postsPorPerfil: Record<string, { total: number; alcance: number; engajamento: number; aguardando: number }> = {};
  for (const p of lista) {
    const perfilId = p.id as string;
    const { data: posts } = await aline
      .from("posts")
      .select("status, alcance, engajamento")
      .eq("perfil_id", perfilId)
      .gte("criado_em", semanaIso);

    const postsList = (posts ?? []) as Array<Record<string, unknown>>;
    postsPorPerfil[perfilId] = {
      total: postsList.length,
      alcance: sum(postsList, "alcance"),
      engajamento: sum(postsList, "engajamento"),
      aguardando: postsList.filter((p) => p.status === "aguardando_aprovacao").length,
    };
  }

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-aline-text/50">
              Sistema interno · privado
            </div>
            <h1 className="mt-1 text-3xl font-bold text-aline-text">Studio Aline</h1>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-aline-text/10 bg-white px-3 py-1.5 text-sm hover:border-aline-scanner"
            >
              Sair
            </button>
          </form>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
            Seus perfis
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {lista.map((p) => {
              const stats = postsPorPerfil[p.id as string] ?? {
                total: 0,
                alcance: 0,
                engajamento: 0,
                aguardando: 0,
              };
              const cor = (p.cor_primaria as string) || "#0BB8A8";
              return (
                <Link
                  key={p.id as string}
                  href={`/perfis/${p.slug}`}
                  className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ background: cor }}
                    />
                    <h3 className="text-xl font-semibold text-aline-text">
                      @{p.instagram_handle as string}
                    </h3>
                    {p.instagram_conta_id ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        conectado
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        conectar
                      </span>
                    )}
                  </div>
                  <p className="mb-4 text-sm text-aline-text/60">{p.objetivo as string}</p>

                  <div className="grid grid-cols-4 gap-2 border-t border-aline-text/5 pt-4 text-xs">
                    <Metric label="Posts 7d" value={stats.total.toString()} />
                    <Metric label="Alcance" value={formatK(stats.alcance)} />
                    <Metric label="Engajamento" value={formatK(stats.engajamento)} />
                    <Metric
                      label="Pendentes"
                      value={stats.aguardando.toString()}
                      alerta={stats.aguardando > 0}
                    />
                  </div>

                  <div className="mt-3 text-right text-xs font-medium text-aline-scanner group-hover:underline">
                    Abrir perfil →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">
            Ações globais
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <ActionCard
              icone="📊"
              titulo="Relatório unificado"
              descricao="Comparar performance dos 2 perfis"
              href="/relatorios"
              disponivel={false}
              badge="em breve"
            />
            <ActionCard
              icone="💡"
              titulo="Banco de ideias"
              descricao="Ideias geradas pela IA + suas"
              href="/ideias"
              disponivel={false}
              badge="em breve"
            />
            <ActionCard
              icone="⚙️"
              titulo="Configurações"
              descricao="Pilares, tom, integrações"
              href="/configuracoes"
              disponivel={false}
              badge="em breve"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function sum(list: Array<Record<string, unknown>>, campo: string): number {
  return list.reduce((acc, p) => acc + ((p[campo] as number) ?? 0), 0);
}

function Metric({ label, value, alerta }: { label: string; value: string; alerta?: boolean }) {
  return (
    <div>
      <div className="text-aline-text/50">{label}</div>
      <div
        className={`mt-0.5 font-bold ${
          alerta ? "text-amber-600" : "text-aline-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ActionCard({
  icone,
  titulo,
  descricao,
  href,
  disponivel,
  badge,
}: {
  icone: string;
  titulo: string;
  descricao: string;
  href: string;
  disponivel: boolean;
  badge?: string;
}) {
  const inner = (
    <div className="h-full rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-2xl">{icone}</span>
        {badge && (
          <span className="rounded-full bg-aline-text/5 px-2 py-0.5 text-xs font-medium text-aline-text/60">
            {badge}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-aline-text">{titulo}</div>
      <div className="mt-1 text-xs text-aline-text/60">{descricao}</div>
    </div>
  );
  return disponivel ? (
    <Link href={href}>{inner}</Link>
  ) : (
    <div className="cursor-not-allowed opacity-70">{inner}</div>
  );
}
