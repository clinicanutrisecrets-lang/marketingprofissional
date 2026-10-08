"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  gerarMinhaSemana,
  gerarPostsDaSemana,
  type ResultadoGeracaoSemana,
} from "@/lib/geracao/semanal";
import { CLAUDE_MODEL_COPY } from "@/lib/claude/client";

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
    .eq("franqueada_id", ctx.franqueadaId)
    // FIX 8: Only update posts still awaiting approval (idempotency guard)
    .eq("status", "aguardando_aprovacao");

  if (errPosts) return { ok: false, erro: errPosts.message };

  // FIX 8: Check current status before updating weekly record
  const { data: aprovacaoAtual } = await supabase
    .from("aprovacoes_semanais")
    .select("status")
    .eq("id", aprovacaoId)
    .eq("franqueada_id", ctx.franqueadaId)
    .maybeSingle();

  if ((aprovacaoAtual as Record<string, unknown> | null)?.status === "aprovada_integral") {
    revalidatePath("/dashboard/aprovar");
    revalidatePath("/dashboard");
    return { ok: true };
  }

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
export async function gerarSemanaManual(): Promise<ResultadoGeracaoSemana> {
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
        ia_model_usado: CLAUDE_MODEL_COPY,
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

/**
 * Corrige o texto DA ARTE e redesenha a imagem (pedido da Juliana, 08/10).
 * O redesenho é o desenhador tipográfico da geração: nenhum modelo é
 * chamado, então corrigir custa zero. Só vale pra post cuja arte saiu do
 * desenhador (tem `texto_arte`) e que ainda não foi pro Instagram.
 */
export async function redesenharArteComTexto(
  postId: string,
  pecasEditadas: unknown,
): Promise<{ ok: true; url_imagem_final: string; urls_slides: string[] | null; texto_arte: unknown } | { ok: false; erro: string }> {
  const ctx = await getFranqueadaDoUser();
  if (!ctx) return { ok: false, erro: "Não autenticado" };

  const { lerTextoArte, normalizarPecasEditadas, mesmasPecas, podeRedesenhar } = await import(
    "@/lib/criativo/texto-arte-edicao"
  );
  const admin = createAdminClient();
  const { data: post, error: postErr } = await admin
    .from("posts_agendados")
    .select("id, franqueada_id, tipo_post, status, data_hora_postado, texto_arte, foto_arte_ref, url_imagem_final, urls_slides, edicoes_log")
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId)
    .maybeSingle();
  if (postErr) return { ok: false, erro: "Não consegui ler o post. Tente de novo." };
  if (!post) return { ok: false, erro: "Post não encontrado." };
  const p = post as Record<string, unknown>;
  if (!podeRedesenhar(p)) return { ok: false, erro: "Este post não pode mais ter a arte refeita." };

  const original = lerTextoArte(p.texto_arte);
  if (!original) return { ok: false, erro: "A arte deste post não guardou o texto. Só posts gerados a partir de hoje podem ser corrigidos." };
  const conferido = normalizarPecasEditadas(pecasEditadas, original);
  if (!conferido.ok) return conferido;
  if (mesmasPecas(conferido.pecas, original)) {
    return {
      ok: true,
      url_imagem_final: p.url_imagem_final as string,
      urls_slides: (p.urls_slides as string[] | null) ?? null,
      texto_arte: original,
    };
  }

  const { data: f } = await admin.from("franqueadas").select("*").eq("id", ctx.franqueadaId).maybeSingle();
  if (!f) return { ok: false, erro: "Conta não encontrada." };
  const { brandDaFranqueada } = await import("@/lib/ai-image/brand");
  const { buscarArquivoUrl } = await import("@/lib/arquivos/url-asset");
  const { gerarEUploadImagem, gerarCarrosselEUpload } = await import("@/lib/ai-image/render");
  const { caminhoNoBucket } = await import("@/lib/geracao/fotos-banco");

  const logoUrl = await buscarArquivoUrl(admin, ctx.franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(admin, ctx.franqueadaId, "foto_profissional");
  const brand = brandDaFranqueada(f as Parameters<typeof brandDaFranqueada>[0], { logoUrl, fotoUrl });

  // A mesma foto do banco que estava na arte. Se ela não baixar mais, a arte
  // sai sem foto em vez de travar a correção.
  let foto: Buffer | undefined;
  const ref = typeof p.foto_arte_ref === "string" ? p.foto_arte_ref : null;
  if (ref) {
    try {
      const local = caminhoNoBucket(ref);
      if (local) {
        const { data } = await admin.storage.from(local.bucket).download(local.path);
        if (data) foto = Buffer.from(await data.arrayBuffer());
      } else {
        const res = await fetch(ref, { signal: AbortSignal.timeout(10000) });
        if (res.ok) foto = Buffer.from(await res.arrayBuffer());
      }
    } catch {
      console.warn(`[redesenhar] foto ${ref} não baixou; segue sem foto`);
    }
  }

  let urlImagem: string;
  let urlsSlides: string[] | null = null;
  try {
    if (p.tipo_post === "feed_carrossel") {
      const r = await gerarCarrosselEUpload({
        franqueadaId: ctx.franqueadaId,
        brand,
        slides: conferido.pecas,
        fotoCapa: foto,
        capaEstilo: ((f as { estilo_capa?: string | null }).estilo_capa ?? undefined) as never,
      });
      if (!r.urls.length) throw new Error("carrossel sem slides");
      urlImagem = r.urls[0]!;
      urlsSlides = r.urls;
    } else {
      const r = await gerarEUploadImagem({
        franqueadaId: ctx.franqueadaId,
        tipo: p.tipo_post as "feed_imagem" | "stories",
        brand,
        conteudo: conferido.pecas[0]!,
        fotoPropria: foto,
      });
      urlImagem = r.url;
    }
  } catch (e) {
    console.error("[redesenhar] falhou:", e);
    return { ok: false, erro: "Não consegui redesenhar a arte agora. O texto anterior segue valendo." };
  }

  const log = Array.isArray(p.edicoes_log) ? (p.edicoes_log as unknown[]) : [];
  const { error: updErr } = await admin
    .from("posts_agendados")
    .update({
      texto_arte: conferido.pecas,
      url_imagem_final: urlImagem,
      ...(urlsSlides ? { urls_slides: urlsSlides } : {}),
      editado_pela_nutri: true,
      edicoes_log: [...log, { em: new Date().toISOString(), campo: "texto_arte", antes: original }],
    })
    .eq("id", postId)
    .eq("franqueada_id", ctx.franqueadaId);
  if (updErr) return { ok: false, erro: "A arte nova foi desenhada, mas não foi salva. Tente de novo." };

  revalidatePath("/dashboard/aprovar");
  return { ok: true, url_imagem_final: urlImagem, urls_slides: urlsSlides, texto_arte: conferido.pecas };
}
