import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";

const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? "Scanner da Saúde <contato@scannerdasaude.com>";

export type AgendarInput = {
  franqueadaId?: string;
  tipo: string;
  toEmail: string;
  subject: string;
  html: string;
  scheduledFor?: Date;
  replyTo?: string;
};

/**
 * Agenda um email pra ser enviado pelo cron processador.
 * Se scheduledFor não passada, envia o mais cedo possível (próxima rodada do cron).
 */
export async function agendarEmail(input: AgendarInput): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_queue")
    .insert({
      franqueada_id: input.franqueadaId ?? null,
      tipo: input.tipo,
      to_email: input.toEmail,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo ?? null,
      scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
      status: "pendente",
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Calcula horário aleatório dentro de uma janela (em horas).
 * Útil pra dar sensação de "humano trabalhando" — não envia exatamente 18h depois,
 * varia entre 18-24h.
 */
export function janelaAleatoria(
  baseDate: Date,
  minHoras: number,
  maxHoras: number,
): Date {
  const minMs = minHoras * 60 * 60 * 1000;
  const maxMs = maxHoras * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Date(baseDate.getTime() + offset);
}

/**
 * Processa a fila — chamado pelo cron.
 * Pega até 50 emails pendentes cuja scheduled_for já passou e envia.
 * Marca enviado/falhou + incrementa attempts.
 */
export async function processarFila(): Promise<{
  ok: boolean;
  processados: number;
  enviados: number;
  falhados: number;
  detalhes: Array<{ id: string; status: string; erro?: string }>;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, processados: 0, enviados: 0, falhados: 0, detalhes: [] };
  }

  const resend = new Resend(apiKey);
  const admin = createAdminClient();
  const agora = new Date().toISOString();

  const { data: pendentes } = await admin
    .from("email_queue")
    .select("id, to_email, subject, html, reply_to, attempts")
    .eq("status", "pendente")
    .lte("scheduled_for", agora)
    .lt("attempts", 5)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  const lista = (pendentes ?? []) as Array<{
    id: string;
    to_email: string;
    subject: string;
    html: string;
    reply_to: string | null;
    attempts: number;
  }>;

  let enviados = 0;
  let falhados = 0;
  const detalhes: Array<{ id: string; status: string; erro?: string }> = [];

  for (const item of lista) {
    try {
      const resp = await resend.emails.send({
        from: RESEND_FROM,
        to: item.to_email,
        subject: item.subject,
        html: item.html,
        ...(item.reply_to ? { replyTo: item.reply_to } : {}),
      });
      if (resp.error) throw new Error(resp.error.message);

      await admin
        .from("email_queue")
        .update({
          status: "enviado",
          sent_at: new Date().toISOString(),
          attempts: item.attempts + 1,
          resend_id: resp.data?.id ?? null,
          last_error: null,
        })
        .eq("id", item.id);
      enviados++;
      detalhes.push({ id: item.id, status: "enviado" });
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      const novaAttempts = item.attempts + 1;
      const status = novaAttempts >= 5 ? "falhou" : "pendente";
      await admin
        .from("email_queue")
        .update({
          status,
          attempts: novaAttempts,
          last_error: erro,
        })
        .eq("id", item.id);
      falhados++;
      detalhes.push({ id: item.id, status, erro });
    }
  }

  return {
    ok: true,
    processados: lista.length,
    enviados,
    falhados,
    detalhes,
  };
}
