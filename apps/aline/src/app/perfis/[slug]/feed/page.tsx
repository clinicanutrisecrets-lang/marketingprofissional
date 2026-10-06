import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import {
  agruparPorMes, dataCurta, dataDoPost, ehAcervoAntigo, ehDeGrade,
  ordenarParaFeed, rotuloTipo, seloDoStatus, tituloDoPost, type PostFeed,
} from "@/lib/feed/plano";
import { CORTE_ACERVO_ANTIGO } from "@/lib/feed/actions";
import { LimparAcervoButton } from "./LimparAcervoButton";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

const COLS_POST =
  "id, tipo, status, semana_ref, data_hora_agendada, data_hora_postada, pilar, angulo, copy_legenda, criado_em";

export default async function FeedPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfilData } = await aline
    .from("perfis").select("id, slug, nome, cor_primaria, instagram_handle").eq("slug", slug).maybeSingle();
  if (!perfilData) notFound();
  const perfil = perfilData as { id: string; slug: string; nome: string; cor_primaria?: string; instagram_handle?: string };
  const cor = perfil.cor_primaria || "#0BB8A8";

  const { data: postsData, error: erroPosts } = await aline
    .from("posts").select(COLS_POST).eq("perfil_id", perfil.id);

  // 🔴 Erro de leitura não pode virar "você não tem nada planejado": a Aline
  // leria isso como perda de dado. Diz o que houve e oferece recarregar.
  if (erroPosts) {
    return (
      <Moldura perfil={perfil} cor={cor}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-medium text-rose-900">Não deu pra carregar o planejamento.</p>
          <p className="mt-1 text-sm text-rose-800">Recarregue a página. Se insistir, me chame.</p>
        </div>
      </Moldura>
    );
  }

  const todos = (postsData ?? []) as PostFeed[];

  const midiaPorPost = new Map<string, string>();
  if (todos.length > 0) {
    const { data: midias } = await aline
      .from("post_midias").select("post_id, url, ordem, tipo").in("post_id", todos.map((p) => p.id));
    for (const m of ((midias ?? []) as Array<{ post_id: string; url: string; ordem: number; tipo: string }>)
      .sort((a, b) => a.ordem - b.ordem)) {
      if (!midiaPorPost.has(m.post_id) && m.tipo !== "video") midiaPorPost.set(m.post_id, m.url);
    }
  }
  const comMidia = todos.map((p) => ({ ...p, midia_url: midiaPorPost.get(p.id) ?? null }));

  const antigos = comMidia.filter((p) => ehAcervoAntigo(p, CORTE_ACERVO_ANTIGO));
  const vivos = comMidia.filter((p) => !ehAcervoAntigo(p, CORTE_ACERVO_ANTIGO));
  const naGrade = vivos.filter((p) => ehDeGrade(p.tipo));
  const stories = ordenarParaFeed(vivos.filter((p) => !ehDeGrade(p.tipo)));
  const meses = agruparPorMes(naGrade);

  return (
    <Moldura perfil={perfil} cor={cor}>
      <div className="space-y-6">
        <LimparAcervoButton perfilId={perfil.id} quantos={antigos.length} />

        {naGrade.length === 0 && stories.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-700">Nada planejado ainda.</p>
            <p className="mt-1 text-sm text-slate-500">
              O pacote da semana nasce no domingo. Pra montar agora, vá em Aprovar semana.
            </p>
            <Link href="/aprovacao" className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: cor }}>
              Montar o pacote da semana
            </Link>
          </div>
        ) : null}

        {meses.map((mes) => (
          <section key={mes.chave}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {mes.rotulo} <span className="font-normal normal-case tracking-normal">· {mes.posts.length} na grade</span>
            </h2>
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {mes.posts.map((p) => {
                const selo = seloDoStatus(p.status);
                return (
                  <article key={p.id} className="group relative aspect-[4/5] overflow-hidden rounded-md bg-slate-100">
                    {p.midia_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.midia_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-2">
                        <span className="text-center text-[10px] leading-tight text-slate-500">
                          {rotuloTipo(p.tipo)}
                          <br />
                          <span className="text-slate-400">sem arte ainda</span>
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${selo.classe}`}>{selo.texto}</span>
                      <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{rotuloTipo(p.tipo)}</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
                      <p className="text-[11px] font-medium leading-snug text-white line-clamp-2">{tituloDoPost(p)}</p>
                      <p className="mt-0.5 text-[10px] text-white/75">
                        {dataCurta(dataDoPost(p))}
                        {p.pilar ? ` · ${p.pilar}` : ""}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {stories.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">Stories</h2>
            <p className="mb-3 text-xs text-slate-500">Não entram na grade do perfil, por isso ficam aqui.</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stories.map((p) => (
                <div key={p.id} className="w-28 flex-none">
                  <div className="aspect-[9/16] overflow-hidden rounded-lg bg-slate-100 ring-2 ring-offset-2" style={{ "--tw-ring-color": cor } as React.CSSProperties}>
                    {p.midia_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.midia_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400">sem arte</div>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-tight text-slate-600 line-clamp-2">{tituloDoPost(p, 40)}</p>
                  <p className="text-[10px] text-slate-400">{dataCurta(dataDoPost(p))}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Moldura>
  );
}

function Moldura({
  perfil, cor, children,
}: { perfil: { slug: string; nome: string; instagram_handle?: string }; cor: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link href={`/perfis/${perfil.slug}`} className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner">
          ← Voltar
        </Link>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-aline-text">Planejamento do feed</h1>
          <p className="mt-1 text-sm text-slate-500">
            {perfil.nome}
            {perfil.instagram_handle ? ` · @${perfil.instagram_handle}` : ""} · como o perfil vai ficar, do mais novo pro mais antigo
          </p>
          <div className="mt-3 h-1 w-16 rounded" style={{ background: cor }} />
        </header>
        {children}
      </div>
    </main>
  );
}
