"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { createClaude } from "@/lib/claude/client";
import { gerarCarrosselEditorialEUpload } from "@/lib/ai-image/render";
import { LOGO_NUTRISECRETS_BRANCO_B64, LOGO_NUTRISECRETS_TEAL_B64 } from "./logo-nutrisecrets";
import { semTravessoesFundo } from "@/lib/texto/sem-travessoes";
import { acentuarFundo } from "@/lib/texto/acentos-visivel";
import {
  FERRAMENTA_ARTE,
  MOLDE_SETE_PASSOS,
  REGRAS_TEXTO,
  capaDoPost,
  coresDoPerfil,
  legendaEhEsqueleto,
  validarArte,
  type ArteGerada,
} from "./molde";
import {
  FERRAMENTA_PAUTA,
  MOLDE_TEMA_EM_ALTA,
  PILAR_TEMA_EM_ALTA,
  agendamentoDoDia,
  gravarTemaEmAlta,
  legendaProvisoria,
  segundaDaSemana,
  temaEmAltaDoPost,
  validarPauta,
  validarTemaDigitado,
} from "./tema-em-alta";

/**
 * "Montar a arte deste post" no feed do Studio (Aline, 12/10/2026).
 *
 * 1. Pergunta à curadoria do Scanner sobre o cruzamento do post (a MESMA do
 *    Cérebro Aline). Sem curadoria, não escreve: carrossel de gene inventado
 *    é o que o Scanner existe pra impedir.
 * 2. Post de receita: pede ao Scanner a receita Lótus com foto (a mesma do
 *    carrossel de sinergia) e a foto vira a capa.
 * 3. O modelo escreve os slides no molde dos sete passos (ferramenta com o
 *    teto de cada campo; recusa nomeando o campo e nova tentativa com o motivo).
 * 4. O motor de cards do Studio desenha (custo zero de imagem, sem avatar),
 *    nas cores do perfil, e as imagens substituem as do post.
 *
 * 🔴 Nunca publica: o post volta pra "aguardando aprovação".
 */

const MODEL = "claude-sonnet-4-5";
const TENTATIVAS = 3;

async function assertSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data: admin } = await supabase
    .from("admins").select("papel").eq("auth_user_id", user.id).maybeSingle();
  const row = admin as { papel?: string } | null;
  if (!row || row.papel !== "super_admin") throw new Error("Só super_admin pode montar arte");
}

function baseScanner(): string {
  return (process.env.SCANNER_API_URL ?? "https://scannerdasaude.com").replace(/\/$/, "");
}

async function curadoria(tema: string): Promise<{ blocos: string; total: number } | { erro: string }> {
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return { erro: "O Studio não está ligado à curadoria do Scanner (falta STUDIO_CONHECIMENTO_SECRET)." };
  const url = new URL(`${baseScanner()}/api/integrations/marketing/conhecimento`);
  url.searchParams.set("q", tema.slice(0, 500));
  url.searchParams.set("modo", "conteudo");
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { erro: `A curadoria do Scanner não respondeu (${res.status}).` };
    const j = (await res.json()) as { blocos?: string; total?: number };
    return { blocos: j.blocos ?? "", total: j.total ?? 0 };
  } catch {
    return { erro: "A curadoria do Scanner não respondeu a tempo." };
  }
}

type Receita = {
  chave: string; foto_url: string; titulo: string; ingredientes: string[];
  modo_preparo: string; compostos: string[];
};

/** A receita Lótus com foto. Falha aqui não derruba a arte: sai sem foto. */
async function receitaComFoto(texto: string, semente: string): Promise<Receita | null> {
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return null;
  const url = new URL(`${baseScanner()}/api/integrations/marketing/sinergia`);
  url.searchParams.set("texto", texto.slice(0, 400));
  url.searchParams.set("semente", semente);
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn(`[arte-post] receita do Scanner não veio (${res.status})`);
      return null;
    }
    const j = (await res.json()) as { receita?: Receita };
    return j.receita ?? null;
  } catch (e) {
    console.warn("[arte-post] receita do Scanner falhou:", (e as Error).message);
    return null;
  }
}

async function baixar(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

export async function montarArteDoPost(postId: string): Promise<{ ok: true; slides: number; comFoto: boolean } | { ok: false; erro: string }> {
  try {
    await assertSuperAdmin();
    const aline = createAlineClient();

    const { data: postData, error: postErr } = await aline
      .from("posts")
      .select("id, perfil_id, tipo, status, copy_legenda, copy_cta, hashtags, pilar, angulo, prompt_usado")
      .eq("id", postId)
      .maybeSingle();
    if (postErr || !postData) return { ok: false, erro: "Post não encontrado." };
    const post = postData as {
      id: string; perfil_id: string; tipo: string; status: string; copy_legenda: string | null;
      copy_cta: string | null; hashtags: string[] | null; pilar: string | null; angulo: string | null;
      prompt_usado: string | null;
    };
    if (post.status === "postado") return { ok: false, erro: "Este post já foi ao ar." };
    if (post.status === "gerando") return { ok: false, erro: "Este post está sendo montado." };
    if (post.tipo === "reels" || post.tipo.startsWith("stories")) {
      return { ok: false, erro: "Reel e stories têm botão próprio. Este monta carrossel e post de imagem." };
    }

    const { data: perfilData } = await aline
      .from("perfis")
      .select("id, slug, nome, cor_primaria, cor_secundaria, paleta_cores, publico_alvo, tom, instagram_username, instagram_handle")
      .eq("id", post.perfil_id)
      .maybeSingle();
    if (!perfilData) return { ok: false, erro: "Perfil não encontrado." };
    const perfil = perfilData as {
      id: string; slug: string; nome: string | null; cor_primaria: string | null; cor_secundaria: string | null;
      paleta_cores: unknown; publico_alvo: string | null; tom: string | null;
      instagram_username: string | null; instagram_handle: string | null;
    };

    const capa = capaDoPost(post.copy_legenda);
    if (!capa) return { ok: false, erro: "O post não tem capa (a primeira linha da legenda)." };
    const tema = [capa, post.angulo].filter(Boolean).join(". ");

    const cur = await curadoria(tema);
    if ("erro" in cur) return { ok: false, erro: cur.erro };
    if (cur.total === 0 || cur.blocos.trim().length < 40) {
      return { ok: false, erro: `O Scanner não tem curadoria sobre "${(post.angulo ?? capa).slice(0, 60)}". Ajuste o cruzamento do post pelo nome do gene, exame ou nutriente.` };
    }

    const temaEmAlta = post.pilar === PILAR_TEMA_EM_ALTA ? temaEmAltaDoPost(post.prompt_usado) : null;
    const ehReceita = !temaEmAlta && /receita/i.test(post.pilar ?? "");
    const receita = ehReceita ? await receitaComFoto(tema, `${post.id}`) : null;

    const publicoProfissional = perfil.slug === "scannerdasaude";
    const pedido = [
      JSON.stringify({
        capa,
        cruzamento: post.angulo,
        pilar: post.pilar,
        envio_do_calendario: temaEmAlta ? null : (post.copy_legenda ?? "").split("\n").slice(1).join(" ").slice(0, 400) || null,
        ...(temaEmAlta ? { tema_em_alta: temaEmAlta } : {}),
        publico: perfil.publico_alvo,
        tom: perfil.tom,
        assinatura: perfil.nome,
      }),
      publicoProfissional
        ? "PÚBLICO: PROFISSIONAL DA SAÚDE. Fale de colega pra colega; o gancho é a situação de consultório. O molde vale igual, com a mini solução virando o que ela faz na próxima consulta."
        : "PÚBLICO: PACIENTE. Linguagem simples; gene sempre explicado pela função na Fábrica da Saúde.",
      temaEmAlta ? MOLDE_TEMA_EM_ALTA : MOLDE_SETE_PASSOS,
      REGRAS_TEXTO,
      "CURADORIA DO SCANNER (a ÚNICA fonte permitida pra gene, marcador, faixa, alimento, quantidade e dose):",
      cur.blocos.slice(0, 14000),
      receita
        ? [
            "RECEITA DO SCANNER (a foto da capa é deste prato; descreva SÓ estes ingredientes e este preparo, sem acrescentar nada):",
            JSON.stringify({ titulo: receita.titulo, ingredientes: receita.ingredientes, modo_preparo: receita.modo_preparo, compostos: receita.compostos }),
            "Se esta receita não sustenta o tema do post, devolva receita_serve=false e escreva o carrossel sem citar a receita.",
          ].join("\n")
        : "",
    ].filter(Boolean).join("\n\n");

    const anthropic = createClaude();
    let arte: ArteGerada | null = null;
    let ultimo = "";
    for (let t = 0; t < TENTATIVAS && !arte; t++) {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4000,
        tools: [FERRAMENTA_ARTE as unknown as Anthropic.Tool],
        tool_choice: { type: "tool", name: FERRAMENTA_ARTE.name },
        messages: [{
          role: "user",
          content: ultimo ? `${pedido}\n\nA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimo}. Corrija só isso.` : pedido,
        }],
      });
      const bloco = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!bloco) {
        ultimo = msg.stop_reason === "max_tokens" ? "a resposta foi cortada" : "a ferramenta não foi usada";
        continue;
      }
      const v = validarArte(acentuarFundo(semTravessoesFundo(bloco.input)));
      if (v.ok) arte = v.arte;
      else ultimo = v.motivo;
    }
    if (!arte) {
      console.error(`[arte-post] não saiu postId=${post.id}: ${ultimo}`);
      return { ok: false, erro: `Os slides não saíram (${ultimo}). Tente de novo.` };
    }

    const usarFoto = !!receita && arte.receita_serve !== false;
    const fotoCapa = usarFoto ? await baixar(receita!.foto_url) : null;

    const handle = perfil.instagram_username || perfil.instagram_handle || perfil.slug;
    const cores = coresDoPerfil(perfil, post.pilar);
    const ehNutriSecrets = perfil.slug === "nutrisecrets";
    const resultado = await gerarCarrosselEditorialEUpload({
      perfilSlug: perfil.slug,
      slides: [
        { tipo: "capa", titulo: capa, kicker: arte.eyebrow },
        ...arte.slides.map((s) => ({ tipo: "meio" as const, titulo: s.headline, corpo: s.corpo })),
        { tipo: "fecho", titulo: arte.fecho.headline, chamada: arte.fecho.cta },
      ],
      opcoes: {
        destaqueHex: cores.corPrimariaHex,
        ...(fotoCapa ? { fotoCapa } : {}),
        ...(ehNutriSecrets
          ? {
              logoClaro: Buffer.from(LOGO_NUTRISECRETS_TEAL_B64, "base64"),
              logoEscuro: Buffer.from(LOGO_NUTRISECRETS_BRANCO_B64, "base64"),
            }
          : {}),
        assinatura: handle ? `@${handle.replace(/^@/, "")}` : perfil.nome ?? perfil.slug,
        aviso: "Conteúdo informativo. Não substitui acompanhamento médico ou nutricional.",
      },
    });

    // Troca as imagens só depois de as novas existirem: falha no render não
    // deixa o post sem nenhuma arte.
    const { error: delErr } = await aline.from("post_midias").delete().eq("post_id", post.id).neq("tipo", "video");
    if (delErr) return { ok: false, erro: `Não deu pra trocar as imagens: ${delErr.message}` };
    const { error: insErr } = await aline.from("post_midias").insert(
      resultado.urls.map((url, i) => ({ post_id: post.id, ordem: i, tipo: "imagem", url, largura_px: 1080, altura_px: 1350 })),
    );
    if (insErr) return { ok: false, erro: `As imagens saíram mas não ficaram ligadas ao post: ${insErr.message}` };

    const atualizacao: Record<string, unknown> = {
      midia_pendente: false,
      status: "aguardando_aprovacao",
      copy_cta: arte.fecho.cta,
      hashtags: arte.hashtags,
    };
    if (legendaEhEsqueleto(post.copy_legenda)) atualizacao.copy_legenda = arte.legenda;
    const { error: upErr } = await aline.from("posts").update(atualizacao).eq("id", post.id);
    if (upErr) return { ok: false, erro: `Arte pronta, mas a legenda não foi salva: ${upErr.message}` };

    revalidatePath(`/perfis/${perfil.slug}/feed`);
    return { ok: true, slides: resultado.urls.length, comFoto: !!fotoCapa };
  } catch (e) {
    console.error("[arte-post] erro", e);
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}

/**
 * "Post de tema em alta": ela escreve o assunto que está todo mundo comentando,
 * o modelo faz a capa e acha o assunto de saúde que liga ao Scanner, o post
 * nasce no feed e a arte é montada na hora pelo mesmo caminho dos outros.
 * Se a arte falhar, o post fica no feed com o botão de montar (nada se perde).
 */
export async function criarPostTemaEmAlta(entrada: {
  perfilSlug: string;
  tema: string;
  assunto?: string;
  dia: string;
}): Promise<{ ok: true; postId: string; arte: boolean; aviso?: string } | { ok: false; erro: string }> {
  try {
    await assertSuperAdmin();
    const vt = validarTemaDigitado(entrada.tema);
    if (!vt.ok) return { ok: false, erro: vt.motivo };
    const quando = agendamentoDoDia(entrada.dia);
    if (!quando) return { ok: false, erro: "Escolha o dia da publicação." };

    const aline = createAlineClient();
    const { data: perfilData } = await aline
      .from("perfis").select("id, slug, publico_alvo, tom").eq("slug", entrada.perfilSlug).maybeSingle();
    if (!perfilData) return { ok: false, erro: "Perfil não encontrado." };
    const perfil = perfilData as { id: string; slug: string; publico_alvo: string | null; tom: string | null };

    const assuntoDela = (entrada.assunto ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const pedido = [
      JSON.stringify({ tema_em_alta: vt.tema, assunto_sugerido: assuntoDela || null, publico: perfil.publico_alvo, tom: perfil.tom }),
      "Escreva a CAPA do carrossel e o ASSUNTO de saúde que liga esse tema à curadoria do Scanner.",
      "A capa fala com quem viu ou ouviu falar do assunto e puxa pra vida dela, com a palavra que a pessoa usa. Não afirme nada sobre o assunto que não esteja no tema dado.",
      assuntoDela ? `Use como assunto o que a profissional sugeriu: "${assuntoDela}" (pode reescrever em palavras de curadoria).` : "",
      "Zero travessão. Português do Brasil com acentos.",
    ].filter(Boolean).join("\n\n");

    const anthropic = createClaude();
    let pauta: { capa: string; assunto: string } | null = null;
    let ultimo = "";
    for (let t = 0; t < TENTATIVAS && !pauta; t++) {
      const msg = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 600,
        tools: [FERRAMENTA_PAUTA as unknown as Anthropic.Tool],
        tool_choice: { type: "tool", name: FERRAMENTA_PAUTA.name },
        messages: [{ role: "user", content: ultimo ? `${pedido}\n\nA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimo}. Corrija só isso.` : pedido }],
      });
      const bloco = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!bloco) { ultimo = "a ferramenta não foi usada"; continue; }
      const v = validarPauta(acentuarFundo(semTravessoesFundo(bloco.input)));
      if (v.ok) pauta = { capa: v.capa, assunto: v.assunto };
      else ultimo = v.motivo;
    }
    if (!pauta) return { ok: false, erro: `A capa não saiu (${ultimo}). Tente de novo.` };

    const { data: novo, error: insErr } = await aline.from("posts").insert({
      perfil_id: perfil.id,
      tipo: "feed_carrossel",
      status: "aguardando_midia",
      origem: "manual_aline",
      aprovacao_tipo: "individual",
      midia_pendente: true,
      pilar: PILAR_TEMA_EM_ALTA,
      angulo: pauta.assunto,
      copy_legenda: legendaProvisoria(pauta.capa, vt.tema),
      prompt_usado: gravarTemaEmAlta(vt.tema),
      data_hora_agendada: quando,
      semana_ref: segundaDaSemana(quando.slice(0, 10)),
    }).select("id").single();
    if (insErr || !novo) return { ok: false, erro: `O post não foi criado: ${insErr?.message ?? "sem resposta do banco"}` };
    const postId = (novo as { id: string }).id;

    const arte = await montarArteDoPost(postId);
    revalidatePath(`/perfis/${perfil.slug}/feed`);
    if (!arte.ok) return { ok: true, postId, arte: false, aviso: `O post entrou no feed, mas a arte não saiu: ${arte.erro} Abra o post e use "Montar a arte deste post".` };
    return { ok: true, postId, arte: true };
  } catch (e) {
    console.error("[tema-em-alta] erro", e);
    return { ok: false, erro: e instanceof Error ? e.message : "não deu certo" };
  }
}
