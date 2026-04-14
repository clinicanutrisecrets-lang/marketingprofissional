import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min (geração com Claude+Bannerbear pode demorar)

/**
 * CRON: Toda 2ª feira 06:00, gera semana de posts pra todas as franqueadas ativas.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Semana de referência = próxima segunda (da semana que vem)
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  d.setDate(d.getDate() + diasAteSegunda);
  const semanaRef = d.toISOString().slice(0, 10);

  // Pega franqueadas ativas com onboarding completo
  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id, nome_completo")
    .eq("status", "ativo")
    .eq("onboarding_completo", true);

  if (!franqueadas || franqueadas.length === 0) {
    return NextResponse.json({
      ok: true,
      semanaRef,
      processadas: 0,
      mensagem: "Nenhuma franqueada ativa",
    });
  }

  const resultados = [];
  for (const f of franqueadas) {
    const franqueada = f as { id: string; nome_completo: string };
    const r = await gerarPostsDaSemana(franqueada.id, semanaRef);
    resultados.push({
      franqueadaId: franqueada.id,
      nome: franqueada.nome_completo,
      ok: r.ok,
      total: r.total,
      erro: r.erro,
    });
  }

  const sucesso = resultados.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    semanaRef,
    processadas: resultados.length,
    sucesso,
    falhas: resultados.length - sucesso,
    detalhes: resultados,
  });
}
