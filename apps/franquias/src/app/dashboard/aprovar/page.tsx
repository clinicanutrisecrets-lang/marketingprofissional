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
    .select(
      "id, nome_comercial, aprovacao_modo, instagram_conta_id, instagram_access_token, instagram_token_expiry, publer_profile_id",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  const f = franqueada as {
    id: string;
    nome_comercial: string | null;
    aprovacao_modo: string | null;
    instagram_conta_id: string | null;
    instagram_access_token: string | null;
    instagram_token_expiry: string | null;
    publer_profile_id: string | null;
  };

  // A tela dizia "posts serão publicados no horário agendado" pra TODA conta.
  // Publicar automático depende de um canal: token do Instagram (que depende da
  // aprovação do app na Meta) ou perfil no Publer. Sem canal o cron marca
  // `semCanal` e deixa o post parado em "aprovado" — a nutri esperava a
  // publicação que nunca vinha. Só prometemos o que a conta consegue cumprir.
  const tokenValido =
    !!f.instagram_conta_id &&
    !!f.instagram_access_token &&
    (!f.instagram_token_expiry || new Date(f.instagram_token_expiry).getTime() > Date.now());
  const publicacaoAutomatica = tokenValido || !!f.publer_profile_id;

  // Aprovação mais recente, INDEPENDENTE do status.
  //
  // 🔴 Antes filtrava só ("aguardando", "aprovada_com_edicoes"): no instante em
  // que a nutri aprovava, a semana virava "aprovada_integral", saía do filtro,
  // e a tela caía numa aprovação velha e vazia mostrando "Nenhuma semana
  // aguardando aprovação". Ela aprovava 13 posts e via a semana sumir
  // (Juliana, 08/09/2026). Os posts nunca foram perdidos, só deixaram de ter
  // onde aparecer: esta é a única tela do painel que lista posts_agendados.
  const { data: aprovacao } = await supabase
    .from("aprovacoes_semanais")
    .select("*")
    .eq("franqueada_id", f.id)
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
          publicacaoAutomatica={publicacaoAutomatica}
        />
      </div>
    </main>
  );
}
