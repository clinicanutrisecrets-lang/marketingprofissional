import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GerarSugestoesButton } from "./GerarSugestoesButton";
import { SugestaoCard, type Sugestao } from "./SugestaoCard";
import { ReelAnimadoSection, type ReelAnimado } from "./ReelAnimadoSection";

export const dynamic = "force-dynamic";

export default async function ConteudoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) redirect("/onboarding");
  const f = franqueada as { id: string; nome_comercial: string | null };

  const { data: sugestoesData } = await supabase
    .from("sugestoes_conteudo")
    .select("*")
    .eq("franqueada_id", f.id)
    .neq("status", "descartado")
    .order("semana_ref", { ascending: false })
    .order("ordem", { ascending: true })
    .limit(60);

  const sugestoes = (sugestoesData ?? []) as Sugestao[];

  const { data: reelsData } = await supabase
    .from("reels_animados")
    .select("id, tema, duracao, status, url, criado_em")
    .eq("franqueada_id", f.id)
    .order("criado_em", { ascending: false })
    .limit(10);
  const reels = (reelsData ?? []) as ReelAnimado[];

  // Agrupa por semana
  const porSemana = new Map<string, Sugestao[]>();
  for (const s of sugestoes) {
    const lista = porSemana.get(s.semana_ref) ?? [];
    lista.push(s);
    porSemana.set(s.semana_ref, lista);
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">Estúdio de conteúdo</h1>
            <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
              Sugestões semanais baseadas no que está em alta no seu nicho: arte
              pronta pra baixar, legenda pra copiar e roteiro de reels com
              teleprompter — é só gravar e postar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/conteudo/editor"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-sm ring-1 ring-brand-primary/20 hover:bg-brand-primary/5"
            >
              🖼️ Editor de arte
            </Link>
            <Link
              href="/dashboard/biblioteca-posts"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-sm ring-1 ring-brand-primary/20 hover:bg-brand-primary/5"
            >
              📚 Posts prontos
            </Link>
            <GerarSugestoesButton />
          </div>
        </header>

        <ReelAnimadoSection reels={reels} />

        {porSemana.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-10 text-center">
            <p className="text-brand-text/60">
              Nenhuma sugestão ainda. Clique em <strong>Gerar sugestões da semana</strong>{" "}
              pra criar seu primeiro calendário.
            </p>
          </div>
        ) : (
          Array.from(porSemana.entries()).map(([semana, lista]) => (
            <section key={semana} className="mb-10">
              <h2 className="mb-4 text-lg font-semibold text-brand-text">
                Semana de {formatSemana(semana)}
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                {lista.map((s) => (
                  <SugestaoCard key={s.id} sugestao={s} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

function formatSemana(semanaRef: string): string {
  const d = new Date(`${semanaRef}T00:00:00Z`);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}
