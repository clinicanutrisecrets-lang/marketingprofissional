"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { gerarEUploadImagem, gerarCarrosselEUpload } from "@/lib/ai-image/render";
import type { EstiloCapa } from "@scanner/ai-image";
import { brandDaFranqueada } from "@/lib/ai-image/brand";
import { buscarArquivoUrl } from "@/lib/arquivos/url-asset";
import {
  conteudoDaArteUnica,
  slidesDoCarrosselSemanal,
} from "@/lib/geracao/carrossel-semanal";
import { logarCusto } from "@/lib/custos/log";

/**
 * Desenha a arte do post de venda na marca da profissional, com o MESMO
 * desenhador tipográfico do pacote da semana (custo zero, sem modelo de
 * imagem). Até 02/10/2026 o post de venda saía só com a copy: a arte era um
 * anexo opcional, e ninguém anexava.
 *
 * Feed = uma peça (título + subtítulo). Carrossel = um slide por item.
 * Reels e stories de venda são roteiro falado e não passam por aqui.
 */
export async function desenharArteDoPostVenda(params: {
  tipo: "feed_imagem" | "feed_carrossel";
  headline: string;
  subtitle?: string;
  slides?: string[];
  copy_legenda?: string;
}): Promise<{ ok: boolean; urls?: string[]; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: f } = await supabase
    .from("franqueadas")
    .select(
      "id, nome_comercial, nome_completo, cor_primaria_hex, cor_secundaria_hex, nicho_principal, estilo_capa",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };
  const fr = f as Record<string, unknown>;
  const franqueadaId = fr.id as string;

  const admin = createAdminClient();
  const [logoUrl, fotoUrl] = await Promise.all([
    buscarArquivoUrl(admin, franqueadaId, "logo_principal"),
    buscarArquivoUrl(admin, franqueadaId, "foto_profissional"),
  ]);
  const brand = brandDaFranqueada(fr, { logoUrl, fotoUrl });

  try {
    if (params.tipo === "feed_carrossel") {
      const slides = slidesDoCarrosselSemanal(params);
      if (slides.length < 2) {
        return { ok: false, erro: "Não há texto suficiente pra montar um carrossel." };
      }
      const r = await gerarCarrosselEUpload({
        franqueadaId,
        brand,
        slides,
        capaEstilo: (fr.estilo_capa as EstiloCapa | null) ?? undefined,
      });
      await logarCusto({
        franqueadaId,
        servico: "gemini",
        operacao: "render_imagem",
        metadata: { tipo: params.tipo, origem: "post_venda", slides: r.urls.length },
      });
      return { ok: true, urls: r.urls };
    }

    const r = await gerarEUploadImagem({
      franqueadaId,
      tipo: "feed_imagem",
      brand,
      conteudo: conteudoDaArteUnica(params),
    });
    await logarCusto({
      franqueadaId,
      servico: "gemini",
      operacao: "render_imagem",
      metadata: { tipo: params.tipo, origem: "post_venda" },
    });
    return { ok: true, urls: [r.url] };
  } catch (e) {
    await logarCusto({
      franqueadaId,
      servico: "gemini",
      operacao: "render_imagem",
      sucesso: false,
      erro: (e as Error).message,
      metadata: { tipo: params.tipo, origem: "post_venda" },
    });
    return { ok: false, erro: "Não consegui desenhar a arte agora. O post foi salvo só com a copy; anexe uma imagem ou tente de novo." };
  }
}
