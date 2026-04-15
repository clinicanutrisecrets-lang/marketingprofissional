import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CriarPostForm } from "./CriarPostForm";

export const dynamic = "force-dynamic";

export default async function NovoPostPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Criar post manual</h1>
          <p className="text-sm text-brand-text/60">
            Suba sua mídia, escreva ou peça pra IA gerar a legenda, e agende.
          </p>
        </header>

        <Suspense fallback={<div className="rounded-2xl bg-white p-6 text-sm text-brand-text/60">Carregando...</div>}>
          <CriarPostForm />
        </Suspense>
      </div>
    </main>
  );
}
