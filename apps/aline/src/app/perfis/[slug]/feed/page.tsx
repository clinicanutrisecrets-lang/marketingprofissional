import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import {
  agruparPorMes, CORTE_ACERVO_ANTIGO, dataCurta, dataDoPost, ehAcervoAntigo,
  ehDeGrade, ordenarParaFeed, rotuloTipo, seloDoStatus, tituloDoPost, type PostFeed,
} from "@/lib/feed/plano";
import { PostCard, type MidiaCard, type PostCardDados } from "./PostCard";
import { LimparAcervoButton } from "./LimparAcervoButton";
import { MontarArtesQueFaltam } from "./MontarArteButton";
import { TemaEmAltaForm } from "./TemaEmAltaForm";
import { EmAltaRadar, type TemaRadar } from "./EmAltaRadar";
import { dataPadraoAmanha } from "@/lib/arte-post/tema-em-alta";
import { precisaArteNova } from "@/lib/arte-post/molde";

export const dynamic = "force-dynamic";
// Montar a arte de um post leva perto de um minuto (curadoria + texto + render).
export const maxDuration = 300;

type PageProps = { params: Promise<{ slug: string }> };

const COLS_POST =
  "id, tipo, status, semana_ref, data_hora_agendada, data_hora_postada, pilar, angulo, copy_legenda, copy_cta, hashtags, criado_em";

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

  // Radar de temas em alta: o que está em aberto dos últimos 10 dias.
  const desde = new Date(Date.now() - 10 * 86400 * 1000).toISOString().slice(0, 10);
  const { data: temasData, error: erroTemas } = await aline
    .from("temas_em_alta")
    .select("id, manchete, fonte, url, fato, angulo, data_ref")
    .eq("perfil_id", perfil.id)
    .is("post_id", null)
    .is("descartado_em", null)
    .gte("data_ref", desde)
    .order("data_ref", { ascending: false })
    .order("relevancia", { ascending: false })
    .limit(8);
  if (erroTemas) console.error("[feed] radar de temas não carregou:", erroTemas.message);
  const temasRadar: TemaRadar[] = ((temasData ?? []) as Array<{ id: string; manchete: string; fonte: string | null; url: string | null; fato: string; angulo: string; data_ref: string }>)
    .map((t) => ({ id: t.id, manchete: t.manchete, fonte: t.fonte, url: t.url, fato: t.fato, angulo: t.angulo, data: t.data_ref.split("-").reverse().join("/") }));

  const midiaPorPost = new Map<string, string>();
  const videoPorPost = new Map<string, string>();
  const todasMidias = new Map<string, MidiaCard[]>();
  if (todos.length > 0) {
    const { data: midias } = await aline
      .from("post_midias").select("post_id, url, ordem, tipo").in("post_id", todos.map((p) => p.id));
    for (const m of ((midias ?? []) as Array<{ post_id: string; url: string; ordem: number; tipo: string }>)
      .sort((a, b) => a.ordem - b.ordem)) {
      if (!midiaPorPost.has(m.post_id) && m.tipo !== "video") midiaPorPost.set(m.post_id, m.url);
      if (!videoPorPost.has(m.post_id) && m.tipo === "video") videoPorPost.set(m.post_id, m.url);
      const lista = todasMidias.get(m.post_id) ?? [];
      lista.push({ url: m.url, tipo: m.tipo });
      todasMidias.set(m.post_id, lista);
    }
  }
  const comMidia = todos.map((p) => ({ ...p, midia_url: midiaPorPost.get(p.id) ?? null, video_url: videoPorPost.get(p.id) ?? null }));

  const antigos = comMidia.filter((p) => ehAcervoAntigo(p, CORTE_ACERVO_ANTIGO));
  const vivos = comMidia.filter((p) => !ehAcervoAntigo(p, CORTE_ACERVO_ANTIGO));
  const naGrade = vivos.filter((p) => ehDeGrade(p.tipo));
  const stories = ordenarParaFeed(vivos.filter((p) => !ehDeGrade(p.tipo)));
  const meses = agruparPorMes(naGrade);
  const dadosDoCard = (p: PostFeed & { copy_cta?: string | null; hashtags?: string[] | null }): PostCardDados => ({
    id: p.id,
    tipo: p.tipo,
    status: p.status,
    rotuloTipo: rotuloTipo(p.tipo),
    selo: seloDoStatus(p.status),
    titulo: tituloDoPost(p),
    data: dataCurta(dataDoPost(p)),
    pilar: p.pilar,
    legenda: p.copy_legenda,
    cta: p.copy_cta ?? null,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    midias: todasMidias.get(p.id) ?? [],
  });

  return (
    <Moldura perfil={perfil} cor={cor}>
      <div className="space-y-6">
        <LimparAcervoButton perfilId={perfil.id} quantos={antigos.length} />
        <EmAltaRadar perfilSlug={perfil.slug} temas={temasRadar} diaPadrao={dataPadraoAmanha()} />
        <TemaEmAltaForm perfilSlug={perfil.slug} diaPadrao={dataPadraoAmanha()} />
        <MontarArtesQueFaltam
          postIds={naGrade
            .filter((p) => p.tipo !== "reels" && p.status !== "postado" && p.status !== "gerando" && precisaArteNova(todasMidias.get(p.id) ?? []))
            .map((p) => p.id)}
        />
        {(naGrade.length > 0 || stories.length > 0) && (
          <p className="text-sm text-slate-500">Toque num post pra ver a arte, passar os slides e ler a legenda. Carrossel sem arte tem o botão de montar; nos reels, é ali que você desenha o vídeo.</p>
        )}

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
              {mes.posts.map((p) => (
                <PostCard key={p.id} post={dadosDoCard(p)} formato="grade" />
              ))}
            </div>
          </section>
        ))}

        {stories.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-slate-500">Stories</h2>
            <p className="mb-3 text-xs text-slate-500">Não entram na grade do perfil, por isso ficam aqui.</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stories.map((p) => (
                <PostCard key={p.id} post={dadosDoCard(p)} formato="story" />
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
