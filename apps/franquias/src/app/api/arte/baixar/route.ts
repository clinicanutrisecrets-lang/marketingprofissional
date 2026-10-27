import { NextResponse } from "next/server";
import { nomeArquivoSeguro, urlArtePermitida } from "@/lib/arte-download";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/arte/baixar?u=<link da arte no Storage>&n=<nome do arquivo>
 *
 * Entrega a arte como DOWNLOAD (Content-Disposition: attachment), do mesmo
 * domínio da tela. Ver `src/lib/arte-download.ts` pro porquê.
 *
 * Sem checagem de sessão de propósito: dentro do Scanner o cookie do Marketing
 * é de terceiro e pode não ir junto num download, e a rota não dá acesso a
 * nada novo — só aceita link do Storage do Marketing, e o link assinado já é a
 * permissão de leitura daquela arte.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const url = params.get("u") ?? "";
  if (!urlArtePermitida(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return NextResponse.json({ erro: "endereço de arte não permitido" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error("[arte/baixar] falha ao buscar a arte:", err instanceof Error ? err.message : err);
    return NextResponse.json({ erro: "não consegui buscar a arte" }, { status: 502 });
  }
  if (!res.ok || !res.body) {
    console.error("[arte/baixar] Storage respondeu", res.status);
    return NextResponse.json({ erro: "arte não encontrada" }, { status: res.status === 404 ? 404 : 502 });
  }

  const nome = nomeArquivoSeguro(params.get("n"));
  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      ...(res.headers.get("content-length") ? { "Content-Length": res.headers.get("content-length")! } : {}),
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
