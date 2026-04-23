import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { DiagnosticoView } from "./DiagnosticoView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export default async function DiagnosticoPerfilPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfil } = await aline
    .from("perfis")
    .select("id, slug, nome, instagram_handle, objetivo")
    .eq("slug", slug)
    .maybeSingle();
  if (!perfil) notFound();

  const perfilRow = perfil as { id: string; slug: string; nome: string; instagram_handle: string; objetivo: string | null };

  const { data: diagnosticoAtual } = await aline
    .from("diagnosticos_perfil")
    .select("*")
    .eq("perfil_id", perfilRow.id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Dashboard
        </a>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-900">
            Diagnóstico — @{perfilRow.instagram_handle}
          </h1>
          <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs text-zinc-700">
            {perfilRow.nome}
          </span>
        </div>
        {perfilRow.objetivo && (
          <p className="mt-1 text-sm text-zinc-600">
            Objetivo: <span className="italic">{perfilRow.objetivo}</span>
          </p>
        )}

        <DiagnosticoView
          perfilSlug={perfilRow.slug}
          diagnosticoInicial={diagnosticoAtual as Record<string, unknown> | null}
        />
      </div>
    </main>
  );
}
