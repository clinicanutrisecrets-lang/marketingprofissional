import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TracaoView } from "./TracaoView";

export const dynamic = "force-dynamic";

export default async function TracaoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franq } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, nicho_principal, publico_alvo_descricao, diferenciais")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franq) redirect("/onboarding");

  const { data: historico } = await supabase
    .from("tracao_conteudo")
    .select("id, tipo, vigente_ate, criado_em, status, vocabulario_violacoes")
    .eq("franqueada_id", (franq as { id: string }).id)
    .order("criado_em", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <a href="/dashboard" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Dashboard
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">
          Tração de Conteúdo — Crescimento Qualificado
        </h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Skill 7 do Agente Orgânico. Foco: ganhar seguidor qualificado (que vira paciente),
          não volume. Proporção 70% autoridade + 30% tração. Vocabulário personalizado
          (nunca usa "protocolo" — a gente é sinergias, não receita de bolo).
        </p>

        <TracaoView
          franqueada={franq as Record<string, unknown>}
          historico={(historico ?? []) as Array<Record<string, unknown>>}
        />
      </div>
    </main>
  );
}
