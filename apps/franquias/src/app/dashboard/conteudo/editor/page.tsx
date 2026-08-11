import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorArte } from "./EditorArte";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  searchParams,
}: {
  searchParams?: { titulo?: string; categoria?: string; apoio?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, cor_primaria_hex")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard/conteudo"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro estúdio
        </Link>

        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">Editor de arte</h1>
            <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
              Monte um post na sua marca em segundos: escreva os textos, suba uma
              foto sua se quiser, veja o preview e baixe pronto pra postar.
            </p>
          </div>
          <Link
            href="/dashboard/conteudo/galeria"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-sm ring-1 ring-brand-primary/20 hover:bg-brand-primary/5"
          >
            🗂️ Minha galeria
          </Link>
        </header>

        <EditorArte
          headlineInicial={searchParams?.titulo ?? ""}
          eyebrowInicial={searchParams?.categoria ?? ""}
          subtitleInicial={searchParams?.apoio ?? ""}
          corMarca={
            (franqueada as { cor_primaria_hex?: string | null }).cor_primaria_hex ?? null
          }
        />
      </div>
    </main>
  );
}
