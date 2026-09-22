"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { corteIaLiberadoPara } from "./gate";
import { CORTE_MAX_SEG } from "./constantes";
import { estiloValido, filtroValido, UPLOAD_MAX_SEG, type FiltroId } from "./opcoes";
import { avaliarFrase, duracaoFinal, origemValida } from "./video-curto";

/**
 * Cortes com IA: a gravação do teleprompter (até 60 s) vira um reel editado
 * sem passar por editor. Fluxo:
 *
 *  1. prepararUploadCorteAction  → URL assinada; o navegador sobe o vídeo
 *     bruto DIRETO pro bucket `videos-biblioteca` (não passa pela Vercel,
 *     que limita o corpo da requisição a poucos MB).
 *  2. criarCorteAction           → registra em `cortes_ia` e dispara o worker
 *     (.github/workflows/render-corte.yml → packages/corte-ia/pipeline.py).
 *  3. O worker transcreve, planeja com o Claude, renderiza e marca `pronto`.
 *
 * Requer GITHUB_ACTIONS_TOKEN na Vercel (mesmo do reel animado).
 */

const REPO = "clinicanutrisecrets-lang/marketingprofissional";
const BUCKET_ORIGEM = "videos-biblioteca";
const MAX_BYTES = 100 * 1024 * 1024; // teto do bucket videos-biblioteca

type Franqueada = { id: string; email: string; instagram_handle: string | null };

async function franqueadaLiberada(): Promise<Franqueada | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("franqueadas")
    .select("id, email, instagram_handle")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const f = data as Franqueada | null;
  if (!f || !corteIaLiberadoPara(f.email)) return null;
  return f;
}

export async function prepararUploadCorteAction(params: {
  mime: string;
  tamanhoBytes: number;
}): Promise<{ ok: true; path: string; token: string } | { ok: false; msg: string }> {
  const f = await franqueadaLiberada();
  if (!f) return { ok: false, msg: "recurso não liberado pra esta conta" };
  if (params.tamanhoBytes > MAX_BYTES) {
    return {
      ok: false,
      msg: "vídeo muito grande (máx. 100 MB). Grave num tempo menor, ou mande o arquivo em qualidade mais baixa.",
    };
  }
  const ext = params.mime.includes("mp4")
    ? "mp4"
    : params.mime.includes("quicktime")
      ? "mov"
      : "webm";
  const path = `${f.id}/cortes/${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET_ORIGEM).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, msg: `falha ao preparar upload: ${error?.message ?? "?"}` };
  return { ok: true, path: data.path, token: data.token };
}

export async function criarCorteAction(params: {
  path: string;
  mime: string;
  duracaoSeg: number;
  tema: string;
  sugestaoId?: string;
  filtro?: string;
  estiloLegenda?: string;
  origemTipo?: "teleprompter" | "upload";
}): Promise<{ ok: boolean; msg: string; id?: string }> {
  const f = await franqueadaLiberada();
  if (!f) return { ok: false, msg: "recurso não liberado pra esta conta" };
  if (!params.path.startsWith(`${f.id}/cortes/`)) return { ok: false, msg: "caminho inválido" };

  // 🔴 O teto vem de quem MANDOU, não do corpo da requisição: o arquivo do
  // celular pode ser mais longo que a gravação do teleprompter, e aceitar o
  // que o cliente disser abriria a porta pra um vídeo de meia hora no worker.
  const origem = params.origemTipo === "upload" ? "upload" : "teleprompter";
  const tetoSeg = origem === "upload" ? UPLOAD_MAX_SEG : CORTE_MAX_SEG;
  if (params.duracaoSeg > tetoSeg + 2) {
    const min = Math.floor(tetoSeg / 60);
    return {
      ok: false,
      msg: `este vídeo tem ${Math.round(params.duracaoSeg)}s e o limite aqui é ${
        min >= 1 ? `${min} minuto${min > 1 ? "s" : ""}` : `${tetoSeg}s`
      }. Corte o trecho que você quer antes de mandar.`,
    };
  }
  const filtro = filtroValido(params.filtro);
  const estilo = estiloValido(params.estiloLegenda);

  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return { ok: false, msg: "Worker de vídeo ainda não configurado (falta GITHUB_ACTIONS_TOKEN na Vercel)." };
  }

  const admin = createAdminClient();
  const { data: row, error: insErr } = await admin
    .from("cortes_ia")
    .insert({
      franqueada_id: f.id,
      sugestao_id: params.sugestaoId || null,
      tema: params.tema.trim() || "Gravação livre",
      origem_path: params.path,
      origem_mime: params.mime,
      duracao_seg: Math.min(params.duracaoSeg, tetoSeg + 2),
      filtro,
      estilo_legenda: estilo,
      origem_tipo: origem,
    } as never)
    .select("id")
    .single();
  if (insErr || !row) return { ok: false, msg: `falha ao registrar o corte: ${insErr?.message ?? "?"}` };
  const corteId = (row as { id: string }).id;

  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/render-corte.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
        inputs: {
          corte_id: corteId,
          // biblioteca de b-roll compartilhada (coringas), além da própria
          broll_franqueada_id: process.env.CORTE_BROLL_FRANQUEADA_ID ?? "",
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
          anthropic_key: process.env.ANTHROPIC_API_KEY ?? "",
          // sem a chave o corte sai só com o rosto, como antes
          pexels_key: process.env.PEXELS_API_KEY ?? "",
          // decide se o worker instala o motor de filtro (centenas de MB)
          filtro,
        },
      }),
    },
  );

  if (!resp.ok) {
    const corpo = await resp.text();
    await admin
      .from("cortes_ia")
      .update({ status: "erro", erro_msg: `dispatch ${resp.status}: ${corpo.slice(0, 200)}` } as never)
      .eq("id", corteId);
    return { ok: false, msg: `falha ao disparar o worker (${resp.status})` };
  }

  revalidatePath("/dashboard/videos");
  return {
    ok: true,
    id: corteId,
    msg: filtro === "nenhum"
      ? "Vídeo enviado! A edição fica pronta em uns 3 a 5 minutos na aba Vídeos."
      : "Vídeo enviado! Com filtro a edição demora mais: acompanhe na aba Vídeos.",
  };
}

export type LimpezaCorte = {
  removidos?: { inicio: number; fim: number; motivo: string }[];
  seg_removidos?: number;
  dur_original?: number;
  dur_final?: number;
  aviso?: string | null;
  aviso_filtro?: string | null;
};

export type CorteIa = {
  id: string;
  tema: string;
  status: "enviado" | "processando" | "pronto" | "erro";
  etapa: string | null;
  erro_msg: string | null;
  url: string | null;
  duracao_seg: number | null;
  criado_em: string;
  filtro: FiltroId | null;
  estilo_legenda: string | null;
  origem_tipo: string | null;
  limpeza: LimpezaCorte | null;
};

export async function listarCortesAction(): Promise<CorteIa[]> {
  const f = await franqueadaLiberada();
  if (!f) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("cortes_ia")
    .select(
      "id, tema, status, etapa, erro_msg, url, duracao_seg, criado_em, filtro, estilo_legenda, origem_tipo, limpeza",
    )
    .eq("franqueada_id", f.id)
    .order("criado_em", { ascending: false })
    .limit(12);
  return (data ?? []) as CorteIa[];
}

/**
 * Apaga uma gravação da lista.
 *
 * Pedido da Aline (22/09/2026): "tem que ter botão para apagar os vídeos ou
 * coisas ali que deram um erro, que não queira deixar visível". Sem isso a
 * tentativa que falhou fica pra sempre no meio das que deram certo, e a nutri
 * não tem como limpar.
 *
 * 🔴 Só a DONA apaga (o `.eq("franqueada_id")` é o que garante), e só o que
 * já terminou: apagar uma gravação `enviado`/`processando` deixaria o worker
 * escrevendo numa linha que não existe mais, e a nutri sem o vídeo que ainda
 * ia ficar pronto. Nesses dois casos a resposta diz o que esperar.
 */
export async function excluirCorteAction(
  corteId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const f = await franqueadaLiberada();
  if (!f) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { data: corte } = await supabase
    .from("cortes_ia")
    .select("id, status, criado_em")
    .eq("id", corteId)
    .eq("franqueada_id", f.id)
    .maybeSingle();

  if (!corte) return { ok: false, erro: "Gravação não encontrada." };

  const status = (corte as { status: string }).status;
  const emAndamento = status === "enviado" || status === "processando";
  if (emAndamento) {
    // Passou MUITO do prazo (o mesmo teto da tela, com filtro): aí não vem
    // mais, e travar a exclusão só deixaria lixo permanente na lista.
    const inicio = new Date((corte as { criado_em: string }).criado_em).getTime();
    const travou = Number.isFinite(inicio) && Date.now() - inicio > 95 * 60 * 1000;
    if (!travou) {
      return {
        ok: false,
        erro: "Esta gravação ainda está sendo editada. Espere ela terminar (ou dar erro) pra apagar.",
      };
    }
  }

  const { error } = await supabase
    .from("cortes_ia")
    .delete()
    .eq("id", corteId)
    .eq("franqueada_id", f.id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/videos");
  return { ok: true };
}

/**
 * Vídeo curto: clipe da biblioteca + frase escrita em cima, sem fala.
 *
 * 🔴 SÓ O ID DO CLIPE VIAJA. A URL é resolvida no worker, que confere se o
 * vídeo é da biblioteca DELA (ou do acervo compartilhado). Se a tela
 * mandasse o endereço, o worker baixaria qualquer coisa que alguém pedisse.
 * Aqui a conferência acontece de novo, antes de gastar uma rodada.
 */
export async function criarVideoCurtoAction(params: {
  clipeId: string;
  origem?: string;
  frase: string;
  segundos?: number;
  estiloLegenda?: string;
}): Promise<{ ok: boolean; msg: string; id?: string }> {
  const f = await franqueadaLiberada();
  if (!f) return { ok: false, msg: "recurso não liberado pra esta conta" };

  const avaliada = avaliarFrase(params.frase);
  if (!avaliada.ok) return { ok: false, msg: avaliada.msg };

  const origem = origemValida(params.origem);
  const admin = createAdminClient();

  // O clipe precisa existir E ser dela (ou do acervo ativo). Sem isto, um id
  // qualquer mandaria o worker rodar 3 minutos pra falhar no fim.
  const tabela = origem === "acervo" ? "acervo_videos" : "videos_franqueada";
  let consulta = admin.from(tabela).select("id, titulo, duracao_seg").eq("id", params.clipeId);
  consulta = origem === "acervo" ? consulta.eq("ativo", true) : consulta.eq("franqueada_id", f.id);
  const { data: clipe } = await consulta.maybeSingle();
  if (!clipe) return { ok: false, msg: "esse clipe não está na sua biblioteca" };
  const c = clipe as { titulo: string | null; duracao_seg: number | null };

  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return { ok: false, msg: "Worker de vídeo ainda não configurado (falta GITHUB_ACTIONS_TOKEN na Vercel)." };
  }

  const { data: row, error: insErr } = await admin
    .from("cortes_ia")
    .insert({
      franqueada_id: f.id,
      modo: "clipe_frase",
      frase: avaliada.frase,
      clipe_video_id: params.clipeId,
      clipe_origem: origem,
      // O tema é o rótulo da lista de vídeos; a frase é o conteúdo.
      tema: c.titulo?.trim() || "Vídeo curto",
      duracao_seg: duracaoFinal(params.segundos, c.duracao_seg),
      estilo_legenda: estiloValido(params.estiloLegenda),
      origem_tipo: "biblioteca",
    } as never)
    .select("id")
    .single();
  if (insErr || !row) return { ok: false, msg: `falha ao registrar o vídeo: ${insErr?.message ?? "?"}` };
  const corteId = (row as { id: string }).id;

  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/render-corte.yml/dispatches`,
    {
      method: "POST",
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
          // Vídeo curto não passa por filtro de rosto: não há rosto.
          filtro: "nenhum",
        },
      }),
    },
  );

  if (!resp.ok) {
    const corpo = await resp.text();
    await admin
      .from("cortes_ia")
      .update({ status: "erro", erro_msg: `dispatch ${resp.status}: ${corpo.slice(0, 200)}` } as never)
      .eq("id", corteId);
    return { ok: false, msg: `falha ao disparar o worker (${resp.status})` };
  }

  revalidatePath("/dashboard/videos");
  return { ok: true, id: corteId, msg: "Vídeo curto na fila! Fica pronto em 1 a 2 minutos aqui embaixo." };
}
