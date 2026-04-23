import { NextResponse } from "next/server";
import { gerarImagemPreview } from "@/lib/ai-image/render";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * POST /api/ai-image/preview
 * Gera uma imagem de preview sem upload — retorna PNG inline.
 *
 * Auth: requer sessão de admin (franqueada logada serve em dev).
 *
 * Body:
 * {
 *   tipo: "feed_imagem" | "feed_carrossel" | "stories",
 *   provider: "openai" | "gemini",
 *   brand: { nomeMarca, corPrimariaHex, corSecundariaHex?, logoUrl?, tomVisual?, nicho? },
 *   conteudo: { headline, subtitle?, corpo?, cta?, eyebrow? },
 *   modoTexto?: "sharp_overlay" | "ia_gera"
 * }
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const tipo = body.tipo as "feed_imagem" | "feed_carrossel" | "stories" | undefined;
  const provider = body.provider as "openai" | "gemini" | undefined;
  const brand = body.brand as Record<string, unknown> | undefined;
  const conteudo = body.conteudo as Record<string, unknown> | undefined;
  const modoTexto = body.modoTexto as "sharp_overlay" | "ia_gera" | undefined;

  if (!tipo || !provider || !brand || !conteudo) {
    return NextResponse.json(
      { erro: "Campos obrigatórios: tipo, provider, brand, conteudo" },
      { status: 400 },
    );
  }
  if (!brand.nomeMarca || !brand.corPrimariaHex) {
    return NextResponse.json(
      { erro: "brand.nomeMarca e brand.corPrimariaHex obrigatórios" },
      { status: 400 },
    );
  }
  if (!conteudo.headline) {
    return NextResponse.json({ erro: "conteudo.headline obrigatório" }, { status: 400 });
  }

  try {
    const r = await gerarImagemPreview({
      tipo,
      provider,
      brand: {
        nomeMarca: brand.nomeMarca as string,
        corPrimariaHex: brand.corPrimariaHex as string,
        corSecundariaHex: brand.corSecundariaHex as string | undefined,
        logoUrl: brand.logoUrl as string | undefined,
        tomVisual: brand.tomVisual as string | undefined,
        nicho: brand.nicho as string | undefined,
      },
      conteudo: {
        headline: conteudo.headline as string,
        subtitle: conteudo.subtitle as string | undefined,
        corpo: conteudo.corpo as string | undefined,
        cta: conteudo.cta as string | undefined,
        eyebrow: conteudo.eyebrow as string | undefined,
      },
      modoTexto,
    });

    return new NextResponse(new Uint8Array(r.buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-AI-Image-Provider": r.meta.provider,
        "X-AI-Image-Modo": r.meta.modoTexto,
        "X-AI-Image-Tempo-Ms": String(r.meta.tempoMs),
        "X-AI-Image-Custo-Usd": r.meta.custoEstimadoUsd.toFixed(3),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
