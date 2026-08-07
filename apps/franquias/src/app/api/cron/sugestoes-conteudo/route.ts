import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarSugestoesSemana } from "@/lib/conteudo/gerador-sugestoes";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: todo domingo 10h — gera o pacote de sugestões de conteúdo da
 * próxima semana (pautas quentes + artes + legendas + roteiros de reel)
 * para todas as franqueadas ativas. Idempotente por (franqueada, semana).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Próxima segunda-feira
  const d = new Date();
  const dow = d.getDay();
  const diasAteSegunda = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  d.setDate(d.getDate() + diasAteSegunda);
  const semanaRef = d.toISOString().slice(0, 10);

  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id, nome_completo")
    .eq("status", "ativo")
    .eq("onboarding_completo", true);

  const lista = (franqueadas ?? []) as Array<{ id: string; nome_completo: string | null }>;
  const resultados: Array<{ id: string; criadas: number; erro?: string }> = [];

  for (const f of lista) {
    try {
      const r = await gerarSugestoesSemana({ franqueadaId: f.id, semanaRef });
      resultados.push({ id: f.id, criadas: r.criadas, erro: r.erro });
    } catch (e) {
      resultados.push({ id: f.id, criadas: 0, erro: e instanceof Error ? e.message : "erro" });
    }
  }

  return NextResponse.json({
    ok: true,
    semanaRef,
    processadas: resultados.length,
    criadas: resultados.reduce((acc, r) => acc + r.criadas, 0),
    detalhes: resultados,
  });
}
