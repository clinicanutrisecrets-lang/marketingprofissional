import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarBiblioteca } from "@/lib/videos/actions";
import { listarAcervo } from "@/lib/videos/acervo";
import { BibliotecaView } from "./BibliotecaView";
import type { VideoBiblioteca } from "@scanner/ui";

export const dynamic = "force-dynamic";

export default async function BibliotecaVideosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [videos, acervo] = await Promise.all([listarBiblioteca(), listarAcervo()]);

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
            Vídeos curtos de apoio (b-roll) pros seus reels. A IA escolhe daqui
            o clipe que entra por cima da sua fala nos cortes automáticos.
          </p>
        </header>

        <BibliotecaView
          videos={videos as unknown as VideoBiblioteca[]}
          acervo={acervo as unknown as VideoBiblioteca[]}
        />
      </div>
    </main>
  );
}
