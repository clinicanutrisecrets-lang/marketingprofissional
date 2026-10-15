import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import {
  BUCKET_GALERIA,
  caminhoSlide,
  caminhoPertence,
  pastaENome,
  arquivoServe,
  tituloDoSlide,
} from "@/lib/galeria/scanner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 20;

/**
 * POST /api/integrations/scanner/galeria
 *
 * O Scanner salva um slide do "Carrossel por tema" na "Minha galeria" da
 * franqueada (Aline/Juliana, 15/10/2026). Ver src/lib/galeria/scanner.ts.
 *
 * Auth: HMAC SHA256 do corpo com SCANNER_WEBHOOK_SECRET em
 * `x-scanner-signature` (o mesmo do /conteudo-pronto e do /onboarding/iniciar).
 *
 * Dois passos, porque o arquivo nunca passa por aqui (limite de 4,5 MB):
 *   { acao: "preparar", scanner_user_id, email, slide }
 *     → { upload_url, path }   (URL assinada de upload no Storage)
 *   { acao: "confirmar", scanner_user_id, email, path, slide, total, titulo }
 *     → { ok: true, id }       (confere o arquivo e grava em artes_geradas)
 *
 * 🔴 Não cria conta: quem nunca entrou no Marketing leva 404 com o motivo.
 * 🔴 Erro nunca vira sucesso: insert que falha apaga o arquivo e devolve 500.
 */
export async function POST(req: Request) {
  const secret = process.env.SCANNER_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "SCANNER_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const rawBody = await req.text();
  if (!assinaturaConfere(rawBody, req.headers.get("x-scanner-signature") ?? "", secret)) {
    return NextResponse.json({ erro: "Assinatura inválida" }, { status: 401 });
  }

  let body: {
    acao?: string;
    scanner_user_id?: string;
    email?: string;
    slide?: number;
    total?: number;
    titulo?: string;
    path?: string;
  };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const admin = createAdminClient();
  const franqueadaId = await acharFranqueada(admin, body.scanner_user_id, body.email);
  if (!franqueadaId) {
    return NextResponse.json(
      { erro: "Sua área de Marketing ainda não foi aberta. Entre uma vez em Posts e Conteúdo e tente de novo." },
      { status: 404 },
    );
  }

  if (body.acao === "preparar") {
    const path = caminhoSlide(franqueadaId, Number(body.slide));
    const { data, error } = await admin.storage.from(BUCKET_GALERIA).createSignedUploadUrl(path);
    if (error || !data?.signedUrl) {
      console.error("[galeria-scanner] upload não preparado:", error?.message, { franqueadaId });
      return NextResponse.json({ erro: "Não foi possível preparar o envio do slide." }, { status: 500 });
    }
    return NextResponse.json({ upload_url: data.signedUrl, path });
  }

  if (body.acao === "confirmar") {
    const path = String(body.path ?? "");
    if (!caminhoPertence(franqueadaId, path)) {
      return NextResponse.json({ erro: "Arquivo inválido." }, { status: 400 });
    }
    const { pasta, nome } = pastaENome(path);
    const { data: lista, error: erroLista } = await admin.storage
      .from(BUCKET_GALERIA)
      .list(pasta, { search: nome, limit: 5 });
    if (erroLista) {
      console.error("[galeria-scanner] conferência falhou:", erroLista.message, { path });
      return NextResponse.json({ erro: "Não foi possível conferir o slide enviado." }, { status: 500 });
    }
    const item = (lista ?? []).find((o) => o.name === nome);
    const meta = item
      ? { size: (item.metadata as { size?: number } | null)?.size, mimetype: (item.metadata as { mimetype?: string } | null)?.mimetype }
      : null;
    const problema = arquivoServe(meta);
    if (problema) {
      if (item) await admin.storage.from(BUCKET_GALERIA).remove([path]);
      return NextResponse.json({ erro: `Slide não salvo: ${problema}.` }, { status: 400 });
    }

    const { data: assinada, error: erroUrl } = await admin.storage
      .from(BUCKET_GALERIA)
      .createSignedUrl(path, 365 * 24 * 60 * 60);
    if (erroUrl || !assinada?.signedUrl) {
      console.error("[galeria-scanner] link de leitura falhou:", erroUrl?.message, { path });
      await admin.storage.from(BUCKET_GALERIA).remove([path]);
      return NextResponse.json({ erro: "Não foi possível salvar o slide." }, { status: 500 });
    }

    const { data: linha, error: erroInsert } = await admin
      .from("artes_geradas")
      .insert({
        franqueada_id: franqueadaId,
        url: assinada.signedUrl,
        path,
        params: {
          layout: "carrossel",
          formato: "retrato",
          origem: "scanner_carrossel",
          headline: tituloDoSlide(body.titulo, Number(body.slide), Number(body.total)),
        },
      } as never)
      .select("id")
      .single();
    if (erroInsert || !linha) {
      console.error("[galeria-scanner] insert falhou:", erroInsert?.message, { path });
      await admin.storage.from(BUCKET_GALERIA).remove([path]);
      return NextResponse.json({ erro: "Não foi possível salvar o slide na galeria." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: (linha as { id: string }).id });
  }

  return NextResponse.json({ erro: "acao inválida" }, { status: 400 });
}

async function acharFranqueada(
  admin: ReturnType<typeof createAdminClient>,
  scannerUserIdRaw: string | undefined,
  emailRaw: string | undefined,
): Promise<string | null> {
  const scannerUserId = (scannerUserIdRaw ?? "").trim();
  const email = (emailRaw ?? "").trim().toLowerCase();
  if (scannerUserId) {
    const { data } = await admin.from("franqueadas").select("id").eq("scanner_saas_user_id", scannerUserId).maybeSingle();
    const id = (data as { id: string } | null)?.id;
    if (id) return id;
  }
  if (email) {
    const { data } = await admin.from("franqueadas").select("id").eq("email", email).maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }
  return null;
}

function assinaturaConfere(corpo: string, recebida: string, secret: string): boolean {
  if (!recebida) return false;
  const esperada = createHmac("sha256", secret).update(corpo).digest("hex");
  const limpa = recebida.startsWith("sha256=") ? recebida.slice(7) : recebida;
  const a = Buffer.from(limpa);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}
