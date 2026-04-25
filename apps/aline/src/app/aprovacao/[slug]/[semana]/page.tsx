import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { AprovacaoView } from "./AprovacaoView";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string; semana: string }> };

export default async function AprovarSemanaPage({ params }: PageProps) {
  const { slug, semana } = await params;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  const { data: perfilData } = await aline
    .from("perfis")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!perfilData) notFound();
  const perfil = perfilData as Record<string, unknown>;

  const { data: postsData } = await aline
    .from("posts")
    .select("*")
    .eq("perfil_id", perfil.id as string)
    .eq("semana_ref", semana)
    .order("data_hora_agendada", { ascending: true });

  const posts = (postsData ?? []) as Array<Record<string, unknown>>;

  return (
    <AprovacaoView
      perfilSlug={slug}
      perfilNome={perfil.nome as string}
      perfilCor={(perfil.cor_primaria as string) || "#0BB8A8"}
      semanaRef={semana}
      posts={posts}
    />
  );
}
