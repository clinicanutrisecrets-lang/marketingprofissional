import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeleprompterHub, type RoteiroSemana } from "./TeleprompterHub";

export const dynamic = "force-dynamic";

export default async function TeleprompterPage() {
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

  // Roteiros de reel sugeridos (mais recentes primeiro)
  const { data } = await supabase
    .from("sugestoes_conteudo")
    .select("id, tema, gatilho_pauta, roteiro, semana_ref, status")
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .eq("tipo", "reel")
    .neq("status", "descartado")
    .order("semana_ref", { ascending: false })
    .order("ordem", { ascending: true })
    .limit(8);

  const roteiros = ((data ?? []) as Array<Record<string, unknown>>)
    .filter((r) => r.roteiro)
    .map((r) => ({
      id: r.id as string,
      tema: r.tema as string,
      hook: ((r.roteiro as { hook?: string })?.hook ?? "").slice(0, 120),
      duracao: (r.roteiro as { duracao_s?: number })?.duracao_s ?? 45,
      gravado: r.status === "gravado",
    })) as RoteiroSemana[];

  return <TeleprompterHub roteiros={roteiros} />;
}
