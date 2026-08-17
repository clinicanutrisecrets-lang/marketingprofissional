import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { orquestrarTendencias } from "@/lib/tendencias/orquestrar";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Cron diário 09:00 UTC — coleta tendências + classifica com Claude,
 * UM LOTE POR NICHO em uso.
 *
 * 🔴 Antes rodava uma vez só, no nicho fixo "saude_integrativa", e o card
 * "Em alta hoje no seu nicho" mostrava esse lote pra todas — inclusive pra
 * quem é de saúde feminina ou materno-infantil. Agora cada nicho cadastrado
 * tem o seu lote, e o card lê o nicho da profissional.
 *
 * 🔴 E responde 500 quando NENHUM nicho salvou nada. A versão anterior
 * devolvia 200 com `ok:false`, então quatro meses sem coletar nada
 * (última coleta 2026-04-15) não acenderam nenhuma luz.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Nichos realmente em uso — não gastamos chamada de Claude com nicho que
  // ninguém tem. "saude_integrativa" entra sempre: é o fallback de quem não
  // preencheu o nicho e o que as telas usam por default.
  const { data: franqueadas, error } = await admin
    .from("franqueadas")
    .select("nicho_principal")
    .eq("onboarding_completo", true);

  if (error) {
    return NextResponse.json(
      { ok: false, erro: `Não deu pra listar os nichos: ${error.message}` },
      { status: 500 },
    );
  }

  const nichos = Array.from(
    new Set(
      [
        "saude_integrativa",
        ...((franqueadas ?? []) as Array<{ nicho_principal: string | null }>).map(
          (f) => f.nicho_principal?.trim(),
        ),
      ].filter((n): n is string => !!n),
    ),
  );

  const detalhes: Array<{ nicho: string; salvas: number; erro?: string }> = [];
  for (const nicho of nichos) {
    const r = await orquestrarTendencias(undefined, nicho);
    if (!r.ok) console.error("[cron/tendencias] nicho sem coleta:", nicho, r.erro);
    detalhes.push({ nicho, salvas: r.salvas, erro: r.erro });
  }

  const salvas = detalhes.reduce((acc, d) => acc + d.salvas, 0);

  return NextResponse.json(
    {
      ok: salvas > 0,
      nichos: nichos.length,
      salvas,
      detalhes,
      timestamp: new Date().toISOString(),
    },
    { status: salvas > 0 ? 200 : 500 },
  );
}
