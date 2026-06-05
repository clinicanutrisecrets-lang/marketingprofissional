import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { lancarCampanha } from "@/lib/anuncios/campanha-automatica";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: criar-campanhas (a cada 30min)
 * Busca anúncios com criativo aprovado pela nutri (status='criativo_aprovado')
 * e dispara o lançamento automático (público + lookalike + campanha + adset + ad + ativação).
 * Cada item é isolado — um erro nunca trava os outros.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: anuncios } = await admin
    .from("anuncios")
    .select("id")
    .eq("status", "criativo_aprovado")
    .limit(50);

  const lista = (anuncios ?? []) as Array<{ id: string }>;

  const resultados = await Promise.allSettled(
    lista.map((a) => lancarCampanha(a.id)),
  );

  const detalhes = resultados.map((r, i) => {
    if (r.status === "fulfilled") {
      return { id: lista[i].id, ...r.value };
    }
    return { id: lista[i].id, ok: false, erro: String(r.reason) };
  });

  return NextResponse.json({
    ok: true,
    processados: lista.length,
    lancados: detalhes.filter((d) => d.ok).length,
    detalhes,
  });
}
