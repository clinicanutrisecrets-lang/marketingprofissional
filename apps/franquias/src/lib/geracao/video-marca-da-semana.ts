import "server-only";

import type { createAdminClient } from "@/lib/supabase/server";
import {
  VIDEOS_MARCA,
  assinaturaVideoMarca,
  marcaDoCadastro,
  roteiroComoTexto,
  videosMarcaLiberadosPara,
} from "@/lib/videos/marca";
import { dispararVideoMarca } from "@/lib/videos/marca-servidor";
import {
  LEMBRETE_VIDEO_MARCA,
  PAPEL_VIDEO_MARCA,
  escolherVideoDaSemana,
} from "@/lib/geracao/video-marca-semana";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Um vídeo de marca por semana no pacote de domingo (Aline, 16/10/2026), pra
 * quem está FORA da fase de teste (as contas de EMAILS_VIDEOS_MARCA já veem
 * todos na aba Vídeos). Só entra se cabe no tema da semana ou no nicho dela, e
 * nunca repete. Best-effort: o pacote nunca falha por ele.
 *
 * Vídeo já pronto na marca atual dela: o post nasce pronto pra aprovar. Senão
 * nasce 'gerando' e o worker (.github/workflows/render-video-marca.yml)
 * preenche o vídeo e o vira em 'aguardando_aprovacao'.
 */
export async function montarVideoMarcaDaSemana(p: {
  admin: Admin;
  franqueadaId: string;
  franqueada: Record<string, unknown>;
  aprovacaoId: string;
  semanaRef: string;
  dataHora: string;
  logoUrl: string | null;
  textosDaSemana: (string | null | undefined)[];
  textosDoNicho: (string | null | undefined)[];
}): Promise<{ ok: true; gerados: number } | { ok: false; motivo: string }> {
  const { admin, franqueadaId, franqueada } = p;
  try {
    if (videosMarcaLiberadosPara(franqueada.email as string | null)) return { ok: true, gerados: 0 };

    const { data: usados, error: eU } = await admin
      .from("posts_agendados")
      .select("video_marca_id")
      .eq("franqueada_id", franqueadaId)
      .not("video_marca_id", "is", null)
      .not("status", "in", "(erro,cancelado)");
    // Sem ler o que ela já recebeu, não arrisca repetir.
    if (eU) return { ok: false, motivo: `leitura dos já usados: ${eU.message}` };
    const jaUsados = new Set((usados ?? []).map((u) => (u as { video_marca_id: string }).video_marca_id));

    const id = escolherVideoDaSemana({
      videos: VIDEOS_MARCA,
      textosDaSemana: p.textosDaSemana,
      textosDoNicho: p.textosDoNicho,
      jaUsados,
    });
    if (!id) return { ok: true, gerados: 0 };
    const video = VIDEOS_MARCA.find((v) => v.id === id)!;

    const marca = marcaDoCadastro({
      cor_primaria_hex: franqueada.cor_primaria_hex as string | null,
      cor_secundaria_hex: franqueada.cor_secundaria_hex as string | null,
      logoUrl: p.logoUrl,
    });
    const assinatura = assinaturaVideoMarca(video, marca);

    const { data: prontoRaw } = await admin
      .from("videos_marca")
      .select("url")
      .eq("franqueada_id", franqueadaId)
      .eq("assinatura", assinatura)
      .eq("status", "pronto")
      .not("url", "is", null)
      .limit(1)
      .maybeSingle();
    const pronto = (prontoRaw as { url: string } | null)?.url ?? null;

    const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
    if (!pronto && !token) return { ok: false, motivo: "falta GITHUB_ACTIONS_TOKEN" };

    const { data: novo, error: errIns } = await admin
      .from("posts_agendados")
      .insert({
        franqueada_id: franqueadaId,
        aprovacao_semanal_id: p.aprovacaoId,
        semana_ref: p.semanaRef,
        tipo_post: "reels",
        status: pronto ? "aguardando_aprovacao" : "gerando",
        origem: "ia_automatico",
        data_hora_agendada: p.dataHora,
        copy_legenda: video.legenda,
        copy_legenda_ia_original: video.legenda,
        papel_estrategia: PAPEL_VIDEO_MARCA,
        lembrete_execucao: LEMBRETE_VIDEO_MARCA,
        roteiro_reels: roteiroComoTexto(video, false),
        url_imagem_final: video.poster,
        url_video_final: pronto,
        video_marca_id: video.id,
        legenda_gerada_ia: false,
      } as never)
      .select("id")
      .single();
    if (errIns || !novo) return { ok: false, motivo: `insert: ${errIns?.message}` };
    const postId = (novo as { id: string }).id;
    if (pronto) return { ok: true, gerados: 1 };

    const disp = await dispararVideoMarca({ franqueadaId, video, marca, assinatura, token: token!, postId });
    if (!disp.ok) {
      // 'erro' libera a próxima semana a tentar este vídeo de novo.
      await admin.from("posts_agendados").update({ status: "erro" } as never).eq("id", postId);
      return { ok: false, motivo: disp.motivo };
    }
    console.log("[semanal] vídeo de marca da semana disparado", franqueadaId, video.id, postId);
    return { ok: true, gerados: 1 };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}
