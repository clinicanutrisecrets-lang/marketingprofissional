import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StorytellingView } from "./StorytellingView";

export const dynamic = "force-dynamic";

export default async function StorytellingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franq } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franq) redirect("/onboarding");

  const { data: depoimentos } = await supabase
    .from("depoimentos_franqueada")
    .select("id, titulo, quem_era, problema_inicial, resultado")
    .eq("franqueada_id", (franq as { id: string }).id)
    .eq("ativo", true)
    .order("criado_em", { ascending: false });

  const { data: historico } = await supabase
    .from("storytellings_gerados")
    .select("id, modo, versao_post_longo, versao_post_curto, criado_em")
    .eq("franqueada_id", (franq as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">Storytelling</h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Transforme casos, depoimentos e ideias em histórias que convencem e compartilham.
          3 modos: depoimento real, público se reconhece, ou ideia bruta → história curta.
        </p>

        <StorytellingView
          depoimentos={(depoimentos ?? []) as Array<{
            id: string;
            titulo: string;
            quem_era: string | null;
            problema_inicial: string;
            resultado: string;
          }>}
          historico={(historico ?? []) as Array<{
            id: string;
            modo: string;
            versao_post_longo: string | null;
            versao_post_curto: string | null;
            criado_em: string;
          }>}
        />
      </div>
    </main>
  );
}
