import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { listarBibliotecaPerfil } from "@/lib/videos/actions";
import { BibliotecaPerfilView } from "./BibliotecaPerfilView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function BibliotecaPerfilPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfilData } = await aline
    .from("perfis")
    .select("id, nome, slug, cor_primaria")
    .eq("slug", slug)
    .maybeSingle();
  if (!perfilData) notFound();
  const perfil = perfilData as { id: string; nome: string; slug: string; cor_primaria: string };

  const videos = await listarBibliotecaPerfil(perfil.id);

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link
          href={`/perfis/${perfil.slug}`}
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar pro perfil
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-aline-text">
            🎬 Biblioteca de vídeos · {perfil.nome}
          </h1>
          <p className="text-sm text-aline-text/60">
            Vídeos pra usar como B-roll nos reels desse perfil. IA escolhe automático
            por tags quando o tema bater.
          </p>
        </header>

        <BibliotecaPerfilView
          perfilId={perfil.id}
          videos={videos}
          corPrimaria={perfil.cor_primaria}
        />
      </div>
    </main>
  );
}
