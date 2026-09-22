import { avisoConteudoPronto, type AvisoConteudoPronto } from "./aviso-pronto.ts";
import { escolherAprovacao, type AprovacaoCandidata } from "../aprovacao/semana.ts";
import type { createClient } from "../supabase/server.ts";

/**
 * A leitura do banco por trás do aviso "seus conteúdos ficaram prontos".
 *
 * 🔴 ISTO EXISTE EM UM LUGAR SÓ DE PROPÓSITO. O aviso aparece em DUAS telas
 * (Aline, 22/09/2026): no painel do Marketing e, desde hoje, no dashboard do
 * SCANNER — *"a pessoa que está no consultório de precisão entra no scanner
 * todo dia, mas ir lá na aba posts e conteúdos pra entrar no marketing, ela
 * não vai lembrar"*. Duas consultas escritas em dois lugares divergiriam
 * caladas, e o sintoma seria o pior possível: o Scanner dizendo "ficou
 * pronto" numa semana que ela já aprovou, ou ficando mudo numa semana que
 * está esperando. A régua de QUANDO avisar é pura (aviso-pronto.ts); a
 * leitura é esta; quem mostra só desenha.
 *
 * Serve tanto o client de sessão (painel) quanto o admin (a rota que o
 * Scanner chama) — os dois têm o mesmo tipo.
 *
 * Fail-safe: qualquer falha devolve `null`. Nenhuma tela pode quebrar por
 * causa de um aviso, e um aviso a menos é melhor que uma tela de erro.
 */
export async function montarAvisoPronto(
  supabase: ReturnType<typeof createClient>,
  franqueadaId: string,
): Promise<AvisoConteudoPronto | null> {
  try {
    const { data: aprovacoes } = await supabase
      .from("aprovacoes_semanais")
      .select("id, semana_ref, status")
      .eq("franqueada_id", franqueadaId)
      .order("semana_ref", { ascending: false })
      .limit(4);
    const linhas = (aprovacoes ?? []) as Array<{ id: string; semana_ref: string; status: string | null }>;
    if (!linhas.length) return null;

    // 🔴 A contagem sai de posts_agendados, NUNCA da coluna total_posts (que
    // fica em 0 em quase toda linha). Semana sem post é carcaça de geração
    // que falhou, e avisar ali manda a nutri pra uma tela vazia.
    const { data: postsIds } = await supabase
      .from("posts_agendados")
      .select("id, aprovacao_semanal_id")
      .eq("franqueada_id", franqueadaId)
      .in("aprovacao_semanal_id", linhas.map((l) => l.id));
    const porAprovacao = new Map<string, number>();
    for (const p of (postsIds ?? []) as Array<{ aprovacao_semanal_id: string | null }>) {
      if (p.aprovacao_semanal_id) {
        porAprovacao.set(p.aprovacao_semanal_id, (porAprovacao.get(p.aprovacao_semanal_id) ?? 0) + 1);
      }
    }
    const candidatas: AprovacaoCandidata[] = linhas.map((l) => ({
      id: l.id,
      semana_ref: l.semana_ref,
      status: l.status,
      posts: porAprovacao.get(l.id) ?? 0,
    }));

    // A MESMA escolha da tela "Aprovar semana" — o aviso não pode apontar
    // pra uma semana diferente da que o botão abre.
    const escolhida = escolherAprovacao(candidatas, null);

    const { data: pedidos } = await supabase
      .from("briefings_franqueada")
      .select("tema, semana_alvo")
      .eq("franqueada_id", franqueadaId)
      .eq("status", "usado")
      .order("usado_em", { ascending: false })
      .limit(10);

    return avisoConteudoPronto({
      aprovacao: escolhida,
      pedidosAtendidos: ((pedidos ?? []) as Array<{ tema: string | null; semana_alvo: string | null }>).map(
        (p) => ({ tema: p.tema ?? "", semana: p.semana_alvo ?? null }),
      ),
    });
  } catch {
    return null;
  }
}
