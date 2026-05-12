import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import CanvaConfigView from "./CanvaConfigView";

export const dynamic = "force-dynamic";

type SearchParams = { ok?: string; erro?: string };

export default async function CanvaConfigPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("auth_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <main className="min-h-screen bg-aline-bg p-8">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Apenas admin</h1>
          <p className="mt-2 text-aline-text/60">
            Configuração da conexão Canva é restrita a admins.
          </p>
        </div>
      </main>
    );
  }

  const alineAdmin = createAlineClient();
  const { data: statusData } = await alineAdmin.rpc("get_canva_connection_status");
  const status = (Array.isArray(statusData) ? statusData[0] : statusData) as
    | {
        conectado: boolean;
        canva_user_email: string | null;
        conectado_em: string | null;
        expira_em: string | null;
        scopes_concedidos: string[] | null;
      }
    | undefined;

  const { data: designs } = await alineAdmin
    .from("canva_designs")
    .select("*")
    .order("tipo", { ascending: true })
    .order("descricao", { ascending: true });

  return (
    <CanvaConfigView
      status={status ?? null}
      designs={(designs as Array<Record<string, unknown>>) ?? []}
      flash={{ ok: sp.ok === "1", erro: sp.erro ?? null }}
    />
  );
}
