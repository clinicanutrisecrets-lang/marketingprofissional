import { Resend } from "resend";

function getFromDefault(): string {
  return (
    process.env.RESEND_FROM_EMAIL ?? "Scanner da Saúde <noreply@scannerdasaude.com>"
  );
}

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Wrapper que ignora erro silenciosamente se Resend não tiver key.
 * Retorna {ok, id?, erro?}.
 */
export async function enviarEmail(params: {
  para: string | string[];
  assunto: string;
  html: string;
  texto?: string;
  de?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY não configurada, pulando envio");
    return { ok: false, erro: "Resend não configurado" };
  }

  try {
    const r = await resend.emails.send({
      from: params.de ?? getFromDefault(),
      to: Array.isArray(params.para) ? params.para : [params.para],
      subject: params.assunto,
      html: params.html,
      text: params.texto,
      replyTo: params.replyTo,
    });

    if (r.error) return { ok: false, erro: r.error.message };
    return { ok: true, id: r.data?.id };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
