import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/emails/client";
import { emailDeadlineAproximando } from "@/lib/emails/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron que roda a cada 6h. Identifica aprovações pendentes com deadline
 * em menos de 24h e envia email de alerta (só 1x por aprovação).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const agora = new Date();
  const em24h = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

  const { data: aprovs } = await admin
    .from("aprovacoes_semanais")
    .select("id, franqueada_id, deadline, alerta_deadline_enviado, total_posts")
    .eq("status", "aguardando")
    .lt("deadline", em24h.toISOString())
    .gt("deadline", agora.toISOString())
    .is("alerta_deadline_enviado", null);

  const lista = (aprovs ?? []) as Array<Record<string, unknown>>;
  let enviados = 0;

  for (const a of lista) {
    const { data: fData } = await admin
      .from("franqueadas")
      .select("email, nome_comercial, nome_completo")
      .eq("id", a.franqueada_id)
      .maybeSingle();

    const f = fData as Record<string, unknown> | null;
    if (!f || !f.email) continue;

    const nome =
      (f.nome_comercial as string) ||
      ((f.nome_completo as string) ?? "").split(" ")[0] ||
      "Dra.";
    const horasRestantes = Math.max(
      1,
      Math.round(
        (new Date(a.deadline as string).getTime() - agora.getTime()) /
          (1000 * 60 * 60),
      ),
    );

    const tpl = emailDeadlineAproximando(
      nome,
      horasRestantes,
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com"}/dashboard/aprovar`,
    );

    const r = await enviarEmail({
      para: f.email as string,
      assunto: tpl.assunto,
      html: tpl.html,
      texto: tpl.texto,
    });

    if (r.ok) {
      await admin
        .from("aprovacoes_semanais")
        .update({ alerta_deadline_enviado: new Date().toISOString() })
        .eq("id", a.id);
      enviados++;
    }
  }

  return NextResponse.json({
    ok: true,
    processadas: lista.length,
    enviados,
    timestamp: agora.toISOString(),
  });
}
