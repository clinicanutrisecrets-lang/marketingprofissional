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

  // Carrega midia principal (ordem=0) de cada post
  const postIds = posts.map((p) => p.id as string);
  const { data: midiasData } = postIds.length
    ? await aline
        .from("post_midias")
        .select("post_id, url, tipo, ordem")
        .in("post_id", postIds)
        .eq("ordem", 0)
    : { data: [] };

  const midiasPorPost = new Map<string, string>();
  for (const m of (midiasData ?? []) as Array<{ post_id: string; url: string }>) {
    midiasPorPost.set(m.post_id, m.url);
  }

  const postsComMidia = posts.map((p) => ({
    ...p,
    midia_url: midiasPorPost.get(p.id as string) ?? null,
  }));

  return (
    <AprovacaoView
      perfilSlug={slug}
      perfilNome={perfil.nome as string}
      perfilCor={(perfil.cor_primaria as string) || "#0BB8A8"}
      semanaRef={semana}
      posts={postsComMidia}
    />
  );
}
