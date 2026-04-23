import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { StorytellingView } from "./StorytellingView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function StorytellingPerfilPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  const { data: perfil } = await aline
    .from("perfis")
    .select("id, slug, nome, instagram_handle")
    .eq("slug", slug)
    .maybeSingle();
  if (!perfil) notFound();

  const perfilRow = perfil as { id: string; slug: string; nome: string; instagram_handle: string };

  const { data: depoimentos } = await aline
    .from("depoimentos")
    .select("id, titulo, quem_era, problema_inicial, resultado")
    .eq("perfil_id", perfilRow.id)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  const { data: historico } = await aline
    .from("storytellings_gerados")
    .select("id, modo, versao_post_longo, versao_post_curto, criado_em")
    .eq("perfil_id", perfilRow.id)
    .order("criado_em", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Dashboard
        </a>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">
            Storytelling — @{perfilRow.instagram_handle}
          </h1>
          <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700">
            {perfilRow.nome}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          3 modos: depoimento real, público se reconhece, ideia → história curta.
        </p>

        <StorytellingView
          perfilSlug={perfilRow.slug}
          depoimentos={
            (depoimentos ?? []) as Array<{
              id: string;
              titulo: string;
              quem_era: string | null;
              problema_inicial: string;
              resultado: string;
            }>
          }
          historico={
            (historico ?? []) as Array<{
              id: string;
              modo: string;
              versao_post_longo: string | null;
              versao_post_curto: string | null;
              criado_em: string;
            }>
          }
        />
      </div>
    </main>
  );
}
