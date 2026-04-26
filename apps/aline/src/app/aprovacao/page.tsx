import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { GerarPackForm } from "./GerarPackForm";

export const dynamic = "force-dynamic";

type SemanaPendente = {
  perfilId: string;
  perfilSlug: string;
  perfilNome: string;
  semanaRef: string;
  qtd: number;
};

export default async function AprovacaoIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  // Lista todos os perfis ativos
  const { data: perfis } = await aline
    .from("perfis")
    .select("id, slug, nome")
    .eq("ativo", true);

  const perfilList = (perfis ?? []) as Array<{
    id: string;
    slug: string;
    nome: string;
  }>;

  // Pra cada perfil, conta posts aguardando por semana
  const semanasPendentes: SemanaPendente[] = [];
  for (const p of perfilList) {
    const { data: posts } = await aline
      .from("posts")
      .select("semana_ref")
      .eq("perfil_id", p.id)
      .eq("status", "aguardando_aprovacao")
      .eq("aprovacao_tipo", "bloco_semanal");

    const grupos = new Map<string, number>();
    for (const post of (posts ?? []) as Array<{ semana_ref: string | null }>) {
      const k = post.semana_ref ?? "(sem semana)";
      grupos.set(k, (grupos.get(k) ?? 0) + 1);
    }
    for (const [semanaRef, qtd] of grupos) {
      semanasPendentes.push({
        perfilId: p.id,
        perfilSlug: p.slug,
        perfilNome: p.nome,
        semanaRef,
        qtd,
      });
    }
  }

  semanasPendentes.sort((a, b) => a.semanaRef.localeCompare(b.semanaRef));

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar ao dashboard
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-aline-text">Aprovacao de pacotes semanais</h1>
          <p className="mt-2 text-sm text-aline-text/60">
            Toda quinta o sistema gera automaticamente o pack da semana seguinte.
            Voce tambem pode gerar a qualquer hora pelo botao abaixo (lancamentos,
            datas especiais).
          </p>
        </header>

        <GerarPackForm
          perfis={perfilList.map((p) => ({ slug: p.slug, nome: p.nome }))}
        />

        {semanasPendentes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-aline-text/20 bg-white p-10 text-center">
            <p className="text-aline-text/60">Nenhum pacote aguardando aprovacao agora.</p>
            <p className="mt-2 text-xs text-aline-text/40">
              Use o botao acima pra gerar agora ou espere a proxima quinta as 9h.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {semanasPendentes.map((s) => (
              <li
                key={`${s.perfilSlug}-${s.semanaRef}`}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-aline-text/50">
                      @{s.perfilSlug}
                    </p>
                    <h3 className="text-lg font-semibold text-aline-text">
                      Semana {formatSemana(s.semanaRef)}
                    </h3>
                    <p className="text-xs text-aline-text/60">
                      {s.qtd} {s.qtd === 1 ? "post" : "posts"} aguardando
                    </p>
                  </div>
                  <Link
                    href={`/aprovacao/${s.perfilSlug}/${s.semanaRef}`}
                    className="rounded-lg bg-aline-scanner px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Revisar e aprovar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function formatSemana(semanaRef: string): string {
  if (!semanaRef || semanaRef === "(sem semana)") return semanaRef;
  const d = new Date(`${semanaRef}T00:00:00Z`);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
