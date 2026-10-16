import type { createAdminClient } from "@/lib/supabase/server";
import { gerarCarrosselEditorialEUpload } from "@/lib/ai-image/render";
import { brandDaFranqueada } from "@/lib/ai-image/brand";
import { PAPEL_POST_FIXO } from "@/lib/geracao/post-fixo";
import { PAPEL_FABRICA } from "@/lib/geracao/fabrica";
import { escreverQuemEuSou } from "@/lib/geracao/quem-eu-sou-gerar";
import {
  PAPEL_QUEM_EU_SOU,
  LEMBRETE_QUEM_EU_SOU,
  HASHTAGS_QUEM_EU_SOU,
  ASSUNTOS_QUEM_EU_SOU,
  materialQuemEuSou,
  slidesQuemEuSou,
  vezDoQuemEuSou,
} from "@/lib/geracao/quem-eu-sou";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * O 3º post fixo, "Quem eu sou" (lib/geracao/quem-eu-sou.ts), uma vez por
 * conta, na semana seguinte à da Fábrica. Best-effort: o pacote da semana
 * nunca falha por ele.
 *
 * 🔴 Erro ao ler qualquer contagem NÃO gera o post (melhor faltar numa semana
 * do que repetir toda semana). Sem história respondida, não gera.
 */
export async function montarQuemEuSouDaSemana(p: {
  admin: Admin;
  franqueadaId: string;
  franqueada: Record<string, unknown>;
  aprovacaoId: string;
  semanaRef: string;
  logoUrl: string | null;
  palavrasEvitar: string | null;
  naoAtende: string | null;
  /** Foto DELA de "Minhas fotos" com um dos assuntos. null quando não tem. */
  fotoDela: (assuntos: readonly string[]) => Promise<Buffer | null>;
}): Promise<{ ok: true; gerados: number } | { ok: false; motivo: string }> {
  const { admin, franqueadaId, franqueada, aprovacaoId, semanaRef } = p;
  try {
    const material = materialQuemEuSou(franqueada);
    if (!material) return { ok: true, gerados: 0 };

    const contar = async (papel: string, antesDe: string | null) => {
      let q = admin
        .from("posts_agendados")
        .select("semana_ref")
        .eq("franqueada_id", franqueadaId)
        .eq("papel_estrategia", papel)
        .not("status", "in", "(erro,cancelado)");
      if (antesDe) q = q.lt("semana_ref", antesDe);
      return q;
    };
    const [jaTem, consulta, fabrica] = await Promise.all([
      contar(PAPEL_QUEM_EU_SOU, null),
      contar(PAPEL_POST_FIXO, semanaRef),
      contar(PAPEL_FABRICA, semanaRef),
    ]);
    if (jaTem.error || consulta.error || fabrica.error) {
      return { ok: false, motivo: `contagem: ${(jaTem.error ?? consulta.error ?? fabrica.error)!.message}` };
    }
    const semanas = (r: { data: unknown }) =>
      ((r.data as Array<{ semana_ref: string }> | null) ?? []).map((x) => x.semana_ref);
    if (
      !vezDoQuemEuSou({
        jaTem: (jaTem.data ?? []).length > 0,
        semanasConsulta: semanas(consulta),
        semanasFabrica: semanas(fabrica),
        semanaRef,
      })
    ) {
      return { ok: true, gerados: 0 };
    }

    const r = await escreverQuemEuSou({
      franqueadaId,
      material,
      marca: {
        nome: material.nome,
        cidade: material.cidade,
        diferencial: material.diferenciais,
        palavras_evitar: p.palavrasEvitar,
      },
      revisao: { nao_atende: p.naoAtende, palavras_evitar: p.palavrasEvitar },
    });
    if (!r.ok) return { ok: false, motivo: `texto: ${r.motivo}` };

    // Fotos DELA, por assunto. Sem foto, o slide sai só com texto.
    const capa = await p.fotoDela(ASSUNTOS_QUEM_EU_SOU.capa).catch(() => null);
    const porque = await p.fotoDela(ASSUNTOS_QUEM_EU_SOU.porque).catch(() => null);
    const onde = await p.fotoDela(ASSUNTOS_QUEM_EU_SOU.onde).catch(() => null);

    const slides = slidesQuemEuSou(material, r.textos, { porque: porque ?? undefined, onde: onde ?? undefined });
    const brand = brandDaFranqueada(franqueada as Parameters<typeof brandDaFranqueada>[0], {
      logoUrl: p.logoUrl,
      fotoUrl: null,
    });
    const handle = ((franqueada.instagram_handle as string | null) ?? "").trim();
    const out = await gerarCarrosselEditorialEUpload({
      franqueadaId,
      slides,
      fotoCapa: capa ?? undefined,
      destaqueHex: brand.corPrimariaHex,
      logoUrl: p.logoUrl,
      assinatura: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : undefined,
    });
    if (out.urls.length < 2) return { ok: false, motivo: "o carrossel não saiu" };

    const { error } = await admin.from("posts_agendados").insert({
      franqueada_id: franqueadaId,
      aprovacao_semanal_id: aprovacaoId,
      semana_ref: semanaRef,
      tipo_post: "feed_carrossel",
      status: "aguardando_aprovacao",
      origem: "ia_automatico",
      data_hora_agendada: primeiroDiaDaSemana(semanaRef, franqueada),
      copy_legenda: r.textos.legenda,
      copy_legenda_ia_original: r.textos.legenda,
      hashtags: HASHTAGS_QUEM_EU_SOU,
      hashtags_ia_original: HASHTAGS_QUEM_EU_SOU,
      papel_estrategia: PAPEL_QUEM_EU_SOU,
      lembrete_execucao: LEMBRETE_QUEM_EU_SOU,
      url_imagem_final: out.urls[0],
      urls_slides: out.urls,
      legenda_gerada_ia: true,
    } as never);
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
