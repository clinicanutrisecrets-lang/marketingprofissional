import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { assinaturaConfere } from "@/lib/integracoes/tratamentos-assinatura";
import { confirmarSlides, franqueadaDoScanner, prepararSlides } from "@/lib/conteudo/galeria-scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/integrations/scanner/galeria
 *
 * O carrossel montado no Scanner entra na "Minha galeria" (Aline, 07/11/2026).
 * Lógica em lib/conteudo/galeria-scanner.ts.
 *
 * Auth: o MESMO HMAC do conteudo-pronto (SCANNER_WEBHOOK_SECRET, header
 * `x-scanner-signature`, hex do corpo cru). Sem a variável, 500.
 *
 * Corpo: { acao, scanner_user_id, email, ... }
 *   preparar   { quantos }        → { envios: [{ path, uploadUrl }] }
 *   confirmar  { paths, titulo }  → { salvos }
 *   Sem conta no Marketing → { semConta: true } (200), a tela explica.
 */
export async function POST(req: Request) {
  const secret = process.env.SCANNER_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ erro: "SCANNER_WEBHOOK_SECRET não configurado" }, { status: 500 });
  const raw = await req.text();
  if (!assinaturaConfere(raw, req.headers.get("x-scanner-signature") ?? "", secret)) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }
  const scannerUserId = String(b.scanner_user_id ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!scannerUserId && !email) return NextResponse.json({ erro: "conta obrigatória" }, { status: 400 });

  const admin = createAdminClient();
  const franqueadaId = await franqueadaDoScanner(admin, scannerUserId, email);
  if (!franqueadaId) return NextResponse.json({ semConta: true });

  if (b.acao === "preparar") {
    const r = await prepararSlides(admin, franqueadaId, Number(b.quantos));
    return NextResponse.json(r.ok ? { envios: r.envios } : { erro: r.erro }, { status: r.ok ? 200 : 400 });
  }
  if (b.acao === "confirmar") {
    const r = await confirmarSlides(admin, franqueadaId, b.paths, String(b.titulo ?? ""));
    return NextResponse.json(r.ok ? { salvos: r.salvos } : { erro: r.erro }, { status: r.ok ? 200 : 400 });
  }
  return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
}
