import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GaleriaGrid, type ArteGerada } from "./GaleriaGrid";

export const dynamic = "force-dynamic";

export default async function GaleriaPage() {
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

  const { data } = await supabase
    .from("artes_geradas")
    .select("id, url, params, criado_em")
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(100);

  const artes = (data ?? []) as ArteGerada[];

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard/conteudo/editor"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro editor
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Minha galeria</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Todas as artes que você salvou no editor — baixe quando quiser.
          </p>
        </header>

        <GaleriaGrid artes={artes} />
      </div>
    </main>
  );
}
