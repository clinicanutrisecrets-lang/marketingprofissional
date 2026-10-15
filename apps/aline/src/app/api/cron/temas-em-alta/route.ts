import { NextResponse } from "next/server";
import { createAlineClient } from "@/lib/supabase/server";
import { coletarTemasDoPerfil, manchetesDoMomento } from "@/lib/em-alta/coletar";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * CRON (todo dia 10:30 UTC = 7h30 de Brasília): radar de temas em alta de
 * cada perfil do Studio. As manchetes são buscadas UMA vez e cada perfil
 * escolhe pela própria leitura. Responde 500 quando nenhum perfil conseguiu,
 * pra o silêncio não esconder radar parado (foi assim que o das franqueadas
 * ficou 4 meses sem coletar).
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const aline = createAlineClient();
  const { data: perfis, error } = await aline.from("perfis").select("id, slug, publico_alvo");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const manchetes = await manchetesDoMomento();
  const detalhes: Array<{ perfil: string; novos?: number; erro?: string }> = [];
  for (const p of (perfis ?? []) as Array<{ id: string; slug: string; publico_alvo: string | null }>) {
    try {
      const r = await coletarTemasDoPerfil(p, manchetes);
      detalhes.push(r.ok ? { perfil: p.slug, novos: r.novos } : { perfil: p.slug, erro: r.erro });
      if (!r.ok) console.error("[cron/temas-em-alta]", p.slug, r.erro);
    } catch (e) {
      console.error("[cron/temas-em-alta]", p.slug, e);
      detalhes.push({ perfil: p.slug, erro: (e as Error).message });
    }
  }
  const algumOk = detalhes.some((d) => d.erro === undefined);
  return NextResponse.json({ ok: algumOk, manchetes: manchetes.length, detalhes }, { status: algumOk ? 200 : 500 });
}
