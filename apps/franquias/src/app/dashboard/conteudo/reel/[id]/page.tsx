import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Teleprompter } from "./Teleprompter";

export const dynamic = "force-dynamic";

export default async function ReelPage({ params }: { params: { id: string } }) {
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

  const { data: sugestao } = await supabase
    .from("sugestoes_conteudo")
    .select("id, tema, roteiro, copy_legenda, hashtags")
    .eq("id", params.id)
    .eq("franqueada_id", (franqueada as { id: string }).id)
    .maybeSingle();

  if (!sugestao) notFound();
  const s = sugestao as {
    id: string;
    tema: string;
    roteiro: {
      hook: string;
      blocos: string[];
      cta: string;
      duracao_s?: number;
      dicas?: string[];
      teleprompter?: string;
    } | null;
    copy_legenda: string;
    hashtags: string[] | null;
  };

  const texto =
    s.roteiro?.teleprompter ??
    [s.roteiro?.hook, ...(s.roteiro?.blocos ?? []), s.roteiro?.cta].filter(Boolean).join("\n\n");

  const legenda = [
    s.copy_legenda,
    (s.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Teleprompter
      sugestaoId={s.id}
      tema={s.tema}
      texto={texto}
      dicas={s.roteiro?.dicas ?? []}
      legenda={legenda}
    />
  );
}
