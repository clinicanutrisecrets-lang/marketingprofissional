import "server-only";
import type { createAdminClient } from "@/lib/supabase/server";
import { rankingAngulosPorAutoridade } from "./autoridade";
import { agregarEdicoesPorAngulo } from "./aprendizado";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Constrói um bloco de "aprendizado" desta nutri pra injetar no prompt de geração:
 *  - quais ângulos mais constroem AUTORIDADE (priorizar profundidade)
 *  - quais ângulos a nutri mais EDITA (a IA acerta menos → caprichar)
 * Retorna "" quando ainda não há histórico suficiente.
 */
export async function construirContextoAprendizado(
  admin: Admin,
  franqueadaId: string,
): Promise<string> {
  const { data } = await admin
    .from("posts_agendados")
    .select(
      "angulo_copy, copy_legenda, copy_legenda_ia_original, alcance, curtidas, comentarios, compartilhamentos, salvamentos, cliques_link",
    )
    .eq("franqueada_id", franqueadaId)
    .eq("status", "publicado")
    .order("data_hora_postado", { ascending: false })
    .limit(40);

  const posts = (data ?? []) as Array<Record<string, unknown>>;
  if (posts.length < 5) return ""; // pouco histórico → não enviesa

  const metricas = posts.map((p) => ({
    angulo_copy: (p.angulo_copy as string) ?? null,
    alcance: (p.alcance as number) ?? null,
    curtidas: (p.curtidas as number) ?? null,
    comentarios: (p.comentarios as number) ?? null,
    compartilhamentos: (p.compartilhamentos as number) ?? null,
    salvamentos: (p.salvamentos as number) ?? null,
    cliques_link: (p.cliques_link as number) ?? null,
  }));
  const edicoes = posts.map((p) => ({
    angulo_copy: (p.angulo_copy as string) ?? null,
    copy_legenda_ia_original: (p.copy_legenda_ia_original as string) ?? null,
    copy_legenda: (p.copy_legenda as string) ?? null,
  }));

  const rankingAut = rankingAngulosPorAutoridade(metricas);
  const rankingEdic = agregarEdicoesPorAngulo(edicoes);

  const linhas: string[] = [];
  if (rankingAut.length > 0) {
    const top = rankingAut.slice(0, 3).map((r) => r.angulo).join(", ");
    linhas.push(
      `- Ângulos que MAIS constroem autoridade pra esta nutri (priorize profundidade neles): ${top}`,
    );
  }
  const muitoEditados = rankingEdic.filter((r) => r.taxaEdicaoMedia >= 0.4).slice(0, 2);
  if (muitoEditados.length > 0) {
    linhas.push(
      `- Ângulos que a nutri costuma reescrever bastante (capriche no tom e na precisão): ${muitoEditados
        .map((r) => r.angulo)
        .join(", ")}`,
    );
  }

  if (linhas.length === 0) return "";
  return `\n\nAPRENDIZADO DO HISTÓRICO DESTA NUTRI (use pra calibrar, não cite literalmente):\n${linhas.join("\n")}`;
}
