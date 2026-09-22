import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { montarAvisoPronto } from "@/lib/conteudo/aviso-pronto-db";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * POST /api/integrations/scanner/conteudo-pronto
 *
 * O Scanner pergunta: "esta nutri tem conteúdo esperando aprovação?".
 *
 * Pedido da Aline (22/09/2026): *"eu quero no dashboard do scanner, porque a
 * pessoa que está no consultório de precisão entra no scanner todo dia, mas
 * ir lá na aba posts e conteúdos pra entrar no marketing, não dá, ela não vai
 * lembrar"*.
 *
 * 🔴 SOMENTE LEITURA. Esta rota não cria franqueada, não vincula nada e não
 * escreve uma linha. Conta que não existe aqui devolve `aviso: null` — o
 * Scanner não pode fazer nascer conta no Marketing só porque alguém abriu o
 * dashboard dele.
 *
 * 🔴 O SCANNER NÃO FALA COM O BANCO DAQUI. Ele pergunta ao app, com o MESMO
 * HMAC que já existe entre os dois (`SCANNER_WEBHOOK_SECRET`, o do
 * /api/onboarding/iniciar). Dar ao Scanner uma chave de serviço deste projeto
 * seria um segredo novo pra vazar, e duplicaria a régua de quando avisar.
 *
 * Auth: HMAC SHA256 do corpo com SCANNER_WEBHOOK_SECRET, em
 * `x-scanner-signature`.
 *
 * Body: { scanner_user_id: string, email: string }
 * Resposta: { aviso: { titulo, detalhe, acao, href } | null }
 */
export async function POST(req: Request) {
  const secret = process.env.SCANNER_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "SCANNER_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  const assinatura = req.headers.get("x-scanner-signature") ?? "";
  if (!assinaturaConfere(rawBody, assinatura, secret)) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let body: { scanner_user_id?: string; email?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const scannerUserId = (body.scanner_user_id ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!scannerUserId && !email) {
    return NextResponse.json({ erro: "scanner_user_id ou email obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Mesma ordem do /sso: vínculo direto, depois e-mail. Aqui só LÊ — o /sso é
  // quem grava o `scanner_saas_user_id` quando a nutri de fato entra.
  let franqueadaId: string | null = null;
  if (scannerUserId) {
    const { data } = await admin
      .from("franqueadas")
      .select("id")
      .eq("scanner_saas_user_id", scannerUserId)
      .maybeSingle();
    franqueadaId = (data as { id: string } | null)?.id ?? null;
  }
  if (!franqueadaId && email) {
    const { data } = await admin
      .from("franqueadas")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    franqueadaId = (data as { id: string } | null)?.id ?? null;
  }

  // Nutri que ainda não entrou no Marketing não tem conteúdo esperando —
  // e não é erro: é o estado normal de quem acabou de assinar.
  if (!franqueadaId) return NextResponse.json({ aviso: null });

  const aviso = await montarAvisoPronto(admin, franqueadaId);
  return NextResponse.json({ aviso });
}

function assinaturaConfere(corpo: string, recebida: string, secret: string): boolean {
  if (!recebida) return false;
  const esperada = createHmac("sha256", secret).update(corpo).digest("hex");
  const limpa = recebida.startsWith("sha256=") ? recebida.slice(7) : recebida;
  const a = Buffer.from(limpa);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}
