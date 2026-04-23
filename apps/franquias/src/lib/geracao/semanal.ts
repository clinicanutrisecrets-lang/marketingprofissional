"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { gerarPost, planejarSemana } from "@/lib/claude/generate";
import type { ContextoFranqueada } from "@/lib/claude/prompts";
import {
  generateImage,
  buildModifications,
  resolveTemplateId,
} from "@/lib/bannerbear/client";
import {
  renderTemplate,
  pollUntilReady as pollCreatomate,
  montarModifications as montarModsCreatomate,
  resolveTemplateCreatomate,
} from "@/lib/creatomate/client";
import { gerarEUploadImagem } from "@/lib/ai-image/render";
import { escolherVideoParaPost } from "@/lib/videos/actions";
import {
  buscarDatasProximas,
  filtrarPorNicho,
} from "@/lib/tendencias/datas-comemorativas";
import { listarTendenciasDoDia } from "@/lib/tendencias/orquestrar";
import { revalidatePath } from "next/cache";

/**
 * Gera a semana de posts de uma franqueada.
 * - Cria registro em aprovacoes_semanais
 * - Planeja 3-5 posts seguindo preferências dela (dias, frequência)
 * - Para cada post: Claude gera copy → Bannerbear gera criativo → salva em posts_agendados
 * - Status final: 'aguardando_aprovacao' (se aprovacao_modo != 'automatico_total')
 *
 * Chamada: semanalmente via cron (a partir de 2ª feira 06:00), ou manualmente pelo admin.
 */
export async function gerarPostsDaSemana(
  franqueadaId: string,
  semanaRef: string,
): Promise<{ ok: boolean; total?: number; erro?: string }> {
  const admin = createAdminClient();

  // 1. Busca franqueada
  const { data: f, error: fErr } = await admin
    .from("franqueadas")
    .select("*")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (fErr || !f) return { ok: false, erro: fErr?.message ?? "Franqueada não encontrada" };
  const franqueada = f as Record<string, unknown>;

  // Bloqueia se não tem o mínimo pra gerar conteúdo
  if (!franqueada.nicho_principal || !franqueada.tom_comunicacao) {
    return {
      ok: false,
      erro: "Onboarding incompleto: faltam nicho_principal ou tom_comunicacao",
    };
  }

  // 2. Checa se já não existe aprovação pra essa semana
  const { data: aprovExistente } = await admin
    .from("aprovacoes_semanais")
    .select("id, status, total_posts")
    .eq("franqueada_id", franqueadaId)
    .eq("semana_ref", semanaRef)
    .maybeSingle();

  if (aprovExistente && (aprovExistente as { status?: string }).status !== "recusada") {
    return {
      ok: false,
      erro: `Já existe aprovação pra essa semana (status: ${(aprovExistente as { status?: string }).status})`,
    };
  }

  // 3. Cria registro de aprovação
  const deadline = new Date(semanaRef);
  deadline.setDate(deadline.getDate() + 6); // domingo da mesma semana
  deadline.setHours(22, 0, 0, 0);

  const { data: aprov, error: aprovErr } = await admin
    .from("aprovacoes_semanais")
    .insert({
      franqueada_id: franqueadaId,
      semana_ref: semanaRef,
      status: "aguardando",
      enviada_em: new Date().toISOString(),
      deadline: deadline.toISOString(),
    })
    .select("id")
    .single();

  if (aprovErr || !aprov) return { ok: false, erro: aprovErr?.message };

  const aprovacaoId = (aprov as { id: string }).id;

  // 4. Planeja a semana
  const plano = planejarSemana({
    diasPostSemana: (franqueada.dias_post_semana as number[]) ?? [1, 3, 5],
    frequenciaReels: (franqueada.frequencia_reels as string) ?? "semanal",
    frequenciaStories: (franqueada.frequencia_stories as string) ?? "diario",
  });

  const contexto = toContexto(franqueada);

  // Busca arquivos pra usar nos criativos (logo + foto)
  const logoUrl = await buscarArquivoUrl(admin, franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(admin, franqueadaId, "foto_profissional");

  // Busca inteligencia pra enriquecer os posts: datas comemorativas (14 dias a frente) + trends do dia
  const nicho = (franqueada.nicho_principal as string) ?? "saude_integrativa";
  const [datasRaw, tendencias] = await Promise.all([
    buscarDatasProximas(14, new Date(semanaRef)),
    listarTendenciasDoDia("saude_integrativa", 5),
  ]);
  const datasComemorativas = filtrarPorNicho(datasRaw, nicho);

  // Monta bloco de contexto extra textual que vai entrar no prompt do Claude
  const blocoContextoExtra = montarBlocoContextoExtra(
    datasComemorativas,
    tendencias,
  );

  // 5. Gera cada post (sequencial pra respeitar rate limits)
  let gerados = 0;
  const erros: string[] = [];

  for (const item of plano) {
    try {
      const post = await gerarPost(
        contexto,
        item.tipo,
        item.angulo,
        semanaRef,
        blocoContextoExtra,
      );

      // Calcula data/hora do post
      const dataHora = calcularDataHora(
        semanaRef,
        item.dia,
        (franqueada.horario_preferido_post as string) ?? "08:00",
      );

      // Gera criativo: prioridade AI-Image (imagens) > Creatomate (video+estático) > Bannerbear
      let urlImagem: string | null = null;
      let urlVideo: string | null = null;
      let designId: string | null = null;

      // 1. Tenta AI-Image primeiro (só pra imagens estáticas single-image)
      //    Reels e carrossel continuam no fluxo Creatomate por enquanto.
      const podeTentarAiImagem =
        (item.tipo === "feed_imagem" || item.tipo === "stories") &&
        (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

      if (podeTentarAiImagem) {
        try {
          const r = await gerarEUploadImagem({
            franqueadaId,
            tipo: item.tipo as "feed_imagem" | "stories",
            brand: {
              nomeMarca:
                (franqueada.nome_comercial as string) ||
                (franqueada.nome_completo as string),
              corPrimariaHex: (franqueada.cor_primaria_hex as string) || "#2F5D50",
              corSecundariaHex: franqueada.cor_secundaria_hex as string | undefined,
              logoUrl: logoUrl ?? undefined,
              fotoProfissionalUrl: fotoUrl ?? undefined,
              tomVisual: "editorial premium health clinic, sophisticated, calm",
              nicho: (franqueada.nicho_principal as string) || "nutrição funcional",
            },
            conteudo: {
              eyebrow: "Nutrição de Precisão",
              headline: post.headline,
              subtitle: post.subtitle,
              cta: post.copy_cta,
            },
          });
          urlImagem = r.url;
        } catch (aiErr) {
          console.warn("AI-Image falhou, tentando Creatomate:", aiErr);
        }
      }

      // 2. Creatomate (suporta vídeo + estático) — se AI-Image não gerou
      const ctmTemplateId = resolveTemplateCreatomate(item.tipo);
      const precisaCreatomate = !urlImagem && !urlVideo;
      if (precisaCreatomate && ctmTemplateId && process.env.CREATOMATE_API_KEY) {
        try {
          // Pra reels: busca vídeo de fundo (biblioteca > Pexels)
          let videoFundoUrl: string | undefined;
          if (item.tipo === "reels") {
            const ehSemana = post.angulo_copy ?? item.angulo;
            // Keywords simples baseadas em ângulo + nicho
            const keywords = [
              (franqueada.nicho_principal as string)?.replace(/_/g, " ") || "healthy",
              ehSemana.includes("dor") ? "wellness" : "nutrition",
              "natural food",
            ];
            const v = await escolherVideoParaPost(franqueadaId, keywords);
            if (v.url) videoFundoUrl = v.url;
          }

          const renders = await renderTemplate({
            templateId: ctmTemplateId,
            modifications: montarModsCreatomate({
              headline: post.headline,
              subtitle: post.subtitle,
              cta: post.copy_cta,
              copy_legenda: post.copy_legenda,
              cor_primaria: franqueada.cor_primaria_hex as string,
              cor_secundaria: franqueada.cor_secundaria_hex as string,
              logo_url: logoUrl ?? undefined,
              foto_nutri_url: fotoUrl ?? undefined,
              video_fundo_url: videoFundoUrl,
            }),
          });
          if (renders.length > 0) {
            const ready = await pollCreatomate(renders[0].id);
            if (item.tipo === "reels") {
              urlVideo = ready.url;
            } else {
              urlImagem = ready.url;
            }
            designId = renders[0].id;
          }
        } catch (e) {
          console.warn("Creatomate falhou, tentando Bannerbear:", e);
        }
      }

      // 2. Fallback: Bannerbear (só estático)
      if (!urlImagem && !urlVideo && process.env.BANNERBEAR_API_KEY) {
        try {
          const templateId = resolveTemplateId(item.tipo);
          const img = await generateImage({
            templateId,
            modifications: buildModifications({
              headline: post.headline,
              subtitle: post.subtitle,
              cta: post.copy_cta,
              cor_primaria_hex: franqueada.cor_primaria_hex as string,
              logo_url: logoUrl ?? undefined,
              foto_nutri_url: fotoUrl ?? undefined,
            }),
            synchronous: true,
          });
          urlImagem = img.image_url;
          designId = img.uid;
        } catch (bbErr) {
          console.warn("Bannerbear falhou, seguindo sem criativo:", bbErr);
        }
      }

      // Salva post
      const { error: postErr } = await admin.from("posts_agendados").insert({
        franqueada_id: franqueadaId,
        aprovacao_semanal_id: aprovacaoId,
        semana_ref: semanaRef,
        tipo_post: item.tipo,
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
        ia_tokens_input: post._usage?.input_tokens,
        ia_tokens_output: post._usage?.output_tokens,
        ia_tokens_cached: post._usage?.cache_read_input_tokens,
        bannerbear_design_id: designId,
        url_imagem_final: urlImagem,
        url_video_final: urlVideo,
        data_hora_agendada: dataHora,
        legenda_gerada_ia: true,
      });

      if (postErr) {
        erros.push(`${item.angulo}: ${postErr.message}`);
      } else {
        gerados += 1;
      }
    } catch (e) {
      erros.push(`${item.angulo}: ${(e as Error).message}`);
    }
  }

  // 6. Atualiza total no registro de aprovação
  await admin
    .from("aprovacoes_semanais")
    .update({ total_posts: gerados })
    .eq("id", aprovacaoId);

  // 7. Email notificando franqueada (se configurado Resend)
  if (gerados > 0 && franqueada.email) {
    try {
      const { enviarEmail } = await import("@/lib/emails/client");
      const { emailSemanaProntaAprovacao } = await import("@/lib/emails/templates");
      const nome =
        (franqueada.nome_comercial as string) ||
        ((franqueada.nome_completo as string) ?? "").split(" ")[0] ||
        "Dra.";
      const deadlineStr = deadline.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      });
      const tpl = emailSemanaProntaAprovacao(
        nome,
        gerados,
        `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.scannerdasaude.com"}/dashboard/aprovar`,
        deadlineStr,
      );
      await enviarEmail({
        para: franqueada.email as string,
        assunto: tpl.assunto,
        html: tpl.html,
        texto: tpl.texto,
      });
    } catch (emailErr) {
      console.warn("[semanal] email nao enviado:", emailErr);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");

  if (gerados === 0) {
    return { ok: false, erro: erros.join("; ") || "Nenhum post gerado" };
  }

  return { ok: true, total: gerados };
}

/**
 * Dispara geração pra franqueada do usuário logado (ação do admin).
 */
export async function gerarMinhaSemana(semanaRef?: string) {
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

  const semana = semanaRef ?? proximaSegunda();
  return gerarPostsDaSemana((f as { id: string }).id, semana);
}

// ====== HELPERS ======

function toContexto(f: Record<string, unknown>): ContextoFranqueada {
  return {
    nome_comercial: f.nome_comercial as string,
    nome_completo: f.nome_completo as string,
    nicho_principal: f.nicho_principal as string,
    publico_alvo_descricao: f.publico_alvo_descricao as string,
    diferenciais: f.diferenciais as string,
    historia_pessoal: f.historia_pessoal as string,
    resultado_transformacao: f.resultado_transformacao as string,
    tom_comunicacao: f.tom_comunicacao as string,
    palavras_chave_usar: f.palavras_chave_usar as string[],
    palavras_evitar: f.palavras_evitar as string,
    hashtags_favoritas: f.hashtags_favoritas as string[],
    concorrentes_nao_citar: f.concorrentes_nao_citar as string,
    modalidade_atendimento: f.modalidade_atendimento as string,
    cidade: f.cidade as string,
    estado: f.estado as string,
    valor_consulta_inicial: f.valor_consulta_inicial as number,
    link_agendamento: f.link_agendamento as string,
  };
}

async function buscarArquivoUrl(
  admin: ReturnType<typeof createAdminClient>,
  franqueadaId: string,
  tipo: string,
): Promise<string | null> {
  const { data } = await admin
    .from("arquivos_franqueada")
    .select("url_storage")
    .eq("franqueada_id", franqueadaId)
    .eq("tipo", tipo)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { url_storage?: string } | null)?.url_storage ?? null;
}

function calcularDataHora(semanaRef: string, diaSemana: number, horario: string): string {
  const [h, m] = horario.split(":").map(Number);
  const d = new Date(semanaRef);
  const diff = (diaSemana - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
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
 * Monta bloco de texto com datas comemorativas + tendencias do momento
 * pra injetar no prompt do Claude como contexto_extra.
 * Se vazio, retorna undefined (Claude nao usa nada extra).
 */
function montarBlocoContextoExtra(
  datas: Array<{
    data_mes: number;
    data_dia: number;
    nome: string;
    categoria: string;
    descricao: string | null;
    ideias_angulo: string | null;
  }>,
  tendencias: Array<Record<string, unknown>>,
): string | undefined {
  const partes: string[] = [];

  if (datas.length > 0) {
    partes.push("DATAS COMEMORATIVAS NAS PROXIMAS 2 SEMANAS (use se fizer sentido no calendario da semana):");
    datas.slice(0, 5).forEach((d) => {
      partes.push(
        `- ${d.data_dia}/${d.data_mes} — ${d.nome}${d.ideias_angulo ? `: ${d.ideias_angulo}` : ""}`,
      );
    });
    partes.push("");
  }

  if (tendencias.length > 0) {
    partes.push("TEMAS EM ALTA HOJE NO NICHO (use como inspiracao de angulo se casar com a franqueada):");
    tendencias.slice(0, 5).forEach((t) => {
      partes.push(
        `- ${t.tema as string}${t.resumo ? ` — ${t.resumo as string}` : ""}`,
      );
    });
    partes.push("");
  }

  if (partes.length === 0) return undefined;

  partes.push(
    "IMPORTANTE: use esses inputs SOMENTE se forem realmente relevantes pra franqueada e pro publico-alvo dela. Nao force encaixe.",
  );

  return partes.join("\n");
}
