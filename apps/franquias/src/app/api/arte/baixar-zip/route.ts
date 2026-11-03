import JSZip from "jszip";
import { NextResponse } from "next/server";
import { itensDoZip, nomeArquivoSeguro } from "@/lib/arte-download";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/arte/baixar-zip  (formulário: itens=<JSON [{u, n}]>, nome=<arquivo.zip>)
 *
 * Junta várias artes num .zip e entrega como DOWNLOAD do mesmo domínio. Ver
 * `itensDoZip` em `src/lib/arte-download.ts` pro porquê (Zulene, 03/11/2026).
 * Formulário e não fetch: o envio do formulário é uma navegação do próprio
 * clique, e a resposta com `attachment` vira download sem sair da tela, mesmo
 * dentro do Scanner. Sem checagem de sessão pelo mesmo motivo de
 * `/api/arte/baixar`: só aceita link do Storage do Marketing.
 */
export async function POST(request: Request) {
  let bruto: unknown = [];
  let nome = "artes.zip";
  try {
    const form = await request.formData();
    bruto = JSON.parse(String(form.get("itens") ?? "[]"));
    nome = String(form.get("nome") ?? nome);
  } catch {
    return NextResponse.json({ erro: "pedido inválido" }, { status: 400 });
  }
  const itens = itensDoZip(bruto, process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (itens.length === 0) {
    return NextResponse.json({ erro: "nenhuma arte válida" }, { status: 400 });
  }

  const zip = new JSZip();
  let faltaram = 0;
  await Promise.all(
    itens.map(async (it) => {
      try {
        const alvo = it.u.startsWith("/") ? new URL(it.u, request.url).toString() : it.u;
        const res = await fetch(alvo, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        zip.file(it.n, Buffer.from(await res.arrayBuffer()));
      } catch (err) {
        faltaram++;
        console.error("[arte/baixar-zip] arte não entrou no zip:", it.n, err instanceof Error ? err.message : err);
      }
    }),
  );
  if (faltaram === itens.length) {
    return NextResponse.json({ erro: "não consegui buscar as artes" }, { status: 502 });
  }

  // Em STREAMING: a semana inteira passa de 15 MB, e resposta montada de uma
  // vez na Vercel para em 4,5 MB.
  const arquivo = nomeArquivoSeguro(nome).replace(/\.zip$/i, "") + ".zip";
  const fluxo = zip.generateInternalStream({ type: "uint8array", streamFiles: true, compression: "STORE" });
  const corpo = new ReadableStream<Uint8Array>({
    start(controller) {
      fluxo
        .on("data", (pedaco: Uint8Array) => controller.enqueue(pedaco))
        .on("error", (err: Error) => {
          console.error("[arte/baixar-zip] falha montando o zip:", err.message);
          controller.error(err);
        })
        .on("end", () => controller.close())
        .resume();
    },
  });
  return new Response(corpo, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${arquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
