import { NextResponse, type NextRequest } from "next/server";
import { assinaturaConfere } from "@/lib/integracoes/tratamentos-assinatura";
import { createAdminClient } from "@/lib/supabase/server";
import {
  chaveValida,
  montarNarracaoParceira,
  narracoesDaParceira,
  prepararNarracaoParceira,
  videosDaParceira,
} from "@/lib/videos/parceiras";

/**
 * POST /api/integrations/tratamentos/videos-bf
 *
 * Canal do painel de Tratamentos (parceiras da Black Friday, que não têm
 * conta aqui) para os vídeos com o nome delas e a narração em karaokê
 * (Aline, 06/11/2026). Lógica em lib/videos/parceiras.ts.
 *
 * Auth: HMAC SHA256 do corpo com VIDEOS_PARCEIRAS_SECRET, em hex, no header
 * `x-tratamentos-signature`. O MESMO valor fica no Vercel do Tratamentos
 * (projeto cursos-scanner). Sem a variável, o mesmo valor é lido de
 * `integracao_segredos` (migração 044: tabela trancada, só o servidor lê).
 * Sem nenhum dos dois, fecha (503).
 *
 * Corpo: { acao, chave, ... }
 *   estado    { nome, registro, logoUrl } → { videos, narracoes }
 *   preparar  { ref, mime, tamanhoBytes } → { id, uploadUrl }
 *   montar    { id, atrasoMs }            → { msg }
 */
export const dynamic = "force-dynamic";

async function segredo(): Promise<string> {
  const env = (process.env.VIDEOS_PARCEIRAS_SECRET ?? "").trim();
  if (env) return env;
  const { data, error } = await createAdminClient()
    .from("integracao_segredos")
    .select("valor")
    .eq("chave", "VIDEOS_PARCEIRAS_SECRET")
    .maybeSingle();
  if (error) console.error("[videos-bf] não li o segredo do banco", error.message);
  return String((data as { valor?: string } | null)?.valor ?? "").trim();
}

export async function POST(req: NextRequest) {
  const secret = await segredo();
  if (!secret) return NextResponse.json({ erro: "em configuração" }, { status: 503 });
  const raw = await req.text();
  if (!assinaturaConfere(raw, req.headers.get("x-tratamentos-signature") ?? "", secret)) {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  const chave = b.chave;
  if (!chaveValida(chave)) return NextResponse.json({ erro: "chave inválida" }, { status: 400 });

  if (b.acao === "estado") {
    const videos = await videosDaParceira(chave, {
      nome: b.nome as string | null,
      registro: b.registro as string | null,
      logoUrl: b.logoUrl as string | null,
    });
    if (!videos) return NextResponse.json({ erro: "não consegui ler os vídeos" }, { status: 500 });
    return NextResponse.json({ videos, narracoes: await narracoesDaParceira(chave) });
  }
  if (b.acao === "preparar") {
    const r = await prepararNarracaoParceira({
      chave,
      ref: String(b.ref ?? ""),
      mime: String(b.mime ?? ""),
      tamanhoBytes: Number(b.tamanhoBytes),
    });
    return NextResponse.json(r.ok ? r : { erro: r.msg }, { status: r.ok ? 200 : 400 });
  }
  if (b.acao === "montar") {
    const r = await montarNarracaoParceira({ chave, id: String(b.id ?? ""), atrasoMs: Number(b.atrasoMs) });
    return NextResponse.json(r.ok ? { msg: r.msg } : { erro: r.msg }, { status: r.ok ? 200 : 400 });
  }
  return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
}
