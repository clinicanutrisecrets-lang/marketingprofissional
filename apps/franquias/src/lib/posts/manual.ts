"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createClaude, CLAUDE_MODEL } from "@/lib/claude/client";
import { buildSystemPrompt } from "@/lib/claude/prompts";
import { carregarProdutosContexto } from "@/lib/produtos/contexto";
import { traduzirErroClaude } from "@/lib/claude/erros";
import { semTravessoesFundo } from "@/lib/texto/sem-travessoes";
import { revalidatePath } from "next/cache";

type ContextoFranqueada = Parameters<typeof buildSystemPrompt>[0];

/**
 * Gera uma legenda a partir de um briefing curto (1-2 linhas) da nutri.
 */
export async function gerarLegendaManual(
  briefing: string,
  tipo: string,
): Promise<{ ok: boolean; legenda?: string; cta?: string; hashtags?: string[]; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: f } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!f) return { ok: false, erro: "Franqueada não encontrada" };
  const fr = f as Record<string, unknown>;

  const contexto: ContextoFranqueada = {
    nome_comercial: fr.nome_comercial as string,
    nicho_principal: fr.nicho_principal as string,
    publico_alvo_descricao: fr.publico_alvo_descricao as string,
    diferenciais: fr.diferenciais as string,
    tom_comunicacao: fr.tom_comunicacao as string,
    palavras_chave_usar: fr.palavras_chave_usar as string[],
    palavras_evitar: fr.palavras_evitar as string,
    hashtags_favoritas: fr.hashtags_favoritas as string[],
    link_agendamento: fr.link_agendamento as string,
  };
  // Produtos reais do Scanner Tratamentos — legenda pode citar
  // produto/preço/link verdadeiros se o briefing pedir
  contexto.produtos = await carregarProdutosContexto(supabase, fr.id as string);

  try {
    const claude = createClaude();
    const systemText = buildSystemPrompt(contexto);

    // Stories NÃO recebe legenda de feed: a Juliana escolheu "stories" e o
    // gerador devolveu um parágrafo de legenda genérico (22/08). Story é
    // roteiro de TELAS — texto curto que cabe na tela, uma ideia por tela.
    const instrucaoFormato =
      tipo === "stories"
        ? `Stories NÃO leva legenda de feed. Gere um ROTEIRO DE TELAS (3 a 5 telas):
- Cada tela: 1-2 frases curtas (máx ~140 caracteres) — texto que cabe NA tela do story.
- "copy_legenda" = as telas separadas por linha em branco, cada uma prefixada "Tela N: ".
- Tela 1 = gancho que segura o dedo. Telas do meio = desenvolvimento, uma ideia por tela.
- Última tela = convite de interação com sticker (enquete, caixa de pergunta ou link) — é esse convite que vai em "copy_cta".
- Stories quase não usa hashtag: devolva no máximo 1-2 em "hashtags".`
        : tipo === "reels"
          ? `Reels: a legenda complementa o vídeo (não repete o que ele fala). 150-400 chars em "copy_legenda", gancho na primeira linha.`
          : `Gere a legenda completa do post (150-400 chars) em "copy_legenda".`;

    const userPrompt = `A nutri vai postar um ${tipo} e escreveu esse briefing curto do que quer comunicar:

"${briefing}"

${instrucaoFormato}

IMPORTANTE — nada de texto genérico que serviria pra qualquer perfil de nutrição: escreva ESPECÍFICO pro nicho e pro público descritos no contexto do perfil (dor concreta, situação do dia a dia dessa pessoa, vocabulário dela). Se o briefing citar um tema, aprofunde NESSE tema em vez de generalizar.

Responda APENAS JSON:
{
  "copy_legenda": "...",
  "copy_cta": "CTA curto",
  "hashtags": ["h1", "h2", ...]
}`;

    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, erro: "Claude sem resposta" };
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const parsed = semTravessoesFundo(
      JSON.parse(cleaned) as {
        copy_legenda: string;
        copy_cta: string;
        hashtags: string[];
      },
    );

    return {
      ok: true,
      legenda: parsed.copy_legenda,
      cta: parsed.copy_cta,
      hashtags: parsed.hashtags,
    };
  } catch (e) {
    // Nunca devolver o erro cru da API pra tela (vazava o JSON da Anthropic).
    console.error("[gerarLegendaManual] falhou:", e);
    return { ok: false, erro: traduzirErroClaude(e).mensagem };
  }
}

/**
 * Cria post manual com mídia já uploadada.
 */
export async function criarPostManual(params: {
  tipo: "feed_imagem" | "feed_carrossel" | "reels" | "stories";
  copy_legenda: string;
  copy_cta?: string;
  hashtags?: string[];
  briefing_nutri?: string;
  /**
   * Opcional de propósito. Enquanto a publicação automática não existe
   * (depende da aprovação do app na Meta / do Publer configurado), as telas
   * NÃO pedem data: o post fica salvo e a nutri publica quando quiser.
   * Sem data o cron de publicação nunca pega o post — ele filtra por
   * `data_hora_agendada <= agora`, e comparação com NULL nunca é verdadeira.
   */
  data_hora_agendada?: string | null;
  url_imagem?: string;
  url_video?: string;
  legenda_gerada_ia?: boolean;
}): Promise<{ ok: boolean; postId?: string; erro?: string; redistribuidos?: number }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!f) return { ok: false, erro: "Franqueada não encontrada" };
  const franqueadaId = (f as { id: string }).id;

  // 1. Só faz sentido remanejar a agenda quando existe agenda: sem data, não
  //    há janela pra conflitar (nem publicação automática pra atrapalhar).
  let redistribuidos = 0;
  if (params.data_hora_agendada) {
    const dataPost = new Date(params.data_hora_agendada);
    const janelaInicio = new Date(dataPost.getTime() - 3 * 60 * 60 * 1000);
    const janelaFim = new Date(dataPost.getTime() + 3 * 60 * 60 * 1000);

    const { data: conflitantes } = await supabase
      .from("posts_agendados")
      .select("id, data_hora_agendada")
      .eq("franqueada_id", franqueadaId)
      .eq("tipo_post", params.tipo)
      .eq("origem", "ia_automatico")
      .in("status", ["aguardando_aprovacao", "aprovado"])
      .gte("data_hora_agendada", janelaInicio.toISOString())
      .lte("data_hora_agendada", janelaFim.toISOString());

    if (conflitantes && conflitantes.length > 0) {
      for (const c of conflitantes) {
        const conf = c as { id: string; data_hora_agendada: string };
        const novoHorario = new Date(dataPost.getTime() + 4 * 60 * 60 * 1000 + redistribuidos * 24 * 60 * 60 * 1000);
        await supabase
          .from("posts_agendados")
          .update({
            data_hora_agendada: novoHorario.toISOString(),
            redistribuido_de: conf.data_hora_agendada,
          })
          .eq("id", conf.id);
        redistribuidos += 1;
      }
    }
  }

  // 2. Cria o post manual
  const { data: novo, error } = await supabase
    .from("posts_agendados")
    .insert({
      franqueada_id: franqueadaId,
      tipo_post: params.tipo,
      status: "aprovado", // manual já nasce pronto pra usar
      origem: "manual_nutri",
      prioridade: 100,
      bloqueado_horario: true,
      copy_legenda: params.copy_legenda,
      copy_cta: params.copy_cta,
      hashtags: params.hashtags,
      briefing_nutri: params.briefing_nutri,
      legenda_gerada_ia: params.legenda_gerada_ia ?? false,
      data_hora_agendada: params.data_hora_agendada ?? null,
      imagem_upload_url: params.url_imagem,
      video_upload_url: params.url_video,
      url_imagem_final: params.url_imagem,
      url_video_final: params.url_video,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/aprovar");

  return {
    ok: true,
    postId: (novo as { id: string }).id,
    redistribuidos,
  };
}
