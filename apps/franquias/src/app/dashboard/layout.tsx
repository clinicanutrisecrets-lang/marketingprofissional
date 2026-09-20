import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { EMBED_COOKIE } from "@/lib/embed/destino";
import { SidebarNav } from "./SidebarNav";
import { EmbedGuard } from "./EmbedGuard";

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

  // Modo EMBUTIDO (dentro do Scanner, ver lib/embed/destino.ts): o Scanner já
  // desenha menu, cabeçalho e rodapé em volta do iframe. Aqui fica só a barra
  // de chips com as telas deste app — uma navegação só, não duas.
  const embutido = cookies().get(EMBED_COOKIE)?.value === "1";
  if (embutido) {
    return (
      <div className="min-h-screen bg-brand-muted">
        <style>{`#rodape-app{display:none}`}</style>
        <EmbedGuard />
        <SidebarNav nome={nome} corPrimaria={cor} embutido />
        <div className="px-4">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-muted">
      <SidebarNav nome={nome} corPrimaria={cor} />
      <div className="px-4 lg:pl-60">{children}</div>
    </div>
  );
}
