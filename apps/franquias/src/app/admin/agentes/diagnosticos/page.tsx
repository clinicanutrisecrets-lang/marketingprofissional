import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminDiagnosticosView } from "./AdminDiagnosticosView";

export const dynamic = "force-dynamic";

export default async function AdminDiagnosticosPage() {
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

  const { data: franqueadas } = await supabase
    .from("franqueadas")
    .select("id, nome_completo, nome_comercial, status, instagram_handle")
    .eq("onboarding_completo", true)
    .order("nome_completo");

  const { data: diagnosticos } = await supabase
    .from("diagnosticos_perfil")
    .select("id, franqueada_id, status, criado_em, ia_tokens_input, ia_tokens_output, ia_custo_usd, latencia_ms")
    .order("criado_em", { ascending: false });

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <a href="/admin" className="text-sm text-brand-text/60 hover:text-brand-primary">
          ← Admin
        </a>
        <h1 className="mt-2 text-2xl font-bold text-brand-text">
          Diagnósticos de Perfil — Skill 1 do Agente Orgânico
        </h1>
        <p className="mt-1 text-sm text-brand-text/70">
          Disparar análise estratégica manual pra qualquer franqueada. Resultado aparece no
          dashboard dela também.
        </p>

        <AdminDiagnosticosView
          franqueadas={
            (franqueadas ?? []) as Array<{
              id: string;
              nome_completo: string;
              nome_comercial: string | null;
              status: string;
              instagram_handle: string | null;
            }>
          }
          diagnosticos={
            (diagnosticos ?? []) as Array<{
              id: string;
              franqueada_id: string;
              status: string;
              criado_em: string;
              ia_tokens_input: number | null;
              ia_tokens_output: number | null;
              ia_custo_usd: number | null;
              latencia_ms: number | null;
            }>
          }
        />
      </div>
    </main>
  );
}
