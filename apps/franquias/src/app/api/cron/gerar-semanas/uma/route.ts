import { NextResponse } from "next/server";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Gera o pacote da semana de UMA conta.
 *
 * 🔴 Existe por causa do teto de 300s: percorrer todas as contas numa função
 * só deixava as últimas da fila sem nada (ver lib/geracao/fila-semanal.ts).
 * Aqui cada conta tem os 300s dela — uma conta lenta atrasa a si mesma, não
 * o pacote de quem vem depois.
 *
 * Só o cron chama (mesmo CRON_SECRET do pai): gerar posts custa modelo, e
 * rota aberta é rota que qualquer um usa pra queimar crédito da conta.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let corpo: { franqueadaId?: string; semanaRef?: string };
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "Corpo inválido" }, { status: 400 });
  }

  const franqueadaId = (corpo.franqueadaId ?? "").trim();
  const semanaRef = (corpo.semanaRef ?? "").trim();
  if (!franqueadaId || !semanaRef) {
    return NextResponse.json(
      { erro: "franqueadaId e semanaRef são obrigatórios" },
      { status: 400 },
    );
  }

  const r = await gerarPostsDaSemana(franqueadaId, semanaRef);
  console.log(
    `[gerar-semanas:uma] ${franqueadaId} semana=${semanaRef} ok=${r.ok} total=${r.total ?? 0}` +
      (r.erro ? ` erro=${r.erro}` : ""),
  );
  return NextResponse.json(r);
}
