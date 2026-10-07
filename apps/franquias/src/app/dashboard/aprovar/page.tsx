import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  aprovacaoFechada,
  escolherAprovacao,
  publicacaoAutomaticaLigada,
  semanasVisiveis,
  semanasPendentesAnteriores,
  rotuloSemanaCurto,
  type AprovacaoCandidata,
} from "@/lib/aprovacao/semana";
import { validarPublico } from "@/lib/publico/publico";
import { formatarPrecoBR } from "@/lib/produtos/contexto";
import { AprovacaoView } from "./AprovacaoView";
import { TIPOS_FOTO_BANCO } from "@/lib/geracao/fotos-banco";

export const dynamic = "force-dynamic";

/** Quantas semanas atrás a nutri pode reabrir pelos chips do topo. */
const SEMANAS_NO_HISTORICO = 8;

export default async function AprovarPage({
  searchParams,
}: {
  searchParams?: { semana?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select(
      "id, nome_comercial, aprovacao_modo, instagram_conta_id, instagram_access_token, instagram_token_expiry, publer_profile_id, palavras_evitar, publico_briefing",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  const f = franqueada as Record<string, unknown>;

  // 🔴 Busca TODOS os status, não só os pendentes: a semana que a nutri já
  // aprovou também mora aqui (ver lib/aprovacao/semana.ts). Antes o filtro era
  // `.in('status', ['aguardando','aprovada_com_edicoes'])` e aprovar fazia a
  // semana desaparecer do app inteiro.
  const { data: aprovacoes, error: errAprov } = await supabase
    .from("aprovacoes_semanais")
    .select("id, semana_ref, status, deadline, aprovada_em, estrategia")
    .eq("franqueada_id", f.id as string)
    .order("semana_ref", { ascending: false })
    .limit(SEMANAS_NO_HISTORICO);

  const linhas = (aprovacoes ?? []) as Array<Record<string, unknown>>;

  // Contagem de posts POR APROVAÇÃO, numa consulta. A coluna `total_posts` não
  // serve: ela fica em 0 em quase toda linha (medido 13/09/2026), e é por ela
  // que uma aprovação sem post nenhum passava por semana de verdade.
  let porAprovacao = new Map<string, number>();
  if (linhas.length > 0) {
    const { data: postsIds } = await supabase
      .from("posts_agendados")
      .select("id, aprovacao_semanal_id")
      .eq("franqueada_id", f.id as string)
      .in(
        "aprovacao_semanal_id",
        linhas.map((l) => l.id as string),
      );
    for (const p of (postsIds ?? []) as Array<{ aprovacao_semanal_id: string | null }>) {
      const k = p.aprovacao_semanal_id;
      if (k) porAprovacao.set(k, (porAprovacao.get(k) ?? 0) + 1);
    }
  }

  const candidatas: Array<AprovacaoCandidata & Record<string, unknown>> = linhas.map((l) => ({
    ...l,
    id: l.id as string,
    semana_ref: l.semana_ref as string,
    status: (l.status as string) ?? null,
    posts: porAprovacao.get(l.id as string) ?? 0,
  }));

  const escolhida = escolherAprovacao(candidatas, searchParams?.semana ?? null);
  const historico = semanasVisiveis(candidatas).map((c) => ({
    id: c.id,
    semana_ref: c.semana_ref,
    status: c.status,
    posts: c.posts,
    fechada: aprovacaoFechada(c.status),
  }));

  const pendentesAntigas = semanasPendentesAnteriores(candidatas, escolhida);

  let posts: Array<Record<string, unknown>> = [];
  if (escolhida) {
    const { data: postsData } = await supabase
      .from("posts_agendados")
      .select("*")
      .eq("aprovacao_semanal_id", escolhida.id)
      .order("data_hora_agendada", { ascending: true });
    posts = (postsData ?? []) as Array<Record<string, unknown>>;
  }

  // Contexto do revisor de copy: o que ela declarou não atender, as palavras
  // que ela vetou e os preços REAIS. Sem o catálogo carregado o revisor não
  // acusa preço nenhum, de propósito: falta de informação não é prova de
  // invenção.
  const { data: produtosReais } = await supabase
    .from("produtos_scanner")
    .select("preco_centavos")
    .eq("franqueada_id", f.id as string)
    .eq("ativo", true);

  // Aviso do banco de fotos: sem foto, a arte da semana sai só tipográfica.
  // Erro de leitura não mostra o aviso (nunca afirmar "você não tem fotos"
  // sem ter conseguido olhar).
  const { count: totalFotos, error: errFotos } = await supabase
    .from("arquivos_franqueada")
    .select("id", { count: "exact", head: true })
    .eq("franqueada_id", f.id as string)
    .in("tipo", [...TIPOS_FOTO_BANCO]);
  const semFotos = !errFotos && (totalFotos ?? 0) === 0;

  const publico = validarPublico(f.publico_briefing);
  const revisao = {
    nao_atende: publico?.nao_atende ?? null,
    palavras_evitar: (f.palavras_evitar as string | null) ?? null,
    precos_reais: produtosReais
      ? (produtosReais as Array<{ preco_centavos: number | null }>)
          .map((p) => formatarPrecoBR(p.preco_centavos))
          .filter((v): v is string => !!v)
      : undefined,
  };

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Aprovação semanal</h1>
          <p className="text-sm text-brand-text/60">
            Revise os posts da semana, aprove quando estiver do seu gosto e baixe
            tudo aqui pra postar no seu Instagram.
          </p>
        </header>

        {errAprov && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Erro ao carregar as suas semanas. Recarregue a página: nenhum post
            foi perdido.
          </div>
        )}

        {pendentesAntigas.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p>
              <strong>
                Você ainda tem {pendentesAntigas.length === 1 ? "1 semana passada pendente" : `${pendentesAntigas.length} semanas passadas pendentes`} de aprovação.
              </strong>{" "}
              Se quiser usar esses posts, abra a semana e aprove. Elas foram montadas antes das mudanças de estilo, então a arte pode estar no modelo antigo.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendentesAntigas.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/aprovar?semana=${s.id}`}
                  className="rounded-full border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Semana de {rotuloSemanaCurto(s.semana_ref)} ({s.posts} posts)
                </Link>
              ))}
            </div>
          </div>
        )}

        {semFotos && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-primary/20 bg-white p-4">
            <p className="text-sm text-brand-text">
              <strong>Suba fotos suas e dos seus pratos para os posts ganharem vida.</strong>{" "}
              O pacote da semana usa uma delas na capa do carrossel e no post de feed.
            </p>
            <Link
              href="/dashboard/fotos"
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Subir minhas fotos
            </Link>
          </div>
        )}

        <AprovacaoView
          franqueadaId={f.id as string}
          aprovacao={escolhida as Record<string, unknown> | null}
          posts={posts}
          fechada={aprovacaoFechada(escolhida?.status)}
          historico={historico}
          revisao={revisao}
          publicacaoAutomatica={publicacaoAutomaticaLigada({
            instagram_conta_id: f.instagram_conta_id as string | null,
            instagram_access_token: f.instagram_access_token as string | null,
            instagram_token_expiry: f.instagram_token_expiry as string | null,
            publer_profile_id: f.publer_profile_id as string | null,
          })}
        />
      </div>
    </main>
  );
}
