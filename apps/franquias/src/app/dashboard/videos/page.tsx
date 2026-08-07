import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReelAnimadoSection, type ReelAnimado } from "../conteudo/ReelAnimadoSection";

export const dynamic = "force-dynamic";

export default async function VideosHubPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) redirect("/onboarding");

  const { data: reelsData } = await supabase
    .from("reels_animados")
    .select("id, tema, duracao, status, url, criado_em")
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(10);
  const reels = (reelsData ?? []) as ReelAnimado[];

  return (
    <main className="mx-auto max-w-5xl py-6 lg:py-10 lg:pl-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-brand-text">🎬 Vídeos</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
          Tudo de vídeo num lugar só: escolha o caminho que combina com o
          conteúdo de hoje.
        </p>
      </header>

      {/* Os 3 caminhos */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/biblioteca-videos"
          className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl">💬</div>
          <h2 className="mt-3 font-bold text-brand-text">Legendar vídeo com IA</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Suba um vídeo seu e a IA adiciona legendas animadas
            automaticamente — pronto pra postar.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">
            Começar →
          </span>
        </Link>

        <Link
          href="/dashboard/teleprompter"
          className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl">🎥</div>
          <h2 className="mt-3 font-bold text-brand-text">Roteiro + Teleprompter</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Grave você lendo o roteiro que rola na tela do celular. Roteiros
            prontos toda semana no Estúdio, ou escreva o seu.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">
            Abrir teleprompter →
          </span>
        </Link>

        <a
          href="#reel-animado"
          className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl">🎞️</div>
          <h2 className="mt-3 font-bold text-brand-text">Vídeo animado</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Animação estilo Detetive da Saúde (sintomas, genes, alimentos) —
            gerada do zero, sem você aparecer.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">
            Gerar abaixo ↓
          </span>
        </a>
      </div>

      <div id="reel-animado">
        <ReelAnimadoSection reels={reels} />
      </div>
    </main>
  );
}
