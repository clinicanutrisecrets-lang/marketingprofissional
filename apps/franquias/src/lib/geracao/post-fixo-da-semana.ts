import type { createAdminClient } from "@/lib/supabase/server";
import type { SlideEditorial } from "@scanner/ai-image";
import { gerarCarrosselEditorialEUpload } from "@/lib/ai-image/render";
import { brandDaFranqueada } from "@/lib/ai-image/brand";
import {
  PAPEL_POST_FIXO,
  LEMBRETE_POST_FIXO,
  AVISO_POST_FIXO,
  LEGENDA_POST_FIXO,
  HASHTAGS_POST_FIXO,
  slidesDoPostFixo,
  combinacaoDeFotos,
  arquivoDaFoto,
  fotoDoPostFixoUrl,
  type FotoPostFixo,
} from "@/lib/geracao/post-fixo";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * O post fixo do perfil (lib/geracao/post-fixo.ts), uma vez por conta.
 * Best-effort: o pacote da semana nunca falha por ele.
 *
 * 🔴 "Uma vez" é decidido pelo PAPEL gravado no post: se a conta já tem um
 * post com esse papel, em qualquer semana e em qualquer status, não entra
 * outro. Erro ao ler essa contagem NÃO gera o post (melhor faltar numa
 * semana do que repetir toda semana).
 */
export async function montarPostFixoDaSemana(p: {
  admin: Admin;
  franqueadaId: string;
  franqueada: Record<string, unknown>;
  aprovacaoId: string;
  semanaRef: string;
  logoUrl: string | null;
}): Promise<{ ok: true; gerados: number } | { ok: false; motivo: string }> {
  const { admin, franqueadaId, franqueada, aprovacaoId, semanaRef } = p;
  try {
    const { count, error: cErr } = await admin
      .from("posts_agendados")
      .select("id", { count: "exact", head: true })
      .eq("franqueada_id", franqueadaId)
      .eq("papel_estrategia", PAPEL_POST_FIXO);
    if (cErr) return { ok: false, motivo: `contagem: ${cErr.message}` };
    if ((count ?? 0) > 0) return { ok: true, gerados: 0 };

    const combo = combinacaoDeFotos(franqueadaId);
    const fotos = new Map<FotoPostFixo, Buffer>();
    for (const f of Object.keys(combo) as FotoPostFixo[]) {
      const url = fotoDoPostFixoUrl(arquivoDaFoto(combo[f], f));
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
      if (!res.ok) return { ok: false, motivo: `foto ${f} não baixou (${res.status})` };
      fotos.set(f, Buffer.from(await res.arrayBuffer()));
    }

    const slides: SlideEditorial[] = slidesDoPostFixo().map((s) => {
      if (s.tipo !== "foto") return s;
      const { fotoNome, ...resto } = s;
      return { ...resto, foto: fotos.get(fotoNome)! };
    });

    const brand = brandDaFranqueada(franqueada as Parameters<typeof brandDaFranqueada>[0], {
      logoUrl: p.logoUrl,
      fotoUrl: null,
    });
    const handle = ((franqueada.instagram_handle as string | null) ?? "").trim();
    const r = await gerarCarrosselEditorialEUpload({
      franqueadaId,
      slides,
      fotoCapa: fotos.get("01-capa"),
      destaqueHex: brand.corPrimariaHex,
      logoUrl: p.logoUrl,
      assinatura: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : undefined,
      aviso: AVISO_POST_FIXO,
    });
    if (r.urls.length < 2) return { ok: false, motivo: "o carrossel não saiu" };

    const { error } = await admin.from("posts_agendados").insert({
      franqueada_id: franqueadaId,
      aprovacao_semanal_id: aprovacaoId,
      semana_ref: semanaRef,
      tipo_post: "feed_carrossel",
      status: "aguardando_aprovacao",
      origem: "ia_automatico",
      // Primeiro da semana: é o que abre o perfil.
      data_hora_agendada: primeiroDiaDaSemana(semanaRef, franqueada),
      copy_legenda: LEGENDA_POST_FIXO,
      copy_legenda_ia_original: LEGENDA_POST_FIXO,
      hashtags: HASHTAGS_POST_FIXO,
      hashtags_ia_original: HASHTAGS_POST_FIXO,
      papel_estrategia: PAPEL_POST_FIXO,
      lembrete_execucao: LEMBRETE_POST_FIXO,
      url_imagem_final: r.urls[0],
      urls_slides: r.urls,
      legenda_gerada_ia: false,
    });
    if (error) return { ok: false, motivo: `insert: ${error.message}` };
    return { ok: true, gerados: 1 };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}

function primeiroDiaDaSemana(semanaRef: string, franqueada: Record<string, unknown>): string {
  const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice().sort((a, b) => a - b);
  const horario = (franqueada.horario_preferido_post as string) ?? "08:00";
  const [h, m] = horario.split(":").map(Number);
  const d = new Date(semanaRef);
  const diff = ((dias[0] ?? 1) - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(h ?? 8, m ?? 0, 0, 0);
  return d.toISOString();
}
