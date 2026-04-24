import { NextResponse } from "next/server";
import { processarFila } from "@/lib/emails/queue";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * CRON: processar-email-queue (a cada 30 min)
 * Pega ate 50 emails pendentes cuja scheduled_for ja passou e envia
 * via Resend. Marca enviado/falhou + incrementa attempts (max 5).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const r = await processarFila();
  return NextResponse.json(r);
}
