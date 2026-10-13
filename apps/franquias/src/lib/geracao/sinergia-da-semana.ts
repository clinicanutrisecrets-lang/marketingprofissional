import type { createAdminClient } from "@/lib/supabase/server";
import type { ContextoFranqueada } from "@/lib/claude/prompts";
import { chavesUsadas, buscarReceitaSinergia, escreverSinergia, dispararRenderSinergia } from "@/lib/conteudo/sinergia-semanal";
import { diaDaSinergia } from "@/lib/geracao/sinergia";
import { temaSinergiaDoTemaEmAlta, type TemaEmAlta } from "@/lib/geracao/tema-em-alta";
import { COR_PRIMARIA_PADRAO } from "@/lib/ai-image/brand";
import { CLAUDE_MODEL_COPY } from "@/lib/claude/client";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * O carrossel de SINERGIA + o trio de stories (Aline, 05/10/2026).
 * A foto e a receita vêm do Scanner (receita real, nunca inventada); o
 * modelo escreve a sinergia e o worker (render-sinergia.yml) desenha com a
 * cor e a logo da conta. Os cards nascem sem arte e recebem os slides em ~3 min.
 *
 * Usada pelo pacote de domingo e pelo "Refazer a sinergia" do admin
 * (refazerSinergiaAdmin), pra a regra ser uma só.
 */
export async function montarSinergiaDaSemana(p: {
  admin: Admin;
  franqueadaId: string;
  franqueada: Record<string, unknown>;
  aprovacaoId: string;
  semanaRef: string;
  contexto: ContextoFranqueada;
  queixas: string[];
  temaEmAlta: TemaEmAlta | null;
  logoUrl: string | null;
}): Promise<{ ok: true; gerados: number } | { ok: false; motivo: string }> {
  const { admin, franqueadaId, franqueada, aprovacaoId, semanaRef, contexto, temaEmAlta } = p;
  try {
    const textoTema = [
      p.queixas.join(", "),
      contexto.publico?.queixas?.join(", ") ?? "",
      (franqueada.publico_alvo_descricao as string | null) ?? "",
    ]
      .filter(Boolean)
      .join(" · ");
    const usadas = await chavesUsadas(admin, franqueadaId);
    // Tema em alta que cai numa área de saúde (ex.: câncer de intestino →
    // intestino) escolhe a receita e o assunto da sinergia (Aline, 07/10).
    const temaSinergia = temaSinergiaDoTemaEmAlta(temaEmAlta);
    const r = await buscarReceitaSinergia({
      texto: textoTema,
      temas: temaSinergia ? [temaSinergia] : undefined,
      usadas,
      semente: `${franqueadaId}:${semanaRef}`,
    });
    if (!r.ok) return { ok: false, motivo: `receita: ${r.motivo}` };
    const esc = await escreverSinergia({
      franqueadaId,
      receita: r.receita,
      nicho: (franqueada.nicho_principal as string) ?? null,
      publico: contexto.publico ?? null,
      publicoTexto: (franqueada.publico_alvo_descricao as string | null) ?? null,
      queixas: p.queixas.join(", ") || null,
      temaEmAlta: temaSinergia ? temaEmAlta : null,
    });
    if (!esc.ok) return { ok: false, motivo: `texto: ${esc.motivo}` };
    if (esc.avisos.length) console.warn("[sinergia] linhas descartadas:", esc.avisos.join(" | "));
    const c = esc.conteudo;
    const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice();
    const dataHora = calcularDataHora(
      semanaRef,
      diaDaSinergia(dias),
      (franqueada.horario_preferido_post as string) ?? "08:00",
    );
    const base = {
      franqueada_id: franqueadaId,
      aprovacao_semanal_id: aprovacaoId,
      semana_ref: semanaRef,
      status: "aguardando_aprovacao",
      origem: "ia_automatico",
      sinergia_chave: r.receita.chave,
      data_hora_agendada: dataHora,
      legenda_gerada_ia: true,
    };
    const { data: car, error: carErr } = await admin
      .from("posts_agendados")
      .insert({
        ...base,
        tipo_post: "feed_carrossel",
        copy_legenda: c.legenda,
        copy_cta: c.cta,
        hashtags: c.hashtags,
        copy_legenda_ia_original: c.legenda,
        copy_cta_ia_original: c.cta,
        hashtags_ia_original: c.hashtags,
        papel_estrategia: (temaSinergia && temaEmAlta
          ? `Sinergia da semana, puxada pelo tema em alta "${temaEmAlta.tema}": ${c.titulo_receita}`
          : `Sinergia da semana: ${c.titulo_receita}`
        ).slice(0, 300),
        lembrete_execucao: "Poste o carrossel e, no mesmo dia, os três stories que vêm logo abaixo.",
        ia_model_usado: CLAUDE_MODEL_COPY,
      })
      .select("id")
      .single();
    if (carErr || !car) return { ok: false, motivo: carErr?.message ?? "insert do carrossel falhou" };
    const carrosselId = (car as { id: string }).id;
    const storyIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const { data: st, error: stErr } = await admin
        .from("posts_agendados")
        .insert({
          ...base,
          tipo_post: "stories",
          copy_legenda: "",
          papel_estrategia: `Stories da sinergia ${i} de 3: ${c.titulo_receita}`.slice(0, 300),
        })
        .select("id")
        .single();
      if (stErr || !st) break;
      storyIds.push((st as { id: string }).id);
    }
    const handle = (franqueada.instagram_handle as string | null) ?? "";
    const disp = await dispararRenderSinergia({
      franqueadaId,
      conteudo: c,
      fotoUrl: r.receita.foto_url,
      marca: {
        cor: (franqueada.cor_primaria_hex as string | null) || COR_PRIMARIA_PADRAO,
        cor2: (franqueada.cor_secundaria_hex as string | null) || (franqueada.cor_primaria_hex as string | null) || COR_PRIMARIA_PADRAO,
        logo_url: p.logoUrl ?? null,
        handle: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "",
        rodape: ((franqueada.nome_comercial as string | null) || (franqueada.nome_completo as string | null) || "").trim(),
      },
      carrosselPostId: carrosselId,
      storyPostIds: storyIds,
    });
    if (!disp.ok) {
      // Sem worker, os cards ficariam vazios: saem inteiros.
      await admin.from("posts_agendados").delete().in("id", [carrosselId, ...storyIds]);
      return { ok: false, motivo: disp.motivo };
    }
    return { ok: true, gerados: 1 + storyIds.length };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}

function calcularDataHora(semanaRef: string, diaSemana: number, horario: string): string {
  const [h, m] = horario.split(":").map(Number);
  const d = new Date(semanaRef);
  const diff = (diaSemana - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
