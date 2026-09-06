"use server";

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Acervo de b-roll compartilhado (public.acervo_videos): clipes coringa que
 * servem pros dois produtos (Scanner Franquias e Studio Aline) e pro worker
 * de corte com IA. Curado por admin, só leitura pra franqueada.
 *
 * A biblioteca particular dela continua tendo prioridade — o acervo é o fundo
 * de catálogo, pra quem ainda não subiu nada.
 */

export type VideoAcervo = {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  thumbnail_url: string | null;
  duracao_seg: number | null;
  tags: string[] | null;
  fonte: string | null;
};

export async function listarAcervo(limite = 60): Promise<VideoAcervo[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("acervo_videos")
    .select("id, titulo, descricao, url, thumbnail_url, duracao_seg, tags, fonte")
    .eq("ativo", true)
    .order("criado_em", { ascending: false })
    .limit(limite);
  return (data ?? []) as VideoAcervo[];
}
