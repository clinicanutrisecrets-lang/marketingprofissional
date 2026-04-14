import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AprovacaoView } from "./AprovacaoView";

export const dynamic = "force-dynamic";

export default async function AprovarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, aprovacao_modo")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  const f = franqueada as { id: string; nome_comercial: string | null; aprovacao_modo: string | null };

  // Busca aprovação mais recente
  const { data: aprovacao } = await supabase
    .from("aprovacoes_semanais")
    .select("*")
    .eq("franqueada_id", f.id)
    .in("status", ["aguardando", "aprovada_com_edicoes"])
    .order("semana_ref", { ascending: false })
    .limit(1)
    .maybeSingle();

  const aprovacaoRow = aprovacao as Record<string, unknown> | null;

  // Busca posts da aprovação
  let posts: Array<Record<string, unknown>> = [];
  if (aprovacaoRow) {
    const { data: postsData } = await supabase
      .from("posts_agendados")
      .select("*")
      .eq("aprovacao_semanal_id", aprovacaoRow.id)
      .order("data_hora_agendada", { ascending: true });
    posts = (postsData ?? []) as Array<Record<string, unknown>>;
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

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Aprovação semanal</h1>
          <p className="text-sm text-brand-text/60">
            Revise os posts da semana e aprove tudo de uma vez.
          </p>
        </header>

        <AprovacaoView
          franqueadaId={f.id}
          aprovacao={aprovacaoRow}
          posts={posts}
        />
      </div>
    </main>
  );
}
