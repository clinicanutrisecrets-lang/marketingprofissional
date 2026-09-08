import { NextResponse } from "next/server";
import { createAlineClient } from "@/lib/supabase/server";
import { publicarPost } from "@/lib/instagram/publisher";
import { lerConfig } from "@/lib/automacao/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * CRON: a cada 15 min, publica posts (status='aprovado' OU 'agendado')
 * cuja data_hora_agendada ja chegou.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Nao autorizado" }, { status: 401 });
  }

  const aline = createAlineClient();
  const agora = new Date().toISOString();

  // Chave-geral por perfil (aline.perfis.automacao_config.publicar_posts).
  // DESLIGADA por padrão: o Estúdio tem posts antigos e desconfigurados, e
  // aprovar um por engano não pode virar publicação no Instagram real.
  const { data: perfis } = await aline.from("perfis").select("id, slug, automacao_config");
  const liberados = new Set(
    ((perfis ?? []) as Array<{ id: string; automacao_config: unknown }>)
      .filter((p) => lerConfig(p.automacao_config).publicar_posts)
      .map((p) => p.id),
  );
  if (liberados.size === 0) {
    return NextResponse.json({ ok: true, publicados: 0, motivo: "publicação automática desligada em todos os perfis" });
  }

  const { data: posts } = await aline
    .from("posts")
    .select("id, perfil_id, tipo, data_hora_agendada")
    .in("status", ["aprovado", "agendado"])
    .eq("midia_pendente", false)
    .in("perfil_id", Array.from(liberados))
    .lte("data_hora_agendada", agora)
    .order("data_hora_agendada", { ascending: true })
    .limit(10);

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, publicados: 0 });
  }

  const resultados: Array<{
    postId: string;
    ok: boolean;
    erro?: string;
    instagramPostId?: string;
  }> = [];

  for (const p of posts as Array<{ id: string }>) {
    const r = await publicarPost(p.id);
    resultados.push({
      postId: p.id,
      ok: r.ok,
      erro: r.erro,
      instagramPostId: r.instagramPostId,
    });
  }

  const sucesso = resultados.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    total: posts.length,
    publicados: sucesso,
    falhas: posts.length - sucesso,
    detalhes: resultados,
  });
}
