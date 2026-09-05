import { NextResponse } from "next/server";
import { processarFila, renovarTokensVencendo } from "@/lib/automacao/fila";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * CRON (a cada 5 min): envia o que está na fila do robô (sequências,
 * respostas agendadas) e renova token do login do Instagram perto de vencer.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }
  const fila = await processarFila();
  const tokens = await renovarTokensVencendo();
  return NextResponse.json({ ok: true, fila, tokens });
}
