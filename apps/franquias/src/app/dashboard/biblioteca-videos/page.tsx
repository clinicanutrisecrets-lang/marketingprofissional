import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarBiblioteca } from "@/lib/videos/actions";
import { BibliotecaView } from "./BibliotecaView";

export const dynamic = "force-dynamic";

export default async function BibliotecaVideosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const videos = await listarBiblioteca();

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">
            🎬 Meus vídeos
          </h1>
          <p className="text-sm text-brand-text/60">
            Guarde aqui seus vídeos curtos e clipes do Pexels pra usar nos seus
            reels quando quiser.
          </p>
        </header>

        <BibliotecaView videos={videos} />
      </div>
    </main>
  );
}
