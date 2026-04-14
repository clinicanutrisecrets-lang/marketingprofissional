"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { gerarMinhaSemana, gerarPostsDaSemana } from "@/lib/geracao/semanal";

async function getFranqueadaDoUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data ? { userId: user.id, franqueadaId: (data as { id: string }).id } : null;
}

export async function aprovarPost(postId: string): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({ status: "aprovado", aprovado_individual: true })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

export async function aprovarSemanaToda(
  aprovacaoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();

  const { error: errPosts } = await supabase
    .from("posts_agendados")
    .update({
      status: "aprovado",
      aprovado_individual: true,
    })
    .eq("aprovacao_semanal_id", aprovacaoId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (errPosts) return { ok: false, erro: errPosts.message };

  const { error: errAprov } = await supabase
    .from("aprovacoes_semanais")
    .update({
      status: "aprovada_integral",
      aprovada_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (errAprov) return { ok: false, erro: errAprov.message };

  revalidatePath("/dashboard/aprovar");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function atualizarCopyPost(
  postId: string,
  campos: { copy_legenda?: string; copy_cta?: string; hashtags?: string[]; data_hora_agendada?: string },
): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({
      ...campos,
      editado_pela_nutri: true,
    })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

export async function cancelarPost(postId: string): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const supabase = createClient();
  const { error } = await supabase
    .from("posts_agendados")
    .update({ status: "cancelado" })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/dashboard/aprovar");
  return { ok: true };
}

/**
 * Dispara geração manual da semana (ação da nutri pelo dashboard).
 */
export async function gerarSemanaManual() {
  return gerarMinhaSemana();
}

/**
 * Gera um post substituto pra um cancelado/recusado, mantendo data e tipo,
 * mas com ângulo diferente do anterior.
 */
export async function gerarPostSubstituto(
  postCanceladoId: string,
): Promise<{ ok: boolean; novoPostId?: string; erro?: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const { createAdminClient } = await import("@/lib/supabase/server");
  const { gerarPost } = await import("@/lib/claude/generate");
  const { generateImage, buildModifications, resolveTemplateId } = await import(
    "@/lib/bannerbear/client"
  );
  const admin = createAdminClient();

  // Busca post original
  const { data: original } = await admin
    .from("posts_agendados")
    .select("*")
    .eq("id", postCanceladoId)
    .eq("franqueada_id", ctx.franqueadaId)
    .maybeSingle();

  if (!original) return { ok: false, erro: "Post não encontrado" };
  const orig = original as Record<string, unknown>;

  // Busca franqueada pra contexto
  const { data: f } = await admin
    .from("franqueadas")
    .select("*")
    .eq("id", ctx.franqueadaId)
    .maybeSingle();

  if (!f) return { ok: false, erro: "Franqueada não encontrada" };
  const franqueada = f as Record<string, unknown>;

  // Define ângulo diferente do original (rotação)
  const todosAngulos = [
    "educativo_ciencia",
    "dor_do_paciente",
    "bastidor_da_nutri",
    "mito_vs_verdade",
    "caso_anonimizado",
    "prova_social",
    "chamada_direta",
  ] as const;
  const anguloOriginal = orig.angulo_copy as string;
  const outrosAngulos = todosAngulos.filter((a) => a !== anguloOriginal);
  const novoAngulo = outrosAngulos[Math.floor(Math.random() * outrosAngulos.length)];

  try {
    const post = await gerarPost(
      {
        nome_comercial: franqueada.nome_comercial as string,
        nome_completo: franqueada.nome_completo as string,
        nicho_principal: franqueada.nicho_principal as string,
        publico_alvo_descricao: franqueada.publico_alvo_descricao as string,
        diferenciais: franqueada.diferenciais as string,
        historia_pessoal: franqueada.historia_pessoal as string,
        resultado_transformacao: franqueada.resultado_transformacao as string,
        tom_comunicacao: franqueada.tom_comunicacao as string,
        palavras_chave_usar: franqueada.palavras_chave_usar as string[],
        palavras_evitar: franqueada.palavras_evitar as string,
        hashtags_favoritas: franqueada.hashtags_favoritas as string[],
        modalidade_atendimento: franqueada.modalidade_atendimento as string,
        cidade: franqueada.cidade as string,
        estado: franqueada.estado as string,
        valor_consulta_inicial: franqueada.valor_consulta_inicial as number,
        link_agendamento: franqueada.link_agendamento as string,
      },
      orig.tipo_post as "feed_imagem" | "feed_carrossel" | "reels" | "stories",
      novoAngulo,
      orig.semana_ref as string,
      `Substitui post cancelado de ângulo "${anguloOriginal}". Use ângulo diferente.`,
    );

    // Tenta gerar criativo (se Bannerbear configurado)
    let urlImagem: string | null = null;
    let bannerbearId: string | null = null;
    try {
      const templateId = resolveTemplateId(orig.tipo_post as string);
      const img = await generateImage({
        templateId,
        modifications: buildModifications({
          headline: post.headline,
          subtitle: post.subtitle,
          cta: post.copy_cta,
          cor_primaria_hex: franqueada.cor_primaria_hex as string,
        }),
        synchronous: true,
      });
      urlImagem = img.image_url;
      bannerbearId = img.uid;
    } catch {
      // Bannerbear opcional
    }

    const { data: novo, error } = await admin
      .from("posts_agendados")
      .insert({
        franqueada_id: ctx.franqueadaId,
        aprovacao_semanal_id: orig.aprovacao_semanal_id,
        semana_ref: orig.semana_ref,
        tipo_post: orig.tipo_post,
        status: "aguardando_aprovacao",
        origem: "ia_automatico",
        copy_legenda: post.copy_legenda,
        copy_cta: post.copy_cta,
        hashtags: post.hashtags,
        angulo_copy: post.angulo_copy,
        copy_legenda_ia_original: post.copy_legenda,
        copy_cta_ia_original: post.copy_cta,
        hashtags_ia_original: post.hashtags,
        ia_model_usado: "claude-sonnet-4-5",
        bannerbear_design_id: bannerbearId,
        url_imagem_final: urlImagem,
        data_hora_agendada: orig.data_hora_agendada, // mesmo horário
        legenda_gerada_ia: true,
        redistribuido_de: orig.id as string, // marca que substitui o original
      })
      .select("id")
      .single();

    if (error) return { ok: false, erro: error.message };

    revalidatePath("/dashboard/aprovar");
    return { ok: true, novoPostId: (novo as { id: string }).id };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/**
 * Dispara geração via admin (pra qualquer franqueada).
 */
export async function gerarSemanaAdmin(franqueadaId: string, semanaRef?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) return { ok: false, erro: "Sem permissão" };

  const semana = semanaRef ?? proximaSegunda();
  return gerarPostsDaSemana(franqueadaId, semana);
}

function proximaSegunda(): string {
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  d.setDate(d.getDate() + diasAteSegunda);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
