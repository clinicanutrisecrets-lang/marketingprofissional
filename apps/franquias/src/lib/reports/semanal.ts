"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { createClaude, CLAUDE_MODEL } from "@/lib/claude/client";

/**
 * Gera relatório semanal de performance pra uma franqueada.
 * Agrega métricas + Claude gera análise + recomendações.
 */
export async function gerarRelatorioSemanal(
  franqueadaId: string,
  semanaInicio: string,
): Promise<{ ok: boolean; relatorioId?: string; erro?: string }> {
  const admin = createAdminClient();
  const fim = new Date(semanaInicio);
  fim.setDate(fim.getDate() + 6);
  const semanaFim = fim.toISOString().slice(0, 10);

  // Pega posts da semana
  const { data: posts } = await admin
    .from("posts_agendados")
    .select("*")
    .eq("franqueada_id", franqueadaId)
    .eq("status", "postado")
    .gte("data_hora_postado", semanaInicio)
    .lte("data_hora_postado", `${semanaFim}T23:59:59`);

  const list = (posts ?? []) as Array<Record<string, unknown>>;
  if (list.length === 0) {
    return { ok: false, erro: "Nenhum post postado nessa semana" };
  }

  // Agrega métricas
  const total_posts = list.length;
  const total_alcance = sum(list, "alcance");
  const total_engajamento = sum(list, "engajamento");
  const taxa_engajamento =
    total_alcance > 0 ? (total_engajamento / total_alcance) * 100 : 0;

  // Melhor post (maior engajamento)
  const melhor = list.reduce((best, p) =>
    ((p.engajamento as number) ?? 0) > ((best.engajamento as number) ?? 0) ? p : best,
  );

  // IA vs manual
  const ia = list.filter((p) => p.origem === "ia_automatico");
  const manual = list.filter((p) => p.origem === "manual_nutri");
  const ia_eng = avg(ia, "engajamento");
  const manual_eng = avg(manual, "engajamento");

  // Claude análise
  const franqueada = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal")
    .eq("id", franqueadaId)
    .maybeSingle();
  const nome = (franqueada.data as { nome_comercial?: string } | null)?.nome_comercial ?? "a nutri";

  let analise = "";
  let recomendacoes: string[] = [];

  try {
    const claude = createClaude();
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analise a performance dessa nutricionista (${nome}) na semana de ${semanaInicio}:

Total de posts: ${total_posts}
Alcance total: ${total_alcance}
Engajamento total: ${total_engajamento}
Taxa de engajamento: ${taxa_engajamento.toFixed(2)}%
Melhor post: "${(melhor.copy_legenda as string)?.slice(0, 100)}..." com ${melhor.engajamento} interações
Posts IA (${ia.length}): engajamento médio ${ia_eng.toFixed(0)}
Posts manuais (${manual.length}): engajamento médio ${manual_eng.toFixed(0)}

Retorne APENAS JSON:
{
  "analise": "análise em 2-3 parágrafos curtos, tom amigável e profissional",
  "recomendacoes": ["rec 1 acionável", "rec 2", "rec 3"]
}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (block && block.type === "text") {
      const cleaned = block.text
        .trim()
        .replace(/^```(?:json)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned) as { analise: string; recomendacoes: string[] };
      analise = parsed.analise;
      recomendacoes = parsed.recomendacoes;
    }
  } catch (e) {
    console.warn("Claude análise falhou:", e);
    analise = "Análise automática indisponível.";
  }

  // Salva relatório
  const { data: rel, error } = await admin
    .from("relatorios_semanais")
    .upsert(
      {
        franqueada_id: franqueadaId,
        semana_inicio: semanaInicio,
        semana_fim: semanaFim,
        total_posts,
        total_alcance,
        total_engajamento,
        taxa_engajamento,
        melhor_post_id: melhor.id,
        melhor_formato: melhor.tipo_post,
        posts_ia_performance: {
          count: ia.length,
          engajamento_medio: Math.round(ia_eng),
        },
        posts_manual_performance: {
          count: manual.length,
          engajamento_medio: Math.round(manual_eng),
        },
        insight_manual_vs_ia:
          manual.length > 0 && ia.length > 0
            ? manual_eng > ia_eng
              ? `Posts manuais performaram ${Math.round(((manual_eng - ia_eng) / ia_eng) * 100)}% melhor que IA`
              : `Posts IA performaram ${Math.round(((ia_eng - manual_eng) / manual_eng) * 100)}% melhor que manuais`
            : null,
        analise_claude: analise,
        recomendacoes,
      },
      { onConflict: "franqueada_id,semana_inicio" },
    )
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };
  return { ok: true, relatorioId: (rel as { id: string }).id };
}

function sum(list: Array<Record<string, unknown>>, campo: string): number {
  return list.reduce((acc, p) => acc + ((p[campo] as number) ?? 0), 0);
}

function avg(list: Array<Record<string, unknown>>, campo: string): number {
  if (list.length === 0) return 0;
  return sum(list, campo) / list.length;
}
