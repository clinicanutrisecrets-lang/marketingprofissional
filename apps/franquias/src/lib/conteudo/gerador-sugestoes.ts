import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarEUploadImagem, gerarCarrosselEUpload } from "@/lib/ai-image/render";
import { buscarPautasQuentes } from "./trends";
import { renderCard, renderReceita, type IlustracaoId } from "@scanner/ai-image";
import type { BrandGuidelines, ConteudoPeca } from "@scanner/ai-image";

const MODEL = "claude-sonnet-4-5";

/**
 * Estúdio de Conteúdo — gera o pacote semanal de sugestões prontas:
 * pauta puxada de notícias quentes do nicho + arte pronta pra baixar +
 * legenda pra copiar + roteiro de reel com teleprompter.
 *
 * A nutri não precisa de aprovação da Meta pra NADA disso: baixa a arte,
 * copia a legenda, grava o reel lendo o teleprompter e posta ela mesma.
 */

type SugestaoIA = {
  tipo: "feed_imagem" | "feed_carrossel" | "reel";
  tema: string;
  gatilho_pauta: string;
  eyebrow: string;
  headline: string;
  subtitle?: string;
  cta_card?: string;
  slides?: Array<{ headline: string; corpo?: string; subtitle?: string; cta?: string }>;
  ilustracao?: string;
  receita_slug?: string;
  condicao?: string;
  copy_legenda: string;
  hashtags: string[];
  roteiro?: {
    hook: string;
    blocos: string[];
    cta: string;
    duracao_s: number;
    dicas: string[];
  };
};

const SYSTEM = `
Você é diretor de conteúdo de uma agência premium especializada em nutricionistas de saúde integrativa de alto ticket (tratamentos de R$ 3.000 a R$ 7.500 com testes nutrigenéticos e de microbiota).

MISSÃO: transformar notícias quentes + nicho da profissional em um calendário semanal de posts com potencial viral E profundidade técnica de autoridade.

O SEGREDO DO FORMATO: pegar o assunto que está na mídia (ex.: famosos com câncer colorretal) e traduzir para a ciência que só uma nutri integrativa de precisão domina (ex.: polimorfismos da família GST e detoxificação, crucíferas e sulforafano, Fusobacterium nucleatum no exame de microbiota, chá verde/EGCG, reduzir carne vermelha tostada e poluentes). Isso posiciona a profissional como AUTORIDADE que conecta o assunto do momento à conduta clínica.

REGRAS DE COMPLIANCE (CFN 856/2026 — INEGOCIÁVEL):
- ZERO promessa de cura, prevenção garantida ou resultado
- ZERO "antes e depois", ZERO prazo de resultado
- Notícia sobre doença → tom informativo-epidemiológico + "converse com seu profissional"
- Sempre ciência com referência implícita ("estudos associam", "a literatura sugere")
- Nada de diagnóstico pela rede social

COPY DE LEGENDA:
- Primeira linha = gancho forte (para o dedo parar)
- Corpo escaneável (frases curtas, quebras de linha)
- Storytelling ou dado surpreendente no meio
- CTA suave no fim (comentar/salvar/compartilhar/agendar)
- 80 a 150 palavras

ROTEIRO DE REEL (para teleprompter):
- hook: primeiras 2 frases faladas (3s, decisivas)
- blocos: 3 a 5 blocos de fala natural e curta (como se falasse com uma amiga), total 30-60s
- linguagem falada, sem jargão não explicado (explique termos técnicos de forma lúdica)
- cta: convite final
- dicas: 2-3 dicas de gravação (enquadramento, energia, b-roll)

CARDS (arte tipográfica premium — sem foto):
- eyebrow: categoria curta (2-3 palavras)
- headline: frase de impacto, 6 a 12 palavras — é o texto GIGANTE da arte
- subtitle: complemento de 1-2 frases (opcional)
- cta_card: frase manuscrita curta tipo "salva esse post" (opcional)
- CARROSSEL: 4 a 6 slides; slide 1 = capa (headline forte); slides internos = headline curta + corpo de 2-3 parágrafos curtos; último slide = CTA
- Para 1 dos 2 feed_imagem, defina "ilustracao" com UMA opção que combine com o tema: mulher | folhas | ramo | laranja | cha | cafe | suco | coracao | intestino | dna | celulas | microbiota | exame | estetoscopio | lupa | balanca | prato | salada | maca | abacate | uvas | morango | cereais | leguminosas | peixe | ovo — vira um layout editorial elegante com desenho em traço. O outro feed_imagem fica sem "ilustracao".

PEDIDOS DA NUTRI (quando o input trouxer "pedidos_da_nutri"):
- São temas que a própria profissional pediu — TÊM PRIORIDADE MÁXIMA sobre as manchetes.
- Use cada pedido como base de uma sugestão (respeitando o formato preferido quando indicado).

RECEITAS TERAPÊUTICAS (quando o input trouxer "receitas_disponiveis"):
- Escolha UMA receita que converse com o nicho e as pautas da semana e crie uma sugestão EXTRA de tipo feed_imagem com:
  - "receita_slug": o slug exato da receita escolhida
  - "condicao": complemento curto tipo "para quem tem Hashimoto" (adequado ao nicho)
  - "copy_legenda": explique POR QUE a receita ajuda naquela condição, citando 1-2 genes relevantes, o papel da microbiota e os sintomas que ela apoia — didático, lúdico e CFN-compliant (nada de "cura" ou prescrição; sempre "converse com sua nutricionista").
  - headline = título da receita (não invente outro)

Saída: APENAS JSON válido:
{"sugestoes": [SugestaoIA, ...]}
com exatamente: 2 feed_imagem, 1 feed_carrossel, 2 reel — e +1 feed_imagem de receita quando houver receitas disponíveis.
`.trim();

export async function gerarSugestoesSemana(params: {
  franqueadaId: string;
  semanaRef: string; // segunda-feira YYYY-MM-DD
  /** true = apaga as sugestões existentes da semana e gera de novo */
  regerar?: boolean;
}): Promise<{ criadas: number; erro?: string }> {
  const admin = createAdminClient();

  if (params.regerar) {
    await admin
      .from("sugestoes_conteudo")
      .delete()
      .eq("franqueada_id", params.franqueadaId)
      .eq("semana_ref", params.semanaRef);
  }

  const { data: fData, error: fErr } = await admin
    .from("franqueadas")
    .select(
      "id, nome_comercial, nome_completo, instagram_handle, nicho_principal, nicho_secundario, publico_alvo_descricao, tom_comunicacao, palavras_evitar, palavras_chave_usar, hashtags_favoritas, cor_primaria_hex, valor_consulta_inicial, diferenciais",
    )
    .eq("id", params.franqueadaId)
    .single();
  if (fErr || !fData) return { criadas: 0, erro: "franqueada não encontrada" };
  const f = fData as unknown as {
    nome_comercial: string | null;
    nome_completo: string | null;
    instagram_handle: string | null;
    nicho_principal: string | null;
    nicho_secundario: string | null;
    publico_alvo_descricao: string | null;
    tom_comunicacao: string | null;
    palavras_evitar: string | null;
    palavras_chave_usar: string[] | null;
    hashtags_favoritas: string[] | null;
    cor_primaria_hex: string | null;
    diferenciais: string | null;
  };

  // Idempotência: não regenera se a semana já tem sugestões
  const { count } = await admin
    .from("sugestoes_conteudo")
    .select("id", { count: "exact", head: true })
    .eq("franqueada_id", params.franqueadaId)
    .eq("semana_ref", params.semanaRef);
  if ((count ?? 0) > 0) return { criadas: 0, erro: "semana já tem sugestões" };

  // 1. Radar de pautas
  const manchetes = await buscarPautasQuentes({
    nichoPrincipal: f.nicho_principal,
    nichoSecundario: f.nicho_secundario,
  });

  // Pedidos da nutri ("Pedir conteúdo") entram como prioridade da semana
  const { data: pedidosData } = await admin
    .from("briefings_franqueada")
    .select("id, tema, angulo_sugerido, formato_preferido, observacoes")
    .eq("franqueada_id", params.franqueadaId)
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .limit(5);
  const pedidos = (pedidosData ?? []) as Array<{
    id: string; tema: string; angulo_sugerido: string | null;
    formato_preferido: string | null; observacoes: string | null;
  }>;

  // Receitas da biblioteca central (fotos reais no git da marca)
  const { data: receitasData } = await admin
    .from("biblioteca_receitas")
    .select("slug, titulo, url")
    .eq("ativo", true)
    .limit(12);
  const receitas = (receitasData ?? []) as Array<{ slug: string; titulo: string; url: string }>;

  // 2. Agente de conteúdo
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const input = {
    perfil: {
      nome: f.nome_comercial || f.nome_completo,
      instagram: f.instagram_handle,
      nicho_principal: f.nicho_principal,
      nicho_secundario: f.nicho_secundario,
      publico_alvo: f.publico_alvo_descricao,
      tom: f.tom_comunicacao,
      palavras_evitar: f.palavras_evitar,
      palavras_chave: f.palavras_chave_usar,
      diferenciais: f.diferenciais,
    },
    manchetes_recentes: manchetes.map((m) => `${m.titulo} (${m.fonte})`),
    receitas_disponiveis: receitas.map((r) => ({ slug: r.slug, titulo: r.titulo })),
    pedidos_da_nutri: pedidos.map((p) => ({
      tema: p.tema, angulo: p.angulo_sugerido, formato: p.formato_preferido, obs: p.observacoes,
    })),
    semana_ref: params.semanaRef,
  };

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });

  const texto = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { criadas: 0, erro: "agente não retornou JSON" };

  let sugestoes: SugestaoIA[];
  try {
    sugestoes = (JSON.parse(jsonMatch[0]) as { sugestoes: SugestaoIA[] }).sugestoes ?? [];
  } catch {
    return { criadas: 0, erro: "JSON inválido do agente" };
  }
  if (!sugestoes.length) return { criadas: 0, erro: "agente não gerou sugestões" };

  // Logo do onboarding (se existir) entra automaticamente no topo dos cards
  const { data: logoRow } = await admin
    .from("arquivos_franqueada")
    .select("url_storage")
    .eq("franqueada_id", params.franqueadaId)
    .eq("tipo", "logo_principal")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const brand: BrandGuidelines = {
    nomeMarca: f.instagram_handle || f.nome_comercial || f.nome_completo || "",
    corPrimariaHex: f.cor_primaria_hex || "#2F5D50",
    logoUrl: (logoRow as { url_storage?: string } | null)?.url_storage ?? undefined,
  };

  // 3. Renderiza artes + salva
  let ordem = 0;
  let criadas = 0;
  for (const s of sugestoes) {
    ordem++;
    const artes: Array<{ url: string; path?: string; slide: number }> = [];
    try {
      if (s.tipo === "feed_imagem" && s.receita_slug) {
        // Post de receita: foto REAL da biblioteca + título + condição
        const receita = receitas.find((r) => r.slug === s.receita_slug);
        if (receita) {
          try {
            const res = await fetch(receita.url, { signal: AbortSignal.timeout(15000) });
            if (res.ok) {
              const fotoBuffer = Buffer.from(await res.arrayBuffer());
              const buffer = await renderReceita({
                dimensoes: "1080x1350",
                brand,
                fotoBuffer,
                titulo: receita.titulo,
                condicao: s.condicao,
                eyebrow: "receita terapêutica",
              });
              const path = `${params.franqueadaId}/ai-image/${Date.now()}_receita.png`;
              const { error: upErr } = await admin.storage
                .from("franqueadas-assets")
                .upload(path, buffer, { contentType: "image/png", upsert: false });
              if (!upErr) {
                const { data: signed } = await admin.storage
                  .from("franqueadas-assets")
                  .createSignedUrl(path, 365 * 24 * 60 * 60);
                artes.push({ url: signed?.signedUrl ?? path, path, slide: 1 });
              }
            }
          } catch {
            // foto indisponível — sugestão vale pela copy
          }
        }
      } else if (s.tipo === "feed_imagem") {
        const conteudo: ConteudoPeca = {
          headline: s.headline,
          eyebrow: s.eyebrow,
          subtitle: s.subtitle,
          cta: s.cta_card,
        };
        const ILUSTRACOES_VALIDAS = ["mulher","folhas","ramo","laranja","cha","cafe","suco","coracao","intestino","dna","celulas","microbiota","exame","estetoscopio","lupa","balanca","prato","salada","maca","abacate","uvas","morango","cereais","leguminosas","peixe","ovo"];
        if (s.ilustracao && ILUSTRACOES_VALIDAS.includes(s.ilustracao)) {
          // Layout editorial com ilustração em traço (zero custo de IA)
          const buffer = await renderCard({
            layout: "editorial",
            dimensoes: "1080x1080",
            brand,
            conteudo,
            ilustracao: s.ilustracao as IlustracaoId,
          });
          const path = `${params.franqueadaId}/ai-image/${Date.now()}_editorial.png`;
          const { error: upErr } = await admin.storage
            .from("franqueadas-assets")
            .upload(path, buffer, { contentType: "image/png", upsert: false });
          if (!upErr) {
            const { data: signed } = await admin.storage
              .from("franqueadas-assets")
              .createSignedUrl(path, 365 * 24 * 60 * 60);
            artes.push({ url: signed?.signedUrl ?? path, path, slide: 1 });
          }
        } else {
          const r = await gerarEUploadImagem({
            franqueadaId: params.franqueadaId,
            tipo: "feed_imagem",
            brand,
            conteudo,
            // card com tirinha de foto gerada por IA no topo; se a foto
            // falhar, sai o card tipográfico puro (nunca quebra)
            estilo: "design_foto",
          });
          artes.push({ url: r.url, path: r.path, slide: 1 });
        }
      } else if (s.tipo === "feed_carrossel" && s.slides?.length) {
        const slides: ConteudoPeca[] = s.slides.map((sl) => ({
          headline: sl.headline,
          corpo: sl.corpo,
          subtitle: sl.subtitle,
          cta: sl.cta,
          eyebrow: s.eyebrow,
        }));
        const r = await gerarCarrosselEUpload({
          franqueadaId: params.franqueadaId,
          brand,
          slides,
        });
        r.urls.forEach((url, i) => artes.push({ url, slide: i + 1 }));
      }
      // reel: sem arte — o produto é o roteiro/teleprompter
    } catch {
      // arte falhou → sugestão ainda vale (copy + roteiro); artes fica vazio
    }

    const teleprompter =
      s.roteiro
        ? [s.roteiro.hook, ...s.roteiro.blocos, s.roteiro.cta].join("\n\n")
        : null;

    const { error: insErr } = await admin.from("sugestoes_conteudo").insert({
      franqueada_id: params.franqueadaId,
      semana_ref: params.semanaRef,
      ordem,
      tipo: s.tipo,
      tema: s.tema,
      gatilho_pauta: s.gatilho_pauta,
      copy_legenda: s.copy_legenda,
      hashtags: (s.hashtags ?? []).concat(f.hashtags_favoritas ?? []).slice(0, 20),
      roteiro: s.roteiro ? { ...s.roteiro, teleprompter } : null,
      artes,
    } as never); // tabela nova — fora dos types gerados do Supabase
    if (!insErr) criadas++;
  }

  if (criadas > 0 && pedidos.length) {
    await admin
      .from("briefings_franqueada")
      .update({ status: "usado", usado_em: new Date().toISOString() } as never)
      .in("id", pedidos.map((p) => p.id));
  }

  return { criadas };
}
