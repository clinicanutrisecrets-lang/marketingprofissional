import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarBriefings } from "@/lib/briefings/actions";
import BriefingsView from "./BriefingsView";

export const dynamic = "force-dynamic";

export default async function BriefingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, nome_completo, cor_primaria_hex")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");

  const f = franqueada as Record<string, unknown>;
  const corPrimaria = (f.cor_primaria_hex as string) || "#0BB8A8";

  const { pendentes, recentes } = await listarBriefings();

  return (
    <BriefingsView
      pendentes={pendentes}
      recentes={recentes}
      corPrimaria={corPrimaria}
    />
  );
}
