import "server-only";
import { createAlineClient } from "@/lib/supabase/server";

export type TipoPeca =
  | "feed_imagem"
  | "feed_carrossel"
  | "stories"
  | "reels"
  | "generico";

export type CanvaDesignRow = {
  id: string;
  perfil_id: string | null;
  design_id: string;
  tipo: TipoPeca;
  tags: string[];
  descricao: string | null;
  ativo: boolean;
  ultimo_uso: string | null;
  uso_count: number;
};

/**
 * Escolhe 1 design do pool baseado em:
 * 1. Match de tipo (feed_imagem / carrossel / stories / reels)
 * 2. Designs específicos do perfil_id têm prioridade sobre shared (NULL)
 * 3. Match de tags do post (intersecção); mais tags coincidindo = melhor
 * 4. Tie-break: LRU (ultimo_uso ASC, NULLs primeiro) pra rotacionar
 *
 * Retorna null se não houver design ativo do tipo.
 */
export async function pickCanvaDesign(input: {
  perfilId: string;
  tipo: TipoPeca;
  tags?: string[];
}): Promise<CanvaDesignRow | null> {
  const admin = createAlineClient();

  const { data, error } = await admin
    .from("canva_designs")
    .select("*")
    .eq("ativo", true)
    .eq("tipo", input.tipo)
    .or(`perfil_id.eq.${input.perfilId},perfil_id.is.null`);

  if (error || !data || data.length === 0) return null;

  const rows = data as unknown as CanvaDesignRow[];

  const ranqueados = rows
    .map((r) => {
      const tagsPost = input.tags ?? [];
      const intersecao = r.tags.filter((t) => tagsPost.includes(t)).length;
      const ehProprio = r.perfil_id === input.perfilId ? 1 : 0;
      const ultimoUsoMs = r.ultimo_uso ? new Date(r.ultimo_uso).getTime() : 0;
      return { r, intersecao, ehProprio, ultimoUsoMs };
    })
    .sort((a, b) => {
      if (a.ehProprio !== b.ehProprio) return b.ehProprio - a.ehProprio;
      if (a.intersecao !== b.intersecao) return b.intersecao - a.intersecao;
      return a.ultimoUsoMs - b.ultimoUsoMs;
    });

  return ranqueados[0]?.r ?? null;
}

export async function marcarDesignUsado(designUuid: string): Promise<void> {
  const admin = createAlineClient();
  await admin.rpc("marcar_canva_design_usado", { p_design_uuid: designUuid });
}
