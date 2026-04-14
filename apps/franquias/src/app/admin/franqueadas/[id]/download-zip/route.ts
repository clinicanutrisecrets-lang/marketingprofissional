import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { listarArquivosParaZip } from "@/lib/admin/actions";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Valida que o request é de admin
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Busca dados da franqueada + arquivos
  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("nome_comercial, nome_completo, email")
    .eq("id", id)
    .maybeSingle();

  const resultado = await listarArquivosParaZip(id);
  if (!resultado.ok || resultado.arquivos.length === 0) {
    return new NextResponse("Nenhum arquivo", { status: 404 });
  }

  const zip = new JSZip();

  // Agrupa arquivos por tipo em pastas
  for (const arq of resultado.arquivos) {
    try {
      const response = await fetch(arq.url_fresh);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      zip.file(`${arq.tipo}/${arq.nome_arquivo}`, buffer);
    } catch {
      // Ignora arquivos que falharem no download
    }
  }

  // Adiciona um README.txt com os dados básicos
  const f = franqueada as { nome_comercial?: string; nome_completo?: string; email?: string } | null;
  zip.file(
    "README.txt",
    `Franqueada: ${f?.nome_comercial ?? f?.nome_completo ?? "—"}
Email: ${f?.email ?? "—"}
Data do download: ${new Date().toISOString()}
Total de arquivos: ${resultado.arquivos.length}
`,
  );

  const content = await zip.generateAsync({ type: "uint8array" });
  const slug = (f?.nome_comercial ?? f?.nome_completo ?? "franqueada")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-arquivos.zip"`,
    },
  });
}
