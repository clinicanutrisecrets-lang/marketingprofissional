import { NextResponse } from "next/server";
import { createAlineClient, createPublicAdminClient } from "@/lib/supabase/server";
import { casaPalavraChave } from "@/lib/automacao/regras";
import { montarRelatorio, type DadosRelatorio } from "@/lib/automacao/relatorio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/**
 * CRON (todo dia 11:00 UTC = 8h de Brasília): relatório do robô do Instagram
 * por perfil conectado, por e-mail.
 *
 * Envia por Resend (RESEND_API_KEY). Destino: RELATORIO_INSTAGRAM_EMAIL ou,
 * sem ela, os super_admin de public.admins. Sem chave, NÃO finge que mandou:
 * devolve o relatório no corpo e grita no log.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const aline = createAlineClient();
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: perfis, error: ePerfis } = await aline
    .from("perfis")
    .select("id, slug, instagram_handle, instagram_token_expiry, instagram_user_id")
    .not("instagram_user_id", "is", null);
  if (ePerfis) return NextResponse.json({ erro: ePerfis.message }, { status: 500 });

  const relatorios = [];
  for (const p of (perfis ?? []) as Array<{ id: string; slug: string; instagram_handle: string | null; instagram_token_expiry: string | null }>) {
    const [msgs, esperando, regras] = await Promise.all([
      aline.from("ig_mensagens").select("canal, direcao, origem, texto, ig_contatos(username, nome)").eq("perfil_id", p.id).gte("criado_em", desde).limit(2000),
      aline.from("ig_contatos").select("username, nome, precisa_humano_motivo").eq("perfil_id", p.id).eq("precisa_humano", true).limit(50),
      aline.from("ig_regras").select("nome, ativa, palavras_chave, gatilho").eq("perfil_id", p.id),
    ]);
    if (msgs.error || esperando.error || regras.error) {
      console.error("[relatorio-instagram] leitura falhou", p.slug, msgs.error?.message ?? esperando.error?.message ?? regras.error?.message);
      continue;
    }
    type Msg = { canal: string; direcao: string; origem: string | null; texto: string | null; ig_contatos: { username: string | null; nome: string | null } | null };
    const lista = (msgs.data ?? []) as unknown as Msg[];
    const quem = (c: { username: string | null; nome: string | null } | null) => (c?.username ? `@${c.username}` : c?.nome ?? "alguém");
    const entradas: Record<string, number> = {};
    const saidas: Record<string, number> = {};
    for (const m of lista) {
      if (m.direcao === "entrada") entradas[m.canal] = (entradas[m.canal] ?? 0) + 1;
      else saidas[m.origem ?? "sem origem"] = (saidas[m.origem ?? "sem origem"] ?? 0) + 1;
    }
    const dados: DadosRelatorio = {
      perfil: p.instagram_handle ?? p.slug,
      entradas,
      saidas,
      esperando: ((esperando.data ?? []) as Array<{ username: string | null; nome: string | null; precisa_humano_motivo: string | null }>).map((c) => ({ quem: quem(c), motivo: c.precisa_humano_motivo })),
      comentariosCurtos: lista.filter((m) => m.direcao === "entrada" && m.canal === "comentario" && m.texto && m.texto.length <= 25).map((m) => ({ quem: quem(m.ig_contatos), texto: m.texto! })),
      regras: ((regras.data ?? []) as Array<{ nome: string; ativa: boolean; palavras_chave: string[] | null; gatilho: string }>).filter((r) => r.gatilho === "comentario").map((r) => ({ nome: r.nome, ativa: r.ativa, palavras: r.palavras_chave ?? [] })),
      tokenVenceEm: p.instagram_token_expiry,
      casa: casaPalavraChave,
    };
    relatorios.push(montarRelatorio(dados));
  }

  const chave = process.env.RESEND_API_KEY;
  let destinos = (process.env.RELATORIO_INSTAGRAM_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (destinos.length === 0) {
    const { data } = await createPublicAdminClient().from("admins").select("email").eq("papel", "super_admin");
    destinos = ((data ?? []) as Array<{ email: string | null }>).map((a) => a.email ?? "").filter(Boolean);
  }
  if (!chave || destinos.length === 0) {
    console.error("[relatorio-instagram] NÃO ENVIADO: falta RESEND_API_KEY ou destino no Vercel do studio-aline");
    return NextResponse.json({ ok: false, enviado: false, motivo: !chave ? "sem RESEND_API_KEY" : "sem destino", relatorios });
  }
  const remetente = process.env.RESEND_FROM_EMAIL ?? "Studio <noreply@scannerdasaude.com>";
  const enviados = [];
  for (const r of relatorios) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: destinos, subject: r.assunto, html: r.html, text: r.texto }),
    });
    if (!res.ok) console.error("[relatorio-instagram] Resend recusou", res.status, (await res.text()).slice(0, 300));
    enviados.push({ assunto: r.assunto, ok: res.ok });
  }
  return NextResponse.json({ ok: true, enviados });
}
