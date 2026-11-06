/**
 * Aviso NA HORA pra Aline, por e-mail (Resend), quando o robô recebe uma
 * mensagem de crise (sofrimento, risco à vida). Revisão de 06/11/2026: o
 * relatório da manhã chega no dia seguinte, e uma mensagem dessas não espera.
 *
 * Usa o mesmo destino do relatório (RELATORIO_INSTAGRAM_EMAIL ou os
 * super_admin). Sem RESEND_API_KEY: grita no log e devolve false, nunca finge.
 * Nunca derruba o processamento do webhook.
 */
import { createPublicAdminClient } from "@/lib/supabase/server";

export async function avisarAlineAgora(p: { assunto: string; texto: string }): Promise<boolean> {
  try {
    const chave = process.env.RESEND_API_KEY;
    let destinos = (process.env.RELATORIO_INSTAGRAM_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (destinos.length === 0) {
      const { data } = await createPublicAdminClient().from("admins").select("email").eq("papel", "super_admin");
      destinos = ((data ?? []) as Array<{ email: string | null }>).map((a) => a.email ?? "").filter(Boolean);
    }
    if (!chave || destinos.length === 0) {
      console.error("[aviso-imediato] NÃO ENVIADO (falta RESEND_API_KEY ou destino):", p.assunto);
      return false;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Studio <noreply@scannerdasaude.com>",
        to: destinos, subject: p.assunto, text: p.texto,
      }),
    });
    if (!res.ok) console.error("[aviso-imediato] Resend recusou", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[aviso-imediato] falha:", (e as Error).message);
    return false;
  }
}
