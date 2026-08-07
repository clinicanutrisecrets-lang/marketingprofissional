import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorArte } from "./EditorArte";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
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

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard/conteudo"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro estúdio
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Editor de arte</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
            Monte um post na sua marca em segundos: escreva os textos, suba uma
            foto sua se quiser, veja o preview e baixe pronto pra postar.
          </p>
        </header>

        <EditorArte />
      </div>
    </main>
  );
}
