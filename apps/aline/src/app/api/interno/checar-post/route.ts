import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { checarPost } from "@/lib/automacao/checar-post";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Rota INTERNA (só leitura): "a API pega os comentários deste post?".
 *
 *   GET /api/interno/checar-post?slug=nutrisecrets&link=<url do post>
 *
 * Auth: Authorization: Bearer {STUDIO_CONHECIMENTO_SECRET}.
 *
 * 🔴 NUNCA escreve no Instagram.
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
  const url = new URL(request.url);
  const link = url.searchParams.get("link");
  if (!link) return NextResponse.json({ erro: "Falta o parâmetro link" }, { status: 400 });
  const slug = url.searchParams.get("slug") ?? "nutrisecrets";
  const posts = Number(url.searchParams.get("posts") ?? 200) || 200;
  try {
    return NextResponse.json(await checarPost(slug, link, posts));
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
