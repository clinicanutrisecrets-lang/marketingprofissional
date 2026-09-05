import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { gerarRaioXPublico } from "@/lib/automacao/raio-x-publico";
import { diagnosticoConta } from "@/lib/automacao/diagnostico-conta";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Rota INTERNA (só leitura) pra rodar o Raio-X do público e o diagnóstico da
 * conexão sem precisar de sessão no Estúdio — é como a sessão de trabalho da
 * Aline dispara o mapeamento pra ela.
 *
 *   GET  /api/interno/raio-x?slug=nutrisecrets            → diagnóstico (o que o token alcança)
 *   POST /api/interno/raio-x?slug=nutrisecrets            → gera e salva o Raio-X
 *
 * Auth: Authorization: Bearer {STUDIO_CONHECIMENTO_SECRET}.
 *
 * 🔴 NUNCA escreve no Instagram: não responde comentário, não manda DM, não
 * publica. Só lê a conta e grava a análise em aline.ig_analises.
 */
function autorizado(req: Request): boolean {
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const slug = new URL(request.url).searchParams.get("slug") ?? "nutrisecrets";
  try {
    return NextResponse.json(await diagnosticoConta(slug));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!autorizado(request)) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "nutrisecrets";
  const limite = Number(url.searchParams.get("posts") ?? 60) || 60;
  try {
    const r = await gerarRaioXPublico(slug, limite);
    return NextResponse.json({ ok: true, id: r.id, avisos: r.avisos, posts: r.dados.posts.length });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
