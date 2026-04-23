import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { SaudeDashboard } from "./SaudeDashboard";

export const dynamic = "force-dynamic";

export default async function AdminSaudeAgentesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/");

  const admin = createAdminClient();

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const inicio7d = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [diagnosticosRes, auditoriasRes, storytellingsRes] = await Promise.all([
    admin
      .from("diagnosticos_perfil")
      .select("id, franqueada_id, criado_em, status, ia_custo_usd, latencia_ms, ia_tokens_input, ia_tokens_output")
      .gte("criado_em", inicioMes),
    admin
      .from("auditorias_conteudo")
      .select("id, franqueada_id, criado_em, status, ia_custo_usd, latencia_ms, ia_tokens_input, ia_tokens_output, qtd_posts_analisados, ideias_aproveitadas")
      .gte("criado_em", inicioMes),
    admin
      .from("storytellings_gerados")
      .select("id, franqueada_id, criado_em, modo, status, ia_custo_usd, latencia_ms")
      .gte("criado_em", inicioMes),
  ]);

  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id")
    .eq("onboarding_completo", true);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <a href="/admin" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Admin
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">Saúde dos agentes</h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Métricas de performance do Agente Orgânico (mês corrente). Cada skill monitorada
          separadamente. Alertas automáticos quando algo sai do ponto.
        </p>

        <SaudeDashboard
          diagnosticos={(diagnosticosRes.data ?? []) as Array<Record<string, unknown>>}
          auditorias={(auditoriasRes.data ?? []) as Array<Record<string, unknown>>}
          storytellings={(storytellingsRes.data ?? []) as Array<Record<string, unknown>>}
          totalFranqueadas={(franqueadas ?? []).length}
          inicioPeriodo={inicio7d}
        />
      </div>
    </main>
  );
}
