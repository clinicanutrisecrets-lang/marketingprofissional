import type { createAdminClient } from "@/lib/supabase/server";
import type { ConteudoPeca } from "@scanner/ai-image";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Redesenha a arte de um post com o texto dado e a MESMA foto da arte
 * anterior (`foto_arte_ref`). É o desenhador tipográfico da geração: nenhum
 * modelo é chamado, então custa zero. Usado pelo "Corrigir" da tela Aprovar
 * (texto editado) e pela tarefa que refez as artes com foto cortada (18/10).
 * Não grava nada no post: quem chama decide o que salvar.
 */
export async function desenharArteDoPost(p: {
  admin: Admin;
  franqueadaId: string;
  tipoPost: string;
  pecas: ConteudoPeca[];
  fotoRef: string | null;
}): Promise<{ urlImagem: string; urlsSlides: string[] | null }> {
  const { admin, franqueadaId } = p;
  const { data: f } = await admin.from("franqueadas").select("*").eq("id", franqueadaId).maybeSingle();
  if (!f) throw new Error("Conta não encontrada.");
  const { brandDaFranqueada } = await import("@/lib/ai-image/brand");
  const { buscarArquivoUrl } = await import("@/lib/arquivos/url-asset");
  const { gerarEUploadImagem, gerarCarrosselEUpload } = await import("@/lib/ai-image/render");
  const { caminhoNoBucket } = await import("@/lib/geracao/fotos-banco");

  const logoUrl = await buscarArquivoUrl(admin, franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(admin, franqueadaId, "foto_profissional");
  const brand = brandDaFranqueada(f as Parameters<typeof brandDaFranqueada>[0], { logoUrl, fotoUrl });

  // A mesma foto do banco que estava na arte. Se ela não baixar mais, a arte
  // sai sem foto em vez de travar.
  let foto: Buffer | undefined;
  if (p.fotoRef) {
    try {
      const local = caminhoNoBucket(p.fotoRef);
      if (local) {
        const { data } = await admin.storage.from(local.bucket).download(local.path);
        if (data) foto = Buffer.from(await data.arrayBuffer());
      } else {
        const res = await fetch(p.fotoRef, { signal: AbortSignal.timeout(10000) });
        if (res.ok) foto = Buffer.from(await res.arrayBuffer());
      }
    } catch {
      console.warn(`[redesenhar] foto ${p.fotoRef} não baixou; segue sem foto`);
    }
  }

  if (p.tipoPost === "feed_carrossel") {
    const r = await gerarCarrosselEUpload({
      franqueadaId,
      brand,
      slides: p.pecas,
      fotoCapa: foto,
      capaEstilo: ((f as { estilo_capa?: string | null }).estilo_capa ?? undefined) as never,
    });
    if (!r.urls.length) throw new Error("carrossel sem slides");
    return { urlImagem: r.urls[0]!, urlsSlides: r.urls };
  }
  const r = await gerarEUploadImagem({
    franqueadaId,
    tipo: p.tipoPost as "feed_imagem" | "stories",
    brand,
    conteudo: p.pecas[0]!,
    fotoPropria: foto,
  });
  return { urlImagem: r.url, urlsSlides: null };
}
