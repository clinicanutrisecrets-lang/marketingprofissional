import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarEUploadImagem, gerarCarrosselEUpload } from "@/lib/ai-image/render";
import { buscarPautasQuentes } from "./trends";
import { renderCard, renderReceita, type IlustracaoId } from "@scanner/ai-image";
import type { BrandGuidelines, ConteudoPeca, EstiloCapa } from "@scanner/ai-image";

const MODEL = "claude-sonnet-4-5";

/**
 * Monta o texto do card a partir da sugestão, com rede de segurança.
 *
 * 🔴 Por que existe (Juliana, 12/08): duas artes de feed saíram com logo, foto
 * e @ — e NENHUM texto. O renderizador estava certo (conferido com a cor da
 * marca dela); o que faltou foi o `headline`, que o agente simplesmente não
 * preencheu naquela resposta. Como o `tema` sempre vem (aparece certinho na
 * tela), ele serve de origem: melhor um título derivado do tema do que uma
 * arte muda.
 *
 * Devolve null quando não há absolutamente nada pra escrever — aí quem chama
 * não gera arte nenhuma.
 */
function conteudoDoCard(s: {
  headline?: string;
  eyebrow?: string;
  subtitle?: string;
  cta_card?: string;
  tema?: string;
  copy_legenda?: string;
}): ConteudoPeca | null {
  const limpo = (v?: string) => (v ?? "").trim();

  let headline = limpo(s.headline);
  if (!headline) {
    // O tema costuma vir como "Assunto — explicação"; a primeira parte é o
    // título natural. Sem o separador, corta na frase.
    const tema = limpo(s.tema);
    headline = (tema.split(/\s+[—–-]\s+/)[0] || tema).split(/(?<=[.!?])\s/)[0] || tema;
    if (headline.length > 95) headline = `${headline.slice(0, 92).trimEnd()}…`;
  }
  if (!headline) return null;

  let subtitle = limpo(s.subtitle);
  if (!subtitle) {
    // Primeira frase da legenda — já está no tom da nutri.
    const primeira = limpo(s.copy_legenda).split(/\n/)[0] ?? "";
    if (primeira && primeira.length <= 160 && primeira !== headline) subtitle = primeira;
  }

  return {
    headline,
    eyebrow: limpo(s.eyebrow) || undefined,
    subtitle: subtitle || undefined,
    cta: limpo(s.cta_card) || undefined,
  };
}

/**
 * Estúdio de Conteúdo — gera o pacote semanal de sugestões prontas:
 * pauta puxada de notícias quentes do nicho + arte pronta pra baixar +
 * legenda pra copiar + roteiro de reel com teleprompter.
 *
 * A nutri não precisa de aprovação da Meta pra NADA disso: baixa a arte,
 * copia a legenda, grava o reel lendo o teleprompter e posta ela mesma.
 */

type SugestaoIA = {
  tipo: "feed_imagem" | "feed_carrossel" | "reel" | "story";
  tema: string;
  gatilho_pauta: string;
  eyebrow: string;
  headline: string;
  subtitle?: string;
  cta_card?: string;
  slides?: Array<{ headline: string; corpo?: string; subtitle?: string; cta?: string }>;
  ilustracao?: string;
  /** Tema EXATO do pedido da nutri que esta sugestão atende (quando atende). */
  atende_pedido?: string;
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

/**
 * Slides do carrossel a partir do que o agente devolveu.
 *
 * Caminho feliz: ele manda `slides` (capa + internos + CTA) e a gente só
 * converte. Rede de segurança: sem `slides`, monta o carrossel a partir da
 * LEGENDA, que sempre vem e já está no tom certo — capa com o título, um slide
 * por parágrafo (no máximo 4) e um último de CTA. Carrossel com texto pronto e
 * arte derivada é infinitamente melhor que carrossel sem arte nenhuma, que é o
 * que a nutri via: um card marcado CARROSSEL sem nada pra postar.
 */
function slidesDoCarrossel(s: SugestaoIA): ConteudoPeca[] {
  const limpo = (v?: string) => (v ?? "").trim();

  const doAgente = (s.slides ?? [])
    .map((sl) => ({
      headline: limpo(sl.headline),
      corpo: limpo(sl.corpo) || undefined,
      subtitle: limpo(sl.subtitle) || undefined,
      cta: limpo(sl.cta) || undefined,
      eyebrow: limpo(s.eyebrow) || undefined,
    }))
    .filter((sl) => sl.headline || sl.corpo);
  if (doAgente.length) return doAgente;

  const capa = conteudoDoCard(s);
  if (!capa) return [];

  const paragrafos = limpo(s.copy_legenda)
    .split(/\n{1,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25 && !p.startsWith("#"))
    .slice(0, 4);
  if (!paragrafos.length) return [];

  const eyebrow = limpo(s.eyebrow) || undefined;
  return [
    { ...capa, eyebrow },
    ...paragrafos.map((p) => ({ headline: "", corpo: p, eyebrow })),
    {
      headline: limpo(s.cta_card) || "Quer investigar isso com precisão?",
      corpo: "Me chama no direct.",
      eyebrow,
    },
  ];
}


const SYSTEM = `
Você é diretor de conteúdo de uma agência premium especializada em PROFISSIONAIS DE SAÚDE INTEGRATIVA de alto ticket (nutricionistas, médicos, biomédicos, farmacêuticos — tratamentos de R$ 3.000 a R$ 7.500 com testes nutrigenéticos e de microbiota).

REGRA DE NEUTRALIDADE PROFISSIONAL: NUNCA presuma nem escreva a profissão no conteúdo (nada de "sua nutricionista", "a nutri", "seu médico"). Use formulações neutras: "o profissional que te acompanha", "na consulta", "quem te acompanha", ou simplesmente fale em primeira pessoa ("eu investigo", "no meu consultório").

MISSÃO: transformar notícias quentes + nicho da profissional em um calendário semanal de posts com potencial viral E profundidade técnica de autoridade.

LINHA EDITORIAL OBRIGATÓRIA (o pano de fundo de TODO conteúdo):
- O objetivo estratégico é AUMENTAR A CONSCIÊNCIA do público sobre NUTRIGENÉTICA (prioridade nº 1), microbiota intestinal e saúde integrativa — porque em algum momento essas pessoas vão comprar um teste nutrigenético/de microbiota com a profissional.
- Posicionamento: a profissional é uma "detetive da saúde" — investiga causas com dados (genes, microbiota, exames, sintomas) em vez de dar dieta genérica. Todo post deve reforçar essa mentalidade investigativa.
- Sempre que o tema permitir, conecte o assunto a COMO a genética ou a microbiota explicam a resposta individual ("por que funciona pra uma pessoa e não pra outra").
- CTA das legendas: SEMPRE fechar com convite de investigação, variando a forma. Exemplos do padrão: "Quer investigar sua saúde com precisão? Me chama no direct." / "Quer descobrir o que o seu corpo está tentando te dizer? Link na bio." / "Comente INVESTIGAR que eu te explico como fazemos essa leitura." — sem promessa de resultado (CFN), sempre convite pra conversa no direct ou link na bio.

O SEGREDO DO FORMATO: pegar o assunto que está na mídia e traduzir para a ciência que só um profissional de saúde integrativa de precisão domina (polimorfismos e vias de detoxificação, microbiota, compostos bioativos dos alimentos, marcadores de exame). Isso posiciona quem assina o perfil como AUTORIDADE que conecta o assunto do momento à conduta clínica.

🔴 FILTRO DE NICHO — A REGRA QUE MANDA EM TUDO:
- Toda sugestão DEVE falar com o "nicho_principal" e o "publico_alvo_descricao" do input. Antes de escrever, pergunte: "a pessoa que segue este perfil se reconhece neste post?". Se a resposta for não, o post NÃO ENTRA.
- Manchete em alta que não tem ponte HONESTA com o nicho é DESCARTADA. Não force a ponte — post fora do assunto queima autoridade e faz a profissional perder confiança na ferramenta.
- Exemplos reais do que NÃO fazer (aconteceram, e a profissional reclamou): perfil de saúde hormonal feminina recebeu post sobre câncer colorretal e sugestão sobre medicação de emagrecimento/GLP-1. Os dois estavam em alta na mídia; nenhum dos dois pertencia àquele perfil.
- Prefira ENTREGAR MENOS: 4 sugestões certeiras valem mais que 6 com duas fora do assunto. Se faltar manchete adequada, tire o tema do repertório permanente do nicho (fisiologia, ciclo, exames, microbiota, genes) em vez de importar assunto alheio.

REGRAS DE COMPLIANCE (normas dos conselhos de saúde — CFN/CFM/CFF — INEGOCIÁVEL):
- ZERO promessa de cura, prevenção garantida ou resultado
- ZERO "antes e depois", ZERO prazo de resultado
- Notícia sobre doença → tom informativo-epidemiológico + convite neutro pra conversar com quem acompanha a pessoa
- Sempre ciência com referência implícita ("estudos associam", "a literatura sugere")
- Nada de diagnóstico pela rede social

ESTRUTURA IHC — IDENTIFICAÇÃO → HISTÓRIA → CONTEÚDO (vale pra legenda, pro carrossel e pro roteiro de reel):
As pessoas se conectam com história ANTES de aceitar ensinamento. Post que começa ensinando é lido como aula; post que começa reconhecendo é lido como conversa. Então, nesta ordem:
1. IDENTIFICAÇÃO — comece por um momento de reconhecimento imediato: uma dor, um desejo ou uma cena específica do público-alvo, escrita com as palavras que a própria pessoa usaria. O objetivo é provocar o "sim, sou eu". Nada de dado ou definição na abertura.
   🔴 E ela precisa FUNCIONAR SEM CONTEXTO: escreva pensando em quem NUNCA VIU este perfil. Gancho que só faz sentido pra quem já segue prende o post na bolha de quem já chegou — e é justamente quem ainda não conhece a profissional que precisa ser alcançado. Então a abertura:
     - faz sentido sozinha, sem depender de post anterior, de série ("parte 2"), de bordão interno ou de saber quem está falando;
     - não depende de autoridade prévia — nada de "como eu sempre digo", "vocês pediram", "quem me acompanha sabe";
     - promete algo ESPECÍFICO e OBSERVÁVEL, que a pessoa consegue conferir na própria vida, nos primeiros 2 segundos;
     - cabe em até 15 palavras.
   Específico é "seu exame veio normal e você continua cansada". Sensacionalista é "o segredo que ninguém te conta" — esse NÃO serve: é isca, e queima a autoridade da profissional. Nada de promessa de resultado nem número de alcance.
2. HISTÓRIA — valide o sentimento com uma narrativa curta que tenha começo (problema), meio (a tentativa que não deu certo) e fim (a descoberta). Foque no obstáculo e na emoção, não no resultado.
   🔴 A HISTÓRIA É SEMPRE DE CONSULTÓRIO OU DE ARQUÉTIPO, NUNCA AUTOBIOGRÁFICA. Você não sabe nada da vida de quem assina o perfil — inventar "quando eu tive", "minha mãe", "eu também passei por isso" faz a profissional publicar uma história que nunca aconteceu, e ela vai ser perguntada sobre isso. Escreva no padrão "chega no consultório uma mulher de 34 anos que...", "é o caso mais comum que eu vejo:", "imagina a cena:".
   🔴 NUNCA use nome de paciente, nem inicial, nem detalhe que identifique alguém. Nada de idade + cidade + profissão juntos. Nada de resultado numérico prometido ("perdeu 12kg").
3. CONTEÚDO — só agora o valor prático, e SEMPRE amarrado explicitamente à história ("foi exatamente isso que aconteceu com ela:"). Ensino simples, direto e acionável. Feche oferecendo uma transformação clara de estado — de onde a pessoa está para onde ela pode chegar, e por qual caminho de investigação.

COPY DE LEGENDA:
- Primeira linha = gancho de identificação (máx. 15 palavras) — para o dedo parar
- Corpo escaneável (frases curtas, quebras de linha) seguindo o IHC acima
- CTA de investigação no fim (direct/link na bio), sem promessa de resultado
- 80 a 150 palavras

ROTEIRO DE REEL (para teleprompter) — segue o IHC:
- hook: primeiras 2 frases faladas (3s, decisivas) = a IDENTIFICAÇÃO, máx. 15 palavras
- blocos: 3 a 5 blocos de fala natural e curta (como se falasse com uma amiga), total 30-60s. Os primeiros blocos são a HISTÓRIA (de consultório, sem nome); os últimos são o CONTEÚDO, amarrado à história
- linguagem falada, sem jargão não explicado (explique termos técnicos de forma lúdica)
- cta: convite final
- dicas: 2-3 dicas de gravação (enquadramento, energia, b-roll)

CARDS (arte tipográfica premium — sem foto):
- eyebrow: categoria curta (2-3 palavras)
- headline: frase de impacto, 6 a 12 palavras — é o texto GIGANTE da arte
- subtitle: complemento de 1-2 frases (opcional)
- cta_card: frase manuscrita curta tipo "salva esse post" (opcional)
- CARROSSEL: toda sugestão de tipo "feed_carrossel" DEVE trazer o campo "slides" — sem ele não existe arte pra postar, e o post não serve pra nada. Formato EXATO, 4 a 6 posições:
  "slides": [
    {"headline": "Capa: a frase forte que para o dedo"},
    {"headline": "Título curto do slide", "corpo": "2-3 parágrafos curtos, um por linha."},
    {"headline": "Título curto do slide", "corpo": "..."},
    {"headline": "Fecho", "cta": "Convite de investigação"}
  ]
  Slide 1 = capa (só headline). Slides internos = headline curta + corpo. Último = CTA.
  Os slides seguem o IHC: capa = IDENTIFICAÇÃO (o "sim, sou eu"); slides 2 e 3 = HISTÓRIA de consultório, sem nome; slides seguintes = CONTEÚDO amarrado à história; último = convite de investigação.
- Para 1 dos 2 feed_imagem, defina "ilustracao" com UMA opção que combine com o tema: mulher | folhas | ramo | laranja | cha | cafe | suco | coracao | intestino | dna | celulas | microbiota | exame | estetoscopio | lupa | balanca | prato | salada | maca | abacate | uvas | morango | cereais | leguminosas | peixe | ovo — vira um layout editorial elegante com desenho em traço. O outro feed_imagem fica sem "ilustracao".

PEDIDOS DA NUTRI (quando o input trouxer "pedidos_da_nutri"):
- São temas que a própria pessoa dona do perfil pediu — TÊM PRIORIDADE MÁXIMA sobre as manchetes.
- Use cada pedido como base de uma sugestão (respeitando o formato preferido quando indicado).
- Na sugestão que nasceu de um pedido, devolva o campo "atende_pedido" com o TEMA EXATO do pedido, copiado sem alterar uma letra. É por esse campo que o sistema sabe qual pedido já foi entregue — pedido sem sugestão correspondente volta pra fila da próxima semana em vez de sumir.

RECEITAS TERAPÊUTICAS (quando o input trouxer "receitas_disponiveis"):
- Escolha UMA receita que converse com o nicho e as pautas da semana e crie uma sugestão EXTRA de tipo feed_imagem com:
  - "receita_slug": o slug exato da receita escolhida
  - "condicao": complemento curto tipo "para quem tem Hashimoto" (adequado ao nicho)
  - "copy_legenda": explique POR QUE a receita ajuda naquela condição, citando 1-2 genes relevantes, o papel da microbiota e os sintomas que ela apoia — didático, lúdico e CFN-compliant (nada de "cura" ou prescrição). Feche com o CTA investigativo padrão (direct/link na bio pra investigar a saúde com precisão).
  - headline = título da receita (não invente outro)

STORY (sequência de telas do dia — Juliana pediu em 22/08/2026, o pacote não trazia stories):
- 1 sugestão de tipo "story" por semana: NÃO é legenda de feed. É um ROTEIRO DE TELAS (3 a 5), cada tela com 1-2 frases curtas (máx ~140 caracteres por tela), escritas pra caixa de texto do story.
- "copy_legenda" do story = as telas separadas por linha em branco, cada uma prefixada "Tela N:". A última tela é o convite de interação com sticker (enquete, caixa de pergunta ou link) — sem promessa de resultado.
- Preencha também "roteiro": hook = texto da Tela 1; blocos = telas intermediárias; cta = convite da última tela; dicas = 1-2 dicas de sticker/figurinha.
- Story não tem arte renderizada: o produto é o texto pronto pra digitar tela a tela.

Saída: APENAS JSON válido:
{"sugestoes": [SugestaoIA, ...]}
com exatamente: 2 feed_imagem, 1 feed_carrossel, 2 reel, 1 story — e +1 feed_imagem de receita quando houver receitas disponíveis.
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
      "id, nome_comercial, nome_completo, instagram_handle, nicho_principal, nicho_secundario, publico_alvo_descricao, tom_comunicacao, palavras_evitar, palavras_chave_usar, hashtags_favoritas, cor_primaria_hex, valor_consulta_inicial, diferenciais, estilo_capa",
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
    // 6 sugestões, uma delas um carrossel de até 6 slides com parágrafos —
    // 8000 tokens ficava perto do teto, e resposta cortada some com campos
    // (foi um dos suspeitos das artes sem texto). Folga custa pouco.
    max_tokens: 16000,
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
      } else if (s.tipo === "feed_imagem" && !conteudoDoCard(s)) {
        // Sem título nenhum, nem derivado do tema: NÃO renderiza. Card com
        // logo, foto e @ e zero texto parece defeito — pior que a sugestão sem
        // arte, que pelo menos entrega a legenda pronta. (Foi exatamente isso
        // que a Juliana recebeu em 12/08: só a foto do abacate.)
        console.error(
          "[gerador-sugestoes] sugestão sem texto de card — arte não gerada",
          { franqueadaId: params.franqueadaId, tema: s.tema },
        );
      } else if (s.tipo === "feed_imagem") {
        const conteudo = conteudoDoCard(s)!;
        const ILUSTRACOES_VALIDAS =["mulher","folhas","ramo","laranja","cha","cafe","suco","coracao","intestino","dna","celulas","microbiota","exame","estetoscopio","lupa","balanca","prato","salada","maca","abacate","uvas","morango","cereais","leguminosas","peixe","ovo"];
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
      } else if (s.tipo === "feed_carrossel") {
        // 🔴 Antes: `&& s.slides?.length`. Quando o agente devolvia um carrossel
        // SEM o array `slides`, a condição era falsa, o bloco inteiro era
        // pulado em silêncio e a sugestão entrava no banco marcada CARROSSEL e
        // com zero arte — foi o que a Juliana recebeu em 15/08 (os 3 carrosséis
        // dela gravados em menos de 1 segundo, sem nenhum render). O contrato
        // do JSON não declarava o formato de `slides`, então o modelo às vezes
        // mandava e às vezes não; o prompt agora declara, e aqui existe rede:
        // sem slides, a legenda vira o carrossel.
        const slides: ConteudoPeca[] = slidesDoCarrossel(s);
        if (!slides.length) {
          console.error(
            "[gerador-sugestoes] carrossel sem slides e sem legenda aproveitável — arte não gerada",
            { franqueadaId: params.franqueadaId, tema: s.tema },
          );
        }
        if (slides.length) {
          const r = await gerarCarrosselEUpload({
            franqueadaId: params.franqueadaId,
            brand,
            slides,
            // Escolha da profissional em Meu perfil → estilo da capa.
            capaEstilo: ((f as { estilo_capa?: string | null }).estilo_capa as EstiloCapa | null) ?? undefined,
          });
          r.urls.forEach((url, i) => artes.push({ url, slide: i + 1 }));
        }
      }
      // reel: sem arte — o produto é o roteiro/teleprompter
    } catch (err) {
      // Arte falhou → a sugestão ainda vale (copy + roteiro), mas o motivo NÃO
      // pode sumir: era um catch mudo, e por isso "carrossel sem imagem" ficou
      // sem explicação por dias.
      console.error("[gerador-sugestoes] render da arte falhou", {
        franqueadaId: params.franqueadaId, tipo: s.tipo, tema: s.tema,
        erro: err instanceof Error ? err.message : String(err),
      });
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

  // 🔴 Marca como "usado" SÓ o pedido que virou sugestão de fato.
  // Antes, bastava `criadas > 0` pra carimbar TODOS: se o agente aproveitasse
  // 3 dos 5 temas pedidos, os outros 2 sumiam da fila sem nunca virar post — e
  // a nutri via "Usado" num tema que não recebeu. Agora o pedido não atendido
  // continua pendente e entra no pacote da semana seguinte.
  // Também grava `semana_alvo`: a coluna existia e nunca era preenchida, então
  // a tela dizia "Usado em 15/08" sem contar EM QUE PACOTE o tema saiu — foi
  // exatamente a dúvida da Juliana ("será que é porque ainda não tá pronto?").
  if (criadas > 0 && pedidos.length) {
    const atendidos = new Set(
      sugestoes
        .map((s) => (s.atende_pedido ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
    const idsAtendidos = atendidos.size
      ? pedidos.filter((p) => atendidos.has((p.tema ?? "").trim().toLowerCase())).map((p) => p.id)
      : // Sem nenhuma atribuição (modelo ignorou o campo): mantém o
        // comportamento antigo pra não deixar pedido preso na fila pra sempre.
        pedidos.map((p) => p.id);
    if (!atendidos.size) {
      console.error(
        "[gerador-sugestoes] agente não devolveu `atende_pedido` — marcando todos os pedidos como usados",
        { franqueadaId: params.franqueadaId, pedidos: pedidos.length },
      );
    }
    if (idsAtendidos.length) {
      await admin
        .from("briefings_franqueada")
        .update({
          status: "usado",
          usado_em: new Date().toISOString(),
          semana_alvo: params.semanaRef,
        } as never)
        .in("id", idsAtendidos);
    }
  }

  return { criadas };
}
