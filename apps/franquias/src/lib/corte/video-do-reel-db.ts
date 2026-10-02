import "server-only";

import { DUR_PADRAO, duracaoFinal } from "./video-curto";
import { escolherClipe, fraseDoReel, palavrasDoAssunto, type ClipeCandidato } from "./video-do-reel";

const REPO = "clinicanutrisecrets-lang/marketingprofissional";

/**
 * Enfileira o vídeo curto do reel da semana. Best-effort em TODO caminho: o
 * pacote da semana nunca pode falhar por causa dele, e sem ele o card segue
 * com o roteiro pro teleprompter. Vale pra TODAS as contas (Aline, 02/10):
 * o gate da edição automática (gate.ts) segue só na tela de Vídeos.
 */
export async function enfileirarVideoDoReel(
  admin: { from: (t: string) => any },
  p: {
    franqueadaId: string;
    email: string | null;
    postId: string;
    post: { headline?: unknown; roteiro?: unknown };
    assunto: string[];
  },
): Promise<{ ok: boolean; motivo: string }> {
  try {
    const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) return { ok: false, motivo: "sem GITHUB_ACTIONS_TOKEN" };
    const frase = fraseDoReel(p.post);
    if (!frase) return { ok: false, motivo: "reel sem gancho curto" };

    const cols = "id, titulo, descricao, tags, duracao_seg, largura_px, altura_px, usado_quantas_vezes";
    const [{ data: meus }, { data: acervo }] = await Promise.all([
      admin.from("videos_franqueada").select(cols).eq("franqueada_id", p.franqueadaId).eq("ativo", true).limit(200),
      admin.from("acervo_videos").select(cols).eq("ativo", true).limit(300),
    ]);
    const clipes: ClipeCandidato[] = [
      ...((meus ?? []) as ClipeCandidato[]).map((c) => ({ ...c, origem: "biblioteca" as const })),
      ...((acervo ?? []) as ClipeCandidato[]).map((c) => ({ ...c, origem: "acervo" as const })),
    ];
    const clipe = escolherClipe(clipes, palavrasDoAssunto([frase, ...p.assunto]));
    if (!clipe) return { ok: false, motivo: "biblioteca sem clipe" };

    const { data: row, error } = await admin
      .from("cortes_ia")
      .insert({
        franqueada_id: p.franqueadaId,
        post_id: p.postId,
        modo: "clipe_frase",
        frase,
        clipe_video_id: clipe.id,
        clipe_origem: clipe.origem,
        tema: "Reel da semana",
        duracao_seg: duracaoFinal(DUR_PADRAO, clipe.duracao_seg),
        estilo_legenda: "classica",
        frase_pos: 0.5,
        origem_tipo: "biblioteca",
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false, motivo: `insert: ${error?.message ?? "?"}` };
    const corteId = (row as { id: string }).id;

    const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-corte.yml/dispatches`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
        inputs: {
          corte_id: corteId,
          broll_franqueada_id: "",
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
          anthropic_key: process.env.ANTHROPIC_API_KEY ?? "",
          pexels_key: "",
          filtro: "nenhum",
        },
      }),
    });
    if (!resp.ok) {
      await admin
        .from("cortes_ia")
        .update({ status: "erro", erro_msg: `dispatch ${resp.status}` })
        .eq("id", corteId);
      return { ok: false, motivo: `dispatch ${resp.status}` };
    }
    return { ok: true, motivo: corteId };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}
