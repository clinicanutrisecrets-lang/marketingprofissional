import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import type { DadosRaioX, PostAnalisado } from "@/lib/automacao/raio-x-publico";
import { GerarRaioX } from "./GerarRaioX";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type PageProps = { params: Promise<{ slug: string }> };

export default async function PublicoPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfilData } = await aline.from("perfis").select("id, slug, instagram_handle, cor_primaria").eq("slug", slug).maybeSingle();
  if (!perfilData) notFound();
  const perfil = perfilData as { id: string; slug: string; instagram_handle: string; cor_primaria: string | null };
  const cor = perfil.cor_primaria || "#0BB8A8";

  const { data: analiseData, error } = await aline
    .from("ig_analises")
    .select("id, dados, relatorio, avisos, criado_em")
    .eq("perfil_id", perfil.id)
    .eq("tipo", "publico")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const analise = analiseData as { id: string; dados: DadosRaioX; relatorio: string | null; avisos: string[]; criado_em: string } | null;

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <Link href={`/perfis/${slug}`} className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner">← @{perfil.instagram_handle}</Link>
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-aline-text">Raio-X do público</h1>
          <p className="mb-4 text-sm text-aline-text/60">O que engaja, o que o público precisa e ideias de posts, a partir do que a conta já publicou.</p>
          <GerarRaioX slug={slug} cor={cor} />
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">Erro ao carregar, recarregue a página: {error.message}</p>}
        </header>

        {!analise ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-aline-text/60 shadow-sm">Nenhum raio-x ainda. Clique em "Gerar raio-x agora".</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-aline-text/50">Gerado em {quando(analise.criado_em)} · {analise.dados.posts.length} posts · {analise.dados.comentarios_lidos} comentários · {analise.dados.conversas_lidas} conversas do direct</p>
            {analise.avisos.length > 0 && (
              <ul className="mb-4 space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{analise.avisos.map((a, i) => <li key={i}>⚠ {a}</li>)}</ul>
            )}

            <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Média por formato</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-aline-text/60"><th className="py-1 pr-3">Formato</th><th className="py-1 pr-3">Posts</th><th className="py-1 pr-3">Curtidas</th><th className="py-1 pr-3">Comentários</th><th className="py-1 pr-3">Salvamentos</th><th className="py-1 pr-3">Visualizações</th></tr></thead>
                  <tbody>
                    {analise.dados.por_formato.map((f) => (
                      <tr key={f.formato} className="border-t border-aline-text/5"><td className="py-1 pr-3 font-medium">{f.formato}</td><td className="py-1 pr-3">{f.posts}</td><td className="py-1 pr-3">{f.media_curtidas}</td><td className="py-1 pr-3">{f.media_comentarios}</td><td className="py-1 pr-3">{f.media_salvamentos ?? "não veio"}</td><td className="py-1 pr-3">{f.media_visualizacoes ?? "não veio"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-6 grid gap-6 md:grid-cols-2">
              <Top titulo="Mais curtidos" posts={analise.dados.posts} chave="curtidas" />
              <Top titulo="Mais comentados" posts={analise.dados.posts} chave="comentarios" />
              {analise.dados.insights_disponiveis && <Top titulo="Mais salvos" posts={analise.dados.posts} chave="salvamentos" />}
              {analise.dados.insights_disponiveis && <Top titulo="Mais compartilhados" posts={analise.dados.posts} chave="compartilhamentos" />}
              {analise.dados.insights_disponiveis && <Top titulo="Mais vistos" posts={analise.dados.posts} chave="visualizacoes" />}
              {analise.dados.insights_disponiveis && <Top titulo="Maior alcance" posts={analise.dados.posts} chave="alcance" />}
            </section>

            <section className="mb-6 grid gap-6 md:grid-cols-2">
              <Temas titulo={`Temas dos comentários (${analise.dados.comentarios_lidos})`} temas={analise.dados.temas_comentarios} />
              <Temas titulo={`Temas do direct (${analise.dados.conversas_lidas} conversas)`} temas={analise.dados.temas_dm} />
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Leitura e ideias de posts</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{analise.relatorio ?? "(sem relatório)"}</div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Top({ titulo, posts, chave }: { titulo: string; posts: PostAnalisado[]; chave: keyof PostAnalisado }) {
  const lista = posts.filter((p) => typeof p[chave] === "number").sort((a, b) => (b[chave] as number) - (a[chave] as number)).slice(0, 8);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-aline-text/60">{titulo}</h3>
      {lista.length === 0 ? <p className="text-xs text-aline-text/50">Métrica não veio.</p> : (
        <ol className="space-y-1 text-sm">
          {lista.map((p) => (
            <li key={p.id} className="flex gap-2">
              <span className="w-12 shrink-0 text-right font-semibold">{p[chave] as number}</span>
              <span className="text-aline-text/80">
                <span className="mr-1 rounded bg-aline-muted px-1 text-xs">{p.formato}</span>
                {p.permalink ? <a href={p.permalink} target="_blank" rel="noreferrer" className="hover:underline">{p.legenda || "(sem legenda)"}</a> : p.legenda}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Temas({ titulo, temas }: { titulo: string; temas: Array<{ tema: string; quantidade: number; exemplos: string[] }> }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-aline-text/60">{titulo}</h3>
      {temas.length === 0 ? <p className="text-xs text-aline-text/50">Nada lido.</p> : (
        <ul className="space-y-2 text-sm">
          {temas.map((t) => (
            <li key={t.tema}>
              <strong>{t.tema}</strong> <span className="text-aline-text/60">· {t.quantidade}</span>
              {t.exemplos.length > 0 && <div className="text-xs text-aline-text/60">{t.exemplos.map((e) => `"${e}"`).join(" · ")}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
