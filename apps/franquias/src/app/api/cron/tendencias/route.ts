import { NextResponse } from "next/server";
import { orquestrarTendencias } from "@/lib/tendencias/orquestrar";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron diário 06:00 — coleta tendências + classifica com Claude.
 * Configurado em vercel.json
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
  }

  const resultado = await orquestrarTendencias();

  return NextResponse.json({
    ok: resultado.ok,
    salvas: resultado.salvas,
    erro: resultado.erro,
    timestamp: new Date().toISOString(),
  });
}
