import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "./SidebarNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("nome_comercial, nome_completo, cor_primaria_hex")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const f = (franqueada ?? {}) as {
    nome_comercial?: string | null;
    nome_completo?: string | null;
    cor_primaria_hex?: string | null;
  };
  const nome = f.nome_comercial || f.nome_completo?.split(" ")[0] || "Perfil";
  const cor = f.cor_primaria_hex || "#0BB8A8";

  return (
    <div className="min-h-screen bg-brand-muted">
      <SidebarNav nome={nome} corPrimaria={cor} />
      <div className="px-4 lg:pl-60">{children}</div>
    </div>
  );
}
