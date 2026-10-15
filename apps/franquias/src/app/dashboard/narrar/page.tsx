import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VIDEOS_METODOLOGIA } from "@/lib/videos/metodologia";
import { VIDEOS_MARCA } from "@/lib/videos/marca";
import { pathVideoMarcaPronto } from "@/lib/videos/marca-servidor";
import { trechosDoReel, type Trecho } from "@/lib/narracao/roteiro";
import { listarNarracoesAction, type OrigemNarracao } from "@/lib/narracao/actions";
import { GravadorNarracao } from "./GravadorNarracao";

export const dynamic = "force-dynamic";

/**
 * Gravar a própria voz por cima do vídeo, lendo o roteiro em karaokê
 * (Aline, 13/10/2026). Serve o vídeo animado (o texto sai das cenas que o
 * desenharam) e os vídeos da metodologia que vêm sem voz.
 */
export default async function NarrarPage({
  searchParams,
}: {
  searchParams: { origem?: string; ref?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: f } = await supabase.from("franqueadas").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!f) redirect("/onboarding");

  const origem: OrigemNarracao =
    searchParams.origem === "metodologia" ? "metodologia" : searchParams.origem === "marca" ? "marca" : "reel";
  const ref = (searchParams.ref ?? "").slice(0, 80);

  let titulo = "";
  let videoUrl: string | null = null;
  let trechos: Trecho[] = [];
  let aviso: string | null = null;

  if (origem === "metodologia") {
    const v = VIDEOS_METODOLOGIA.find((x) => x.id === ref);
    if (v) {
      titulo = v.titulo;
      videoUrl = v.arquivo;
      trechos = v.roteiro.map((t) => ({ de: t.de, ate: t.ate, texto: t.texto }));
    }
  } else if (origem === "marca") {
    const v = VIDEOS_MARCA.find((x) => x.id === ref);
    if (v) {
      titulo = v.titulo;
      const pronto = await pathVideoMarcaPronto((f as { id: string }).id, v.id);
      videoUrl = pronto?.url ?? null;
      if (!pronto) aviso = "O seu vídeo ainda está sendo montado. Volte em alguns minutos.";
      trechos = v.roteiro.map((t) => ({ de: t.de, ate: t.ate, texto: t.texto }));
    }
  } else if (ref) {
    const { data, error } = await supabase
      .from("reels_animados")
      .select("id, tema, status, url, spec")
      .eq("id", ref)
      .eq("franqueada_id", (f as { id: string }).id)
      .maybeSingle();
    if (error) aviso = "Não consegui carregar o vídeo. Recarregue a página.";
    const r = data as { tema: string; status: string; url: string | null; spec: unknown } | null;
    if (r) {
      titulo = r.tema;
      videoUrl = r.status === "pronto" ? r.url : null;
      trechos = trechosDoReel(r.spec);
      if (!trechos.length) {
        aviso =
          "Este vídeo foi feito antes de o Scanner guardar o roteiro, então o texto não aparece aqui. Dá pra gravar olhando o vídeo; os próximos vídeos animados já vêm com o texto.";
      }
    }
  }

  const narracoes = videoUrl ? await listarNarracoesAction(origem, ref) : [];

  return (
    <main className="mx-auto max-w-5xl py-6 lg:py-10 lg:pl-6">
      <Link href="/dashboard/videos" className="text-sm text-brand-primary hover:underline">
        ← Vídeos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-text">🎙️ Gravar narração</h1>
      {!videoUrl ? (
        <p className="mt-4 rounded-xl bg-white p-6 text-sm text-brand-text/70 shadow-sm">
          {aviso ?? "Vídeo não encontrado ou ainda não ficou pronto."}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-brand-text/60">
            {titulo}. O texto acende no ritmo do vídeo: leia junto e a sua voz entra no lugar certo.
          </p>
          <GravadorNarracao
            origem={origem}
            refId={ref}
            videoUrl={videoUrl}
            trechos={trechos}
            aviso={aviso}
            narracoes={narracoes}
          />
        </>
      )}
    </main>
  );
}
