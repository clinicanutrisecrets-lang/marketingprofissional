import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CriarAnuncioForm } from "./CriarAnuncioForm";

export const dynamic = "force-dynamic";

export default async function NovoAnuncioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, nicho_principal, cidade, estado, link_cta_anuncio, tipo_cta_anuncio")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");
  const franqueada = f as Record<string, unknown>;

  const { data: funis } = await supabase
    .from("funis_destino")
    .select("id, nome, tipo, wa_numero")
    .eq("franqueada_id", franqueada.id as string)
    .eq("ativo", true);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard/anuncios"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Criar anúncio</h1>
          <p className="text-sm text-brand-text/60">
            Escolha o objetivo, defina budget e tema. A gente cuida da parte técnica.
          </p>
        </header>
        <CriarAnuncioForm
          nicho={franqueada.nicho_principal as string}
          funis={(funis ?? []) as Array<{ id: string; nome: string; tipo: string; wa_numero: string | null }>}
          linkCtaPadrao={franqueada.link_cta_anuncio as string}
        />
      </div>
    </main>
  );
}
