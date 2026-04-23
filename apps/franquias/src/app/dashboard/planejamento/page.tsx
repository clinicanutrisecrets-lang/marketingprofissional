import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanejamentoView } from "./PlanejamentoView";

export const dynamic = "force-dynamic";

export default async function PlanejamentoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franq } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, nicho_principal, valor_consulta_inicial, valor_pacote_mensal, diferenciais, publico_alvo_descricao")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franq) redirect("/onboarding");

  const { data: planejamentosRecentes } = await supabase
    .from("planejamentos_estrategicos")
    .select("id, tipo, vigente_ate, criado_em, output, status")
    .eq("franqueada_id", (franq as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">Planejamento Estratégico</h1>
        <p className="mt-1 text-sm text-brand-text/70">
          3 frentes de planejamento estratégico — rodar trimestralmente ou quando o produto/oferta muda.
        </p>

        <PlanejamentoView
          franqueada={franq as Record<string, unknown>}
          planejamentosRecentes={(planejamentosRecentes ?? []) as Array<Record<string, unknown>>}
        />
      </div>
    </main>
  );
}
