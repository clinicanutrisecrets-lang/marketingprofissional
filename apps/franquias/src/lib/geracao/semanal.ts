"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { gerarPost, type SlotSemana } from "@/lib/claude/generate";
import { planoDaJornada } from "@/lib/geracao/jornada";
import { enfileirarVideoDoReel } from "@/lib/corte/video-do-reel-db";
import { assuntosVisuais } from "@/lib/corte/video-do-reel";
import { fotoDoKit } from "@/lib/geracao/foto-kit";
import { produzirReelAnimado, type FranqueadaReel } from "@/lib/conteudo/reel-animado";
import { diaDoReelAnimado, temaDoReelAnimado } from "@/lib/geracao/reel-animado-semanal";
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
import { destinoDoRender, formatoPedido } from "@/lib/criativo/destino";
import { gerarEUploadImagem, gerarCarrosselEUpload, gerarCarrosselEditorialEUpload } from "@/lib/ai-image/render";
import { slidesDaConsulta, fotoDaConsultaUrl, FOTOS_COLETA, nomeDaConsulta } from "@/lib/geracao/consulta-teste";
import { descreverEGravarFoto } from "@/lib/arquivos/descrever-foto";
const FOTOS_COLETA_NOMES = new Set<string>(FOTOS_COLETA);
import type { ConteudoPeca, EstiloCapa } from "@scanner/ai-image";
import {
  conteudoDaArteUnica,
  slidesDoCarrosselSemanal,
} from "@/lib/geracao/carrossel-semanal";
import { escolherVideoParaPost } from "@/lib/videos/actions";
import {
  buscarDatasProximas,
  filtrarPorNicho,
} from "@/lib/tendencias/datas-comemorativas";
import { listarTendenciasDoDia } from "@/lib/tendencias/orquestrar";
import { aplicarTemaEmAlta, escolherTemaEmAlta } from "@/lib/geracao/tema-em-alta";
import {
  buscarBriefingsPendentes,
  marcarBriefingUsado,
  type Briefing,
} from "@/lib/briefings/actions";
import {
  logarCusto,
  CUSTO_BANNERBEAR_RENDER_USD,
  CUSTO_CREATOMATE_RENDER_USD,
} from "@/lib/custos/log";
import { carregarProdutosContexto } from "@/lib/produtos/contexto";
import { produtosDaEstrategia } from "@/lib/produtos/foco";
import { carregarPublicoContexto } from "@/lib/publico/sync";
import { roteiroDoReelGerado } from "@/lib/geracao/roteiro-reels";
import { brandDaFranqueada } from "@/lib/ai-image/brand";
import { montarSinergiaDaSemana } from "@/lib/geracao/sinergia-da-semana";
import { cardDeSinergiaSemArte } from "@/lib/geracao/sinergia";
import { montarPostFixoDaSemana } from "@/lib/geracao/post-fixo-da-semana";
import { montarFabricaDaSemana } from "@/lib/geracao/fabrica-da-semana";
import { montarVideoMarcaDaSemana } from "@/lib/geracao/video-marca-da-semana";
import { diaDoVideoMarca } from "@/lib/geracao/video-marca-semana";
import {
  TIPOS_FOTO_BANCO,
  caminhoNoBucket,
  filaDaSemana,
  tipoLevaFotoDoBanco,
  melhorFotoParaTexto,
  focoDaFoto,
  precisaLeituraAutomatica,
  type FotoDoBanco,
  type FotoComAssuntos,
  type AssuntoFoto,
} from "./fotos-banco";
import { buscarArquivoUrl } from "@/lib/arquivos/url-asset";
import { mensagemSemanaJaMontada } from "@/lib/aprovacao/semana";
import { revalidatePath } from "next/cache";
import { CLAUDE_MODEL_COPY } from "@/lib/claude/client";
import {
  validarPreferenciasScanner,
  dataDaSemana,
  aplicarDataComemorativa,
  frequenciaReelsComVideo,
} from "@/lib/geracao/preferencias-scanner";
import { escreverStoriesFalados } from "@/lib/geracao/stories-falados-gerar";
import { PAPEIS_STORIES } from "@/lib/geracao/stories-falados";
import { revisarCopy, resumoRevisao } from "@/lib/claude/revisor-copy";
import { revisarArte, registrarRevisaoArte } from "@/lib/revisor-arte/revisar";
import { semAbreviacaoFundo } from "@/lib/texto/sem-abreviacao";

const MODELO_CLAUDE_DEFAULT = CLAUDE_MODEL_COPY;

/**
 * Gera a semana de posts de uma franqueada.
 * - Cria registro em aprovacoes_semanais
 * - Planeja 3-5 posts seguindo preferências dela (dias, frequência)
 * - Para cada post: Claude gera copy → Bannerbear gera criativo → salva em posts_agendados
 * - Status final: 'aguardando_aprovacao' (se aprovacao_modo != 'automatico_total')
 *
 * Chamada: semanalmente via cron (a partir de 2ª feira 06:00), ou manualmente pelo admin.
 */
export type ResultadoGeracaoSemana = {
  ok: boolean;
  total?: number;
  erro?: string;
  /** Preenchido quando a semana pedida já está montada (não é falha). */
  jaExiste?: { semanaRef: string; status: string | null; posts: number };
};

export async function gerarPostsDaSemana(
  franqueadaId: string,
  semanaRef: string,
): Promise<ResultadoGeracaoSemana> {
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
    const existente = aprovExistente as { id: string; status?: string };
    // 🔴 Conta os posts DE VERDADE. A coluna `total_posts` fica em 0 em quase
    // toda linha, e a linha da aprovação nasce ANTES dos posts — então uma
    // geração que falhou no meio deixa uma aprovação sem post nenhum, e era
    // ela que travava a semana pra sempre: a tela mostrava o estado vazio e
    // todo clique em "montar a semana" voltava "já existe aprovação" (caso da
    // Juliana, carcaça de 17/08 bloqueando desde o onboarding dela).
    const { count: postsExistentes } = await admin
      .from("posts_agendados")
      .select("id", { count: "exact", head: true })
      .eq("aprovacao_semanal_id", existente.id);

    if ((postsExistentes ?? 0) > 0) {
      return {
        ok: false,
        erro: mensagemSemanaJaMontada({
          semanaRef,
          status: existente.status ?? null,
          posts: postsExistentes ?? 0,
        }),
        jaExiste: {
          semanaRef,
          status: existente.status ?? null,
          posts: postsExistentes ?? 0,
        },
      };
    }

    // Aprovação vazia é resíduo, não semana: sai da frente e a geração segue.
    await admin.from("aprovacoes_semanais").delete().eq("id", existente.id);
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

  const contexto = toContexto(franqueada);
  // Produtos reais do Scanner Tratamentos entram no system prompt — copy
  // pode citar produto/preço/link verdadeiros (nunca inventados)
  // Estratégia da semana: produto é SÓ o teste nutrigenético e o epigenético
  // (Aline, 02/10/2026, todas as contas). Os outros produtos dela ficam pro
  // "Posts de venda", feito à mão. Sem nenhum dos dois no catálogo, o slot de
  // produto vira autoridade (temProdutos abaixo), como já era sem catálogo.
  contexto.produtos = produtosDaEstrategia(
    await carregarProdutosContexto(admin, franqueadaId),
  );
  // O público declarado é FRONTEIRA da copy: as queixas dela são o único
  // vocabulário de dor permitido e "não atende" é proibição. null = não
  // respondeu, e aí a copy segue como sempre, sem restrição inventada.
  contexto.publico = await carregarPublicoContexto(admin, franqueadaId);

  // 4. Planeja a semana
  // O catálogo é carregado ANTES de propósito: sem produto ativo o plano
  // pula o ângulo de divulgação (senão o modelo inventaria a oferta).
  // A Jornada até o Teste (Aline, 02/10/2026): a semana tem uma ESTRATÉGIA
  // (todos os níveis de consciência, o ciclo de 4 semanas gira a variante)
  // e cada post um PAPEL nela. As queixas do questionário dela
  // são o assunto; sem elas, o nicho. Mesmas regras de formato e de frequência
  // do planejarSemana antigo (no máximo 1 comercial, reel/carrossel/stories).
  // Busca inteligencia pra enriquecer os posts: datas comemorativas (14 dias a frente) + trends do dia
  const nicho = (franqueada.nicho_principal as string) ?? "saude_integrativa";
  const [datasRaw, tendencias] = await Promise.all([
    buscarDatasProximas(14, new Date(semanaRef)),
    // O nicho da franqueada, não um fixo: era o segundo lugar (junto do
    // TendenciasCard) onde "saude_integrativa" estava escrito na mão e o
    // radar de outra especialidade entrava no prompt dos posts dela.
    listarTendenciasDoDia(nicho, 5),
  ]);
  const datasComemorativas = filtrarPorNicho(datasRaw, nicho);

  // As respostas que ela deu no Scanner (grava vídeos? / data comemorativa),
  // espelhadas pelo sync do público. Torto ou ausente = não respondeu.
  const prefsScanner = validarPreferenciasScanner(franqueada.preferencias_scanner);
  const { estrategia, slots: planoBase } = planoDaJornada({
    diasPostSemana: (franqueada.dias_post_semana as number[]) ?? [1, 3, 5],
    // Quem grava vídeos ganha ao menos um reel de câmera com roteiro.
    frequenciaReels: frequenciaReelsComVideo(franqueada.frequencia_reels as string | null, prefsScanner?.grava_videos ?? null),
    frequenciaStories: (franqueada.frequencia_stories as string) ?? "diario",
    semanaRef,
    produtos: (contexto.produtos ?? []).map((pr) => ({
      nome: pr.nome,
      scanner_produto_id: pr.scanner_produto_id ?? null,
    })),
    queixas: contexto.publico?.queixas ?? null,
    nicho: (franqueada.nicho_principal as string) ?? "saude_integrativa",
  });
  // O tema em alta vira ASSUNTO de um post de conteúdo (Viviane, 06/10/2026:
  // "adorei os temas em alta, mas não vi eles nos posts"). Antes entrava em
  // todos os prompts como "inspiração, não force encaixe" e nunca aparecia.
  const { slots: planoComTema, usado: temaEmAlta } = aplicarTemaEmAlta(
    planoBase,
    escolherTemaEmAlta(tendencias, contexto.publico?.nao_atende ?? null),
  );
  // Data comemorativa que ela escolheu no painel do Scanner (Aline, 15/10/2026):
  // ação especial com a condição DELA, ou só posts com a data.
  const { slots: plano, usada: dataComemorativa } = aplicarDataComemorativa(
    planoComTema,
    dataDaSemana(prefsScanner, semanaRef),
  );
  if (temaEmAlta || dataComemorativa) {
    estrategia.passos = plano.filter((p) => p.tipo !== "stories").map((p) => p.papel);
  }
  {
    const { error: estErr } = await admin
      .from("aprovacoes_semanais")
      .update({ estrategia: estrategia })
      .eq("id", aprovacaoId);
    if (estErr) console.warn("[semanal] estratégia não gravada:", estErr.message);
  }

  // Busca arquivos pra usar nos criativos (logo + foto)
  const logoUrl = await buscarArquivoUrl(admin, franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(admin, franqueadaId, "foto_profissional");

  // "Minhas fotos": a capa do carrossel e o post de feed usam uma foto do
  // banco dela, girando pela semana. Sem foto, a arte segue tipográfica.
  // Falha ao ler ou baixar nunca derruba o pacote: o post sai sem foto.
  const { data: bancoRaw, error: bancoErr } = await admin
    .from("arquivos_franqueada")
    .select("id, url_storage, tipo, assuntos, foco_y, descrito_em, descricao")
    .eq("franqueada_id", franqueadaId)
    .in("tipo", [...TIPOS_FOTO_BANCO])
    .order("criado_em", { ascending: true });
  if (bancoErr) console.warn("[semanal] banco de fotos não lido:", bancoErr.message);
  type FotoBanco = FotoDoBanco & FotoComAssuntos & { descrito_em?: string | null };
  const banco = (bancoRaw ?? []) as FotoBanco[];
  // Foto sem descrição (subida antes de 14/10, ou que estourou o tempo no
  // envio) é descrita agora, uma vez só: no máximo 6 por montagem.
  for (const f of banco.filter((x) => !x.descrito_em && precisaLeituraAutomatica(x.tipo)).slice(0, 6)) {
    const d = await descreverEGravarFoto({ id: f.id, url_storage: f.url_storage, franqueada_id: franqueadaId });
    if (d) Object.assign(f, { assuntos: d.assuntos, foco_y: d.foco_y, descrito_em: new Date().toISOString() });
  }
  const filaFotos = filaDaSemana(banco, semanaRef);
  const fotosUsadas = new Set<string>();
  let posFoto = 0;
  // A foto que entrou na última arte: vai pro post (foto_arte_ref) pra o
  // redesenho com o texto corrigido manter a mesma foto.
  let ultimaFotoRef: string | null = null;
  const baixarDoBanco = async (f: FotoBanco): Promise<Buffer | undefined> => {
    const local = caminhoNoBucket(f.url_storage);
    try {
      if (local) {
        const { data, error } = await admin.storage.from(local.bucket).download(local.path);
        if (!error && data) return Buffer.from(await data.arrayBuffer());
      } else {
        const res = await fetch(f.url_storage, { signal: AbortSignal.timeout(10000) });
        if (res.ok) return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // segue sem
    }
    return undefined;
  };
  /**
   * A foto DELA que combina com o texto (assuntos da foto × assuntos do
   * texto), ainda não usada na semana. null quando nenhuma combina.
   */
  const fotoDelaParaTexto = async (
    texto: string,
    exigir?: AssuntoFoto[],
  ): Promise<{ buf: Buffer; foto: FotoBanco } | null> => {
    const f = melhorFotoParaTexto(banco, texto, fotosUsadas, exigir);
    if (!f) return null;
    const buf = await baixarDoBanco(f);
    if (!buf) return null;
    fotosUsadas.add(f.id);
    return { buf, foto: f };
  };
  const proximaFotoDoBanco = async (texto?: string): Promise<Buffer | undefined> => {
    ultimaFotoRef = null;
    // 1º a foto que combina com o assunto do post; sem nenhuma, o rodízio.
    if (texto) {
      const casada = await fotoDelaParaTexto(texto);
      if (casada) {
        ultimaFotoRef = casada.foto.url_storage;
        return casada.buf;
      }
    }
    for (let tentativa = 0; tentativa < filaFotos.length; tentativa++) {
      const f = filaFotos[posFoto++ % filaFotos.length]!;
      const local = caminhoNoBucket(f.url_storage);
      try {
        if (local) {
          const { data, error } = await admin.storage.from(local.bucket).download(local.path);
          if (!error && data) { ultimaFotoRef = f.url_storage; return Buffer.from(await data.arrayBuffer()); }
        } else {
          const res = await fetch(f.url_storage, { signal: AbortSignal.timeout(10000) });
          if (res.ok) { ultimaFotoRef = f.url_storage; return Buffer.from(await res.arrayBuffer()); }
        }
      } catch {
        // tenta a próxima
      }
      console.warn(`[semanal] foto ${f.id} do banco não baixou; tentando a próxima`);
    }
    return undefined;
  };

  // Monta bloco de contexto extra textual que vai entrar no prompt do Claude
  // (só as datas: o tema em alta já virou assunto de um post, lá no plano).
  const blocoContextoExtra = montarBlocoContextoExtra(datasComemorativas);

  // Briefings antecipados — temas que a nutri pediu durante a semana.
  // Consumidos primeiro, antes do plano automático.
  const briefingsPendentes = await buscarBriefingsPendentes(franqueadaId, 7);
  const planoCasado = casarBriefingsComPlano(plano, briefingsPendentes);

  // 5. Gera cada post (sequencial pra respeitar rate limits)
  let gerados = 0;
  const erros: string[] = [];

  // O que a biblioteca de vídeos mostra: a frase do vídeo curto do reel fala
  // de um desses assuntos, senão não há imagem que combine com ela. Falha ao
  // ler só tira a lista do prompt.
  let blocoAssuntosVisuais = "";
  if (planoCasado.some((i) => i.tipo === "reels")) {
    const [{ data: meusV }, { data: acervoV }] = await Promise.all([
      admin.from("videos_franqueada").select("titulo").eq("franqueada_id", franqueadaId).eq("ativo", true).limit(100),
      admin.from("acervo_videos").select("titulo").eq("ativo", true).limit(200),
    ]);
    const assuntos = assuntosVisuais([...((meusV ?? []) as { titulo: string | null }[]), ...((acervoV ?? []) as { titulo: string | null }[])]);
    if (assuntos.length) {
      blocoAssuntosVisuais = `ASSUNTOS QUE A BIBLIOTECA DE VÍDEOS MOSTRA (a "frase_video" fala de UM deles):\n- ${assuntos.join("\n- ")}`;
    }
  }

  for (const item of planoCasado) {
    try {
      // Pedido da nutri vence a estratégia (é ela trocando o assunto); sem
      // pedido, o post recebe o papel e o material da semana da jornada.
      const contextoBase = item.briefing
        ? montarContextoComBriefing(blocoContextoExtra, item.briefing)
        : [item.instrucao, blocoContextoExtra].filter(Boolean).join("\n\n");
      const contextoComBriefing = item.tipo === "reels" && blocoAssuntosVisuais
        ? `${contextoBase}\n\n${blocoAssuntosVisuais}`
        : contextoBase;

      const tInicio = Date.now();
      // Português por extenso ("está", nunca "tá"): a trava vale antes de
      // qualquer uso do texto (arte, vídeo, legenda, roteiro).
      const post = semAbreviacaoFundo(await gerarPost(
        contexto,
        item.tipo,
        item.angulo,
        semanaRef,
        contextoComBriefing,
        item.consciencia,
      ));
      const latenciaMs = Date.now() - tInicio;

      // O revisor relê a copy PRONTA. Aqui ele só vai pro log: quem decide é a
      // nutri, na tela de aprovação, onde o aviso aparece junto do post e some
      // quando ela corrige. O log é pra sabermos quanto o modelo escorrega, e
      // em qual regra, sem depender de alguém reportar.
      const ctxRevisao = {
        nao_atende: contexto.publico?.nao_atende ?? null,
        palavras_evitar: contexto.palavras_evitar ?? null,
        precos_reais: (contexto.produtos ?? [])
          .map((pr) => pr.preco_texto)
          .filter((v): v is string => !!v),
      };
      const achados = revisarCopy(
        [post.copy_legenda, post.copy_cta].filter(Boolean).join("\n"),
        ctxRevisao,
      );
      if (achados.length > 0) {
        console.warn(
          `[revisor-copy] ${item.tipo}/${item.angulo}: ${resumoRevisao(achados)}`,
        );
      }

      // Registra custo Claude (silent fail se falhar)
      if (post._usage) {
        await logarCusto({
          franqueadaId,
          servico: "claude",
          operacao: "gerar_post",
          modelo: MODELO_CLAUDE_DEFAULT,
          uso: post._usage,
          briefingId: item.briefing?.id ?? null,
          aprovacaoId: aprovacaoId,
          latenciaMs,
          metadata: {
            tipo: item.tipo,
            angulo: item.angulo,
            consciencia: item.consciencia ?? null,
          },
        });
      }

      // Calcula data/hora do post
      const dataHora = calcularDataHora(
        semanaRef,
        item.dia,
        (franqueada.horario_preferido_post as string) ?? "08:00",
      );

      // Gera criativo: prioridade AI-Image (imagens) > Creatomate (video+estático) > Bannerbear
      let urlImagem: string | null = null;
      let urlVideo: string | null = null;
      let urlsSlides: string[] | null = null;
      let designId: string | null = null;
      // O texto desenhado na arte, guardado pra ela poder corrigir depois
      // (tela Aprovar semana). Só existe quando a arte saiu do desenhador
      // tipográfico, que é o que sabe redesenhar.
      let textoArte: ConteudoPeca[] | null = null;
      let fotoArteRef: string | null = null;
      // Pro revisor da arte (lib/revisor-arte): o desenho principal falhou?
      // E o texto da arte do carrossel da consulta, que não vai pra
      // texto_arte (o "Corrigir" redesenharia noutro estilo).
      let desenhoReserva = false;
      let pecasEditorial: ConteudoPeca[] | null = null;
      let editorialComFoto = false;

      // A MESMA marca do post de venda (lib/ai-image/brand.ts): uma fonte.
      const brandArte = brandDaFranqueada(
        franqueada as Parameters<typeof brandDaFranqueada>[0],
        { logoUrl, fotoUrl },
      );

      // 1a. Carrossel: desenhador tipográfico (mesmo estilo do feed e dos
      //     stories, custo zero, sem foto de IA). Antes ele só tinha o
      //     Creatomate, que foi zerado de propósito, e saía sem arte.
      // 1a'. Post de VENDA da consulta (Aline, 14/10/2026): carrossel no
      //      estilo aprovado, com a foto de consulta na capa inteira e as
      //      fotos de coleta e de consulta do Drive nos slides do meio. Falhou,
      //      cai no desenho de sempre logo abaixo.
      if (item.tipo === "feed_carrossel" && item.produto && !item.briefing) {
        try {
          const brutos = (post as { slides?: unknown }).slides;
          const textos = Array.isArray(brutos) ? brutos.map((t) => String(t ?? "")) : [];
          const giro = Math.floor(Date.parse(semanaRef) / (7 * 24 * 60 * 60 * 1000)) || 0;
          const plano = slidesDaConsulta(textos, item.produto, giro);
          if (plano.length >= 2) {
            // Foto DELA primeiro, pelo assunto do slide (Aline, 14/10/2026):
            // capa e slides de consulta pegam a foto de atendimento/consultório
            // dela; o slide da coleta, uma foto dela com o kit. Sem foto dela
            // que combine, vale a do Drive.
            const genetico = item.produto.scanner_produto_id !== "teste_epigenetico";
            const dela = new Map<number, { buf: Buffer; foco?: number }>();
            for (let i = 0; i < plano.length; i++) {
              const x = plano[i]!;
              if (x.tipo === "fecho") continue;
              const texto = [x.titulo, "corpo" in x ? x.corpo : "", "subtitulo" in x ? x.subtitulo : ""].join(" ");
              const ehColeta = x.fotoNome ? FOTOS_COLETA_NOMES.has(x.fotoNome) : false;
              const exigir: AssuntoFoto[] = ehColeta
                ? (genetico ? ["coleta", "kit"] : [])
                : ["atendimento", "consultorio", "profissional", "exame"];
              if (!exigir.length) continue;
              const achada = await fotoDelaParaTexto(i === 0 ? `consulta ${texto}` : texto, exigir);
              if (achada) dela.set(i, { buf: achada.buf, foco: focoDaFoto(achada.foto) });
            }
            const fotos = new Map<string, Buffer>();
            for (const [i, x] of plano.entries()) {
              if (!x.fotoNome || dela.has(i) || fotos.has(x.fotoNome)) continue;
              const b = await baixarFotoPublica(fotoDaConsultaUrl(x.fotoNome));
              if (b) fotos.set(x.fotoNome, b);
            }
            const capa = plano[0]!;
            const slidesEd = plano.map((x, i) => {
              const { fotoNome, ...resto } = x;
              if (resto.tipo !== "meio") return resto;
              const minha = dela.get(i);
              if (minha) {
                const { fotoFocoY: _f, ...semFoco } = resto as typeof resto & { fotoFocoY?: number };
                return { ...semFoco, foto: minha.buf, ...(minha.foco !== undefined ? { fotoFocoY: minha.foco } : {}) };
              }
              if (fotoNome && fotos.has(fotoNome)) return { ...resto, foto: fotos.get(fotoNome) };
              return resto;
            });
            const fotoCapaDela = dela.get(0)?.buf;
            const handle = ((franqueada as { instagram_handle?: string | null }).instagram_handle ?? "").trim();
            const r = await gerarCarrosselEditorialEUpload({
              franqueadaId,
              slides: slidesEd,
              fotoCapa: fotoCapaDela ?? (capa.fotoNome ? fotos.get(capa.fotoNome) : undefined),
              destaqueHex: brandArte.corPrimariaHex,
              fundoFecho: brandArte.corPrimariaHex,
              logoUrl: logoUrl ?? null,
              assinatura: handle ? (handle.startsWith("@") ? handle : `@${handle}`) : undefined,
            });
            if (r.urls.length) {
              urlImagem = r.urls[0]!;
              urlsSlides = r.urls;
              editorialComFoto = !!(fotoCapaDela ?? (capa.fotoNome ? fotos.get(capa.fotoNome) : undefined));
              pecasEditorial = plano.map((x) => ({
                headline: x.titulo,
                ...("subtitulo" in x && x.subtitulo ? { subtitle: x.subtitulo } : {}),
                ...("chamada" in x && x.chamada ? { subtitle: x.chamada } : {}),
                ...("corpo" in x && x.corpo ? { corpo: x.corpo } : {}),
              }));
            } else {
              desenhoReserva = true;
            }
          } else {
            console.warn("[geracao] carrossel da consulta sem texto pra 2 slides; segue no desenho de sempre");
          }
        } catch (edErr) {
          desenhoReserva = true;
          console.warn("[geracao] carrossel da consulta falhou; segue no desenho de sempre:", edErr);
        }
      }

      if (item.tipo === "feed_carrossel" && !urlsSlides) {
        const slides = slidesDoCarrosselSemanal(post);
        if (slides.length >= 2) {
          try {
            // Carrossel do teste genético: a capa mostra o kit.
            const kitCapa = !item.briefing ? await baixarFotoDoKit(item.produto) : null;
            const r = await gerarCarrosselEUpload({
              franqueadaId,
              brand: brandArte,
              slides,
              fotoCapa: kitCapa ? kitCapa.buf : await proximaFotoDoBanco(textoDoPost(post)),
              capaEstilo:
                ((franqueada as { estilo_capa?: string | null }).estilo_capa as EstiloCapa | null) ??
                undefined,
            });
            if (r.urls.length) {
              urlImagem = r.urls[0]!;
              urlsSlides = r.urls;
              textoArte = slides;
              fotoArteRef = kitCapa ? kitCapa.url : ultimaFotoRef;
            }
            await logarCusto({
              franqueadaId,
              // Card desenhado, sem chamada de modelo de imagem: custo zero.
              servico: "outro",
              operacao: "render_carrossel",
              custoUsd: r.meta.custoTotalUsd,
              briefingId: item.briefing?.id ?? null,
              aprovacaoId,
              metadata: { tipo: item.tipo, slides: r.urls.length },
            });
          } catch (carErr) {
            await logarCusto({
              franqueadaId,
              servico: "outro",
              operacao: "render_carrossel",
              sucesso: false,
              erro: (carErr as Error).message,
              briefingId: item.briefing?.id ?? null,
              aprovacaoId,
            });
            console.warn("[geracao] carrossel desenhado falhou:", carErr);
          }
        } else {
          console.warn(`[geracao] carrossel sem texto pra 2 slides (${item.angulo}); segue sem arte`);
        }
      }

      // 1b. Peça única (feed e stories): card desenhado, só título e
      //     subtítulo. Sem selo e sem chamada na arte (a chamada vai na
      //     legenda) — pedido do time em 25/09/2026.
      const podeTentarAiImagem =
        (item.tipo === "feed_imagem" || item.tipo === "stories") &&
        (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

      // Post do teste genético: a foto é a do kit, não a do banco dela.
      const fotoKit = item.tipo === "feed_imagem" && !item.briefing ? await baixarFotoDoKit(item.produto) : null;

      if (podeTentarAiImagem) {
        try {
          const r = await gerarEUploadImagem({
            franqueadaId,
            tipo: item.tipo as "feed_imagem" | "stories",
            brand: brandArte,
            conteudo: conteudoDaArteUnica(post, item.tipo),
            fotoPropria: fotoKit
              ? fotoKit.buf
              : tipoLevaFotoDoBanco(item.tipo) ? await proximaFotoDoBanco(textoDoPost(post)) : undefined,
          });
          urlImagem = r.url;
          textoArte = [conteudoDaArteUnica(post, item.tipo)];
          fotoArteRef = fotoKit ? fotoKit.url : tipoLevaFotoDoBanco(item.tipo) ? ultimaFotoRef : null;
          await logarCusto({
            franqueadaId,
            servico: "gemini",
            operacao: "render_imagem",
            briefingId: item.briefing?.id ?? null,
            aprovacaoId,
            metadata: { tipo: item.tipo },
          });
        } catch (aiErr) {
          await logarCusto({
            franqueadaId,
            servico: "gemini",
            operacao: "render_imagem",
            sucesso: false,
            erro: (aiErr as Error).message,
            briefingId: item.briefing?.id ?? null,
            aprovacaoId,
          });
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
            // 🔴 Pedir o formato é o que evita o problema na origem: sem isso
            // vale o padrão do template, e um template de vídeo configurado
            // pro carrossel devolve MP4 sem ninguém pedir.
            outputFormat: formatoPedido(item.tipo),
            modifications: montarModsCreatomate({
              headline: post.headline,
              subtitle: post.subtitle,
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
            // 🔴 O campo sai do que o Creatomate DEVOLVEU, nunca do tipo que
            // a gente pediu. Decidir pelo pedido foi o que gravou um MP4 em
            // `url_imagem_final` e fez o carrossel da Juliana virar um vídeo
            // de bicicleta (08/09/2026).
            const destino = destinoDoRender(item.tipo, {
              url: ready.url,
              output_format: ready.outputFormat,
              duration: ready.duration,
            });
            if (destino.ok && destino.campo === "video") {
              urlVideo = ready.url;
            } else if (destino.ok) {
              urlImagem = ready.url;
            } else {
              // Recusado: o post segue pro Bannerbear (ou sem criativo). É de
              // propósito — arte faltando a nutri vê; vídeo aleatório posando
              // de arte, não.
              console.warn(
                `[geracao] criativo recusado (${item.tipo}): ${destino.motivo} — ${ready.url}`,
              );
            }
            designId = renders[0].id;
            await logarCusto({
              franqueadaId,
              servico: "creatomate",
              operacao: "render",
              custoUsd: CUSTO_CREATOMATE_RENDER_USD,
              briefingId: item.briefing?.id ?? null,
              aprovacaoId,
              metadata: { tipo: item.tipo, design_id: renders[0].id },
            });
          }
        } catch (e) {
          await logarCusto({
            franqueadaId,
            servico: "creatomate",
            operacao: "render",
            sucesso: false,
            erro: (e as Error).message,
            briefingId: item.briefing?.id ?? null,
            aprovacaoId,
          });
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
              cor_primaria_hex: franqueada.cor_primaria_hex as string,
              logo_url: logoUrl ?? undefined,
              foto_nutri_url: fotoUrl ?? undefined,
            }),
            synchronous: true,
          });
          urlImagem = img.image_url;
          designId = img.uid;
          await logarCusto({
            franqueadaId,
            servico: "bannerbear",
            operacao: "render",
            custoUsd: CUSTO_BANNERBEAR_RENDER_USD,
            briefingId: item.briefing?.id ?? null,
            aprovacaoId,
            metadata: { tipo: item.tipo, design_id: img.uid },
          });
        } catch (bbErr) {
          await logarCusto({
            franqueadaId,
            servico: "bannerbear",
            operacao: "render",
            sucesso: false,
            erro: (bbErr as Error).message,
            briefingId: item.briefing?.id ?? null,
            aprovacaoId,
          });
          console.warn("Bannerbear falhou, seguindo sem criativo:", bbErr);
        }
      }

      // O revisor da ARTE, antes de o post existir pra ela (Aline, 19/10):
      // foto cortada ou texto ilegível → a arte é refeita sem foto; o resto
      // vira aviso no admin. Nunca derruba o post.
      let revisaoArte: Awaited<ReturnType<typeof revisarArte>> | null = null;
      if (urlImagem && (item.tipo === "feed_carrossel" || item.tipo === "feed_imagem" || item.tipo === "stories")) {
        revisaoArte = await revisarArte({
          franqueadaId,
          aprovacaoId,
          tipo: item.tipo,
          urlImagem,
          urlsSlides,
          pecas: textoArte ?? pecasEditorial,
          temFoto: !!fotoArteRef || editorialComFoto,
          desenhoReserva,
          assunto: [post.headline, item.produto ? nomeDaConsulta(item.produto) : ""].filter(Boolean).join(" · "),
          ctx: ctxRevisao,
          brand: brandArte,
          capaEstilo:
            ((franqueada as { estilo_capa?: string | null }).estilo_capa as EstiloCapa | null) ?? undefined,
        });
        if (revisaoArte.acao === "refazer_sem_foto") {
          urlImagem = revisaoArte.urlImagem;
          urlsSlides = revisaoArte.urlsSlides;
          // A arte nova não tem foto: o "Corrigir" não deve buscar a antiga.
          fotoArteRef = null;
        }
      }

      // Salva post
      const { data: postInserted, error: postErr } = await admin
        .from("posts_agendados")
        .insert({
          franqueada_id: franqueadaId,
          aprovacao_semanal_id: aprovacaoId,
          semana_ref: semanaRef,
          tipo_post: item.tipo,
          status: "aguardando_aprovacao",
          origem: item.briefing ? "briefing_antecipado" : "ia_automatico",
          briefing_id: item.briefing?.id ?? null,
          briefing_nutri: item.briefing?.tema ?? null,
          copy_legenda: post.copy_legenda,
          copy_cta: post.copy_cta,
          hashtags: post.hashtags,
          angulo_copy: post.angulo_copy,
          // Nível de consciência de quem esse post mira. Vem do plano, não
          // do que o modelo devolveu: é decisão de estratégia, não de copy.
          nivel_consciencia: item.consciencia ?? null,
          // O que o post faz na semana e o que ela faz no Instagram. Com pedido
          // dela, o papel é o pedido (a estratégia saiu da frente).
          papel_estrategia: item.briefing
            ? `Pedido seu: ${item.briefing.tema}`.slice(0, 300)
            : item.papel,
          lembrete_execucao: item.briefing ? null : (item.lembrete ?? lembreteDaInteracao(item.tipo, post)),
          objecao_dissolvida: item.briefing ? null : (item.objecao ?? null),
          copy_legenda_ia_original: post.copy_legenda,
          copy_cta_ia_original: post.copy_cta,
          hashtags_ia_original: post.hashtags,
          ia_model_usado: MODELO_CLAUDE_DEFAULT,
          ia_tokens_input: post._usage?.input_tokens,
          ia_tokens_output: post._usage?.output_tokens,
          ia_tokens_cached: post._usage?.cache_read_input_tokens,
          bannerbear_design_id: designId,
          url_imagem_final: urlImagem,
          url_video_final: urlVideo,
          // Carrossel: todos os slides, na ordem. O slide 1 também fica em
          // url_imagem_final, então quem só lê esse campo segue igual.
          ...(urlsSlides ? { urls_slides: urlsSlides } : {}),
          // Só vai quando a arte é a do desenhador (Creatomate e Bannerbear
          // não sabem redesenhar com texto novo): sem ele, a tela não oferece
          // "corrigir o texto da arte" pra este post.
          ...(urlImagem && textoArte ? { texto_arte: textoArte, foto_arte_ref: fotoArteRef } : {}),
          // Reels: o roteiro falado vai pro teleprompter da tela Aprovar
          // semana. O modelo sempre escreveu isto e ninguém gravava.
          roteiro_reels: roteiroDoReelGerado(item.tipo, post),
          data_hora_agendada: dataHora,
          legenda_gerada_ia: true,
        })
        .select("id")
        .single();

      if (postErr || !postInserted) {
        erros.push(`${item.angulo}: ${postErr?.message ?? "insert falhou"}`);
      } else {
        gerados += 1;
        if (revisaoArte) {
          await registrarRevisaoArte(admin, {
            ...revisaoArte,
            postId: (postInserted as { id: string }).id,
            franqueadaId,
            semanaRef,
            tipo: item.tipo,
          });
        }
        // Reel da semana: o vídeo curto (gancho sobre um clipe da biblioteca)
        // nasce junto e chega no card quando o worker termina. Best-effort.
        if (item.tipo === "reels") {
          const v = await enfileirarVideoDoReel(admin, {
            franqueadaId,
            email: (franqueada.email as string | null) ?? null,
            postId: (postInserted as { id: string }).id,
            post: { frase: post.frase_video, headline: post.headline, roteiro: post.script_reels },
            assunto: estrategia.queixas,
          });
          if (!v.ok) console.warn(`[semanal] vídeo do reel não enfileirado: ${v.motivo}`);
        }
        if (item.briefing) {
          await marcarBriefingUsado(
            item.briefing.id,
            (postInserted as { id: string }).id,
            semanaRef,
          );
        }
      }
    } catch (e) {
      erros.push(`${item.angulo}: ${(e as Error).message}`);
    }
  }

  // 5b. O reel animado da semana, JUNTO com o de b-roll (Aline, 05/10/2026).
  //     O post nasce com a legenda do mesmo roteiro e recebe o vídeo quando o
  //     worker termina (~5 a 10 min). Best-effort: o pacote nunca falha por ele.
  if ((franqueada.frequencia_reels as string | null) !== "nunca") {
    try {
      const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice();
      const { data: postReel, error: prErr } = await admin
        .from("posts_agendados")
        .insert({
          franqueada_id: franqueadaId,
          aprovacao_semanal_id: aprovacaoId,
          semana_ref: semanaRef,
          tipo_post: "reels",
          status: "aguardando_aprovacao",
          origem: "ia_automatico",
          copy_legenda: "",
          papel_estrategia: "Reel animado: o mecanismo da queixa da semana, do sintoma ao que investigar.",
          data_hora_agendada: calcularDataHora(
            semanaRef,
            diaDoReelAnimado(dias),
            (franqueada.horario_preferido_post as string) ?? "08:00",
          ),
          legenda_gerada_ia: true,
        })
        .select("id")
        .single();
      if (prErr || !postReel) throw new Error(prErr?.message ?? "insert falhou");
      const postId = (postReel as { id: string }).id;
      const r = await produzirReelAnimado(admin, {
        franqueada: franqueada as unknown as FranqueadaReel,
        tema: temaDoReelAnimado(estrategia.queixas, (franqueada.nicho_principal as string) ?? "saude_integrativa"),
        duracao: "60s",
        postId,
        comLegenda: true,
      });
      if (!r.ok || !r.legenda) {
        // Sem roteiro ou sem legenda, o card vazio confundiria: sai inteiro.
        await admin.from("posts_agendados").delete().eq("id", postId);
        console.warn(`[semanal] reel animado não saiu: ${r.ok ? "sem legenda" : r.msg}`);
      } else {
        await admin
          .from("posts_agendados")
          .update({
            copy_legenda: r.legenda.texto,
            copy_cta: r.legenda.cta,
            hashtags: r.legenda.hashtags,
            copy_legenda_ia_original: r.legenda.texto,
            copy_cta_ia_original: r.legenda.cta,
            hashtags_ia_original: r.legenda.hashtags,
          })
          .eq("id", postId);
        gerados += 1;
      }
    } catch (e) {
      console.warn("[semanal] reel animado falhou:", (e as Error).message);
    }
  }

  // 5c. O carrossel de SINERGIA + o trio de stories (lib/geracao/sinergia-da-semana).
  //     Best-effort: o pacote nunca falha por ele.
  {
    const sin = await montarSinergiaDaSemana({
      admin,
      franqueadaId,
      franqueada,
      aprovacaoId,
      semanaRef,
      contexto,
      queixas: estrategia.queixas,
      temaEmAlta,
      logoUrl: logoUrl ?? null,
    });
    if (sin.ok) gerados += sin.gerados;
    else console.warn("[semanal] carrossel de sinergia não saiu:", sin.motivo);
  }

  // 5d. Stories FALADOS (Aline, 15/10/2026): quem disse no Scanner que grava
  //     vídeos ganha uma sequência de 3 stories de 30 s, com roteiro pro
  //     teleprompter. Best-effort: o pacote nunca falha por ela.
  if (prefsScanner?.grava_videos === true) {
    try {
      const r = await escreverStoriesFalados({
        franqueadaId,
        publico: contexto.publico ?? null,
        nicho: (franqueada.nicho_principal as string) ?? null,
        queixas: (estrategia.queixas ?? []).join(", ") || null,
      });
      if (!r.ok) {
        console.warn("[semanal] stories falados não saíram:", r.motivo);
      } else {
        const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice().sort((a, b) => a - b);
        const dia = dias[Math.floor(dias.length / 2)] ?? 3;
        const linhas = r.sequencia.stories.map((st, i) => ({
          franqueada_id: franqueadaId,
          aprovacao_semanal_id: aprovacaoId,
          semana_ref: semanaRef,
          tipo_post: "stories",
          status: "aguardando_aprovacao",
          origem: "ia_automatico",
          copy_legenda: st.texto_na_tela,
          copy_legenda_ia_original: st.texto_na_tela,
          papel_estrategia: `Stories falados ${i + 1} de 3 (${r.sequencia.titulo}). ${PAPEIS_STORIES[i]}.`,
          lembrete_execucao:
            "Grave no celular lendo o roteiro no teleprompter (até 30 segundos). Escreva o texto na tela por cima do vídeo e poste os três em sequência.",
          roteiro_reels: st.fala,
          data_hora_agendada: calcularDataHora(
            semanaRef,
            dia,
            `12:${String(i * 5).padStart(2, "0")}`,
          ),
          ia_model_usado: MODELO_CLAUDE_DEFAULT,
          legenda_gerada_ia: true,
        }));
        const { error: stErr } = await admin.from("posts_agendados").insert(linhas);
        if (stErr) console.warn("[semanal] stories falados não gravados:", stErr.message);
        else gerados += 3;
      }
    } catch (e) {
      console.warn("[semanal] stories falados falharam:", (e as Error).message);
    }
  }

  const usadasFixo = new Set<string>();
  // 5e. O POST FIXO do perfil (lib/geracao/post-fixo.ts, Aline 15/10/2026):
  //     uma vez por conta, na primeira semana montada. Best-effort.
  {
    const fixo = await montarPostFixoDaSemana({
      admin,
      franqueadaId,
      franqueada,
      aprovacaoId,
      semanaRef,
      logoUrl: logoUrl ?? null,
      // Conjunto PRÓPRIO de usadas: o post fixo é o que fica no topo do perfil,
      // então pode repetir uma foto que um post da semana já usou.
      fotoDela: async (assuntos) => {
        const f = melhorFotoParaTexto(banco, "", usadasFixo, assuntos as AssuntoFoto[]);
        if (!f) return null;
        const buf = await baixarDoBanco(f);
        if (buf) usadasFixo.add(f.id);
        return buf ?? null;
      },
    });
    if (fixo.ok) gerados += fixo.gerados;
    else console.warn("[semanal] post fixo do perfil não saiu:", fixo.motivo);
  }

  /**
   * Uma foto dela diferente da do perfil, quando ela subiu mais de uma
   * (Aline 15/10: "ir mesclando diferentes fotos da pessoa ao invés de sempre
   * usar a mesma"). Link assinado de 1 h: quem baixa é o worker.
   */
  const outraFotoDela = async (): Promise<string | null> => {
    const outras = banco.filter((f) => f.url_storage !== fotoUrl);
    const f = melhorFotoParaTexto(filaDaSemana(outras, semanaRef), "", new Set(), ["profissional"]);
    const local = f ? caminhoNoBucket(f.url_storage) : null;
    if (!local) return null;
    const { data } = await admin.storage.from(local.bucket).createSignedUrl(local.path, 3600);
    return data?.signedUrl ?? null;
  };
  // 5f. O 2º post fixo, o carrossel da Fábrica da Saúde (lib/geracao/fabrica.ts),
  //     na semana seguinte à do 1º. Best-effort.
  {
    const fab = await montarFabricaDaSemana({
      admin,
      franqueadaId,
      franqueada,
      aprovacaoId,
      semanaRef,
      logoUrl: logoUrl ?? null,
      fotoUrl: (await outraFotoDela()) ?? fotoUrl ?? null,
    });
    if (fab.ok) gerados += fab.gerados;
    else console.warn("[semanal] carrossel da Fábrica não saiu:", fab.motivo);
  }

  // 5g. O vídeo de MARCA da semana (lib/geracao/video-marca-da-semana.ts,
  //     Aline 16/10/2026): um por semana, só se cabe no tema da semana ou no
  //     nicho dela, sem repetir. Best-effort.
  {
    const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice();
    const vm = await montarVideoMarcaDaSemana({
      admin,
      franqueadaId,
      franqueada,
      aprovacaoId,
      semanaRef,
      dataHora: calcularDataHora(semanaRef, diaDoVideoMarca(dias), (franqueada.horario_preferido_post as string) ?? "08:00"),
      logoUrl: logoUrl ?? null,
      textosDaSemana: [temaEmAlta?.tema, temaEmAlta?.resumo, ...(estrategia.queixas ?? []), ...(estrategia.passos ?? [])],
      textosDoNicho: [
        ((franqueada.nicho_principal as string) ?? "").replace(/_/g, " "),
        (franqueada.publico_alvo_descricao as string) ?? null,
        ...(contexto.publico?.queixas ?? []),
      ],
    });
    if (vm.ok) gerados += vm.gerados;
    else console.warn("[semanal] vídeo de marca da semana não saiu:", vm.motivo);
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
      console.warn("[semanal] email não enviado:", emailErr);
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
 * Refaz SÓ o carrossel de sinergia (+ o trio de stories) de uma semana já
 * montada (Aline, 13/10/2026). Os cards da sinergia que ficaram sem arte
 * saem e entram novos; nada do resto da semana é tocado. Se a sinergia
 * daquela semana já tem arte, nada é refeito.
 */
export async function refazerSinergiaDaSemana(
  franqueadaId: string,
  semanaRef: string,
): Promise<{ ok: true; gerados: number; tirados: number } | { ok: false; erro: string }> {
  const admin = createAdminClient();
  const { data: f, error: fErr } = await admin.from("franqueadas").select("*").eq("id", franqueadaId).maybeSingle();
  if (fErr || !f) return { ok: false, erro: fErr?.message ?? "Conta não encontrada." };
  const franqueada = f as Record<string, unknown>;

  const { data: aprov, error: aErr } = await admin
    .from("aprovacoes_semanais")
    .select("id, status, estrategia")
    .eq("franqueada_id", franqueadaId)
    .eq("semana_ref", semanaRef)
    .maybeSingle();
  if (aErr) return { ok: false, erro: "Não consegui ler a semana. Tente de novo." };
  if (!aprov || (aprov as { status?: string }).status === "recusada") {
    return { ok: false, erro: "Essa semana ainda não foi montada: use o Pacote da semana." };
  }
  const aprovacaoId = (aprov as { id: string }).id;

  const { data: existentes, error: eErr } = await admin
    .from("posts_agendados")
    .select("id, sinergia_chave, status, url_imagem_final, urls_slides, data_hora_postado")
    .eq("aprovacao_semanal_id", aprovacaoId)
    .not("sinergia_chave", "is", null);
  if (eErr) return { ok: false, erro: "Não consegui ler os posts da semana. Tente de novo." };
  const lista = (existentes ?? []) as Parameters<typeof cardDeSinergiaSemArte>[0][];
  if (lista.some((p) => !cardDeSinergiaSemArte(p))) {
    return { ok: false, erro: "A sinergia desta semana já tem arte: nada foi refeito." };
  }
  const vazios = (lista as { id: string }[]).map((p) => p.id);
  if (vazios.length) {
    const { error: dErr } = await admin.from("posts_agendados").delete().in("id", vazios);
    if (dErr) return { ok: false, erro: `Não consegui tirar os cards vazios: ${dErr.message}` };
  }

  const contexto = toContexto(franqueada);
  contexto.publico = await carregarPublicoContexto(admin, franqueadaId);
  const estr = (aprov as { estrategia?: { queixas?: string[] } | null }).estrategia;
  const logoUrl = await buscarArquivoUrl(admin, franqueadaId, "logo_principal");
  const sin = await montarSinergiaDaSemana({
    admin,
    franqueadaId,
    franqueada,
    aprovacaoId,
    semanaRef,
    contexto,
    queixas: Array.isArray(estr?.queixas) ? estr!.queixas! : [],
    temaEmAlta: null,
    logoUrl: logoUrl ?? null,
  });
  revalidatePath("/dashboard/aprovar");
  if (!sin.ok) {
    return { ok: false, erro: `A sinergia não saiu (${sin.motivo}).${vazios.length ? ` Os ${vazios.length} cards vazios já saíram.` : ""}` };
  }
  return { ok: true, gerados: sin.gerados, tirados: vazios.length };
}

/**
 * Dispara geração pra franqueada do usuário logado (ação do admin).
 */
export async function gerarMinhaSemana(semanaRef?: string): Promise<ResultadoGeracaoSemana> {
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
 * Monta bloco de texto com as datas comemorativas
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
): string | undefined {
  if (datas.length === 0) return undefined;
  const partes: string[] = [
    "DATAS COMEMORATIVAS NAS PRÓXIMAS 2 SEMANAS (use se fizer sentido no calendário da semana):",
  ];
  datas.slice(0, 5).forEach((d) => {
    partes.push(
      `- ${d.data_dia}/${d.data_mes}, ${d.nome}${d.ideias_angulo ? `: ${d.ideias_angulo}` : ""}`,
    );
  });
  partes.push("");
  partes.push(
    "IMPORTANTE: use essas datas SOMENTE se forem realmente relevantes pra franqueada e pro público-alvo dela. Não force encaixe.",
  );
  return partes.join("\n");
}

/**
 * Casa briefings antecipados com slots do plano. Os primeiros N slots
 * do plano (até o número de briefings) viram posts a partir dos
 * pedidos da nutri. Se a nutri pediu formato específico, prioriza
 * matching de tipo. Os demais slots seguem com o tema automático.
 */
function casarBriefingsComPlano<S extends SlotSemana>(
  plano: S[],
  briefings: Briefing[],
): Array<S & { briefing?: Briefing }> {
  if (briefings.length === 0) {
    return plano.map((p) => ({ ...p }));
  }

  const restantes = [...briefings];
  const resultado: Array<S & { briefing?: Briefing }> = plano.map((p) => ({
    ...p,
  }));

  // 1. Casa briefings com formato preferido específico
  for (const b of [...restantes]) {
    if (
      b.formato_preferido &&
      b.formato_preferido !== "sem_preferencia"
    ) {
      const idx = resultado.findIndex(
        (r) => !r.briefing && r.tipo === b.formato_preferido,
      );
      if (idx >= 0) {
        resultado[idx].briefing = b;
        // Mantemos o ângulo automático — o tema do briefing já entra
        // como contexto direto no prompt. angulo_sugerido textual da
        // nutri vai dentro do bloco de contexto, sem virar enum.
        restantes.splice(restantes.indexOf(b), 1);
      }
    }
  }

  // 2. Os demais ocupam slots na ordem (do começo da semana pro fim)
  for (const slot of resultado) {
    if (slot.briefing || restantes.length === 0) continue;
    if (slot.tipo === "stories") continue; // stories ficam pro tema automático
    const b = restantes.shift()!;
    slot.briefing = b;
  }

  return resultado;
}

function montarContextoComBriefing(
  contextoBase: string | undefined,
  briefing: Briefing,
): string {
  const linhas: string[] = [];
  linhas.push("PEDIDO DIRETO DA NUTRI PRA ESSE POST (priorize esse tema):");
  linhas.push(`Tema: ${briefing.tema}`);
  if (briefing.angulo_sugerido) {
    linhas.push(`Ângulo que ela pediu: ${briefing.angulo_sugerido}`);
  }
  if (briefing.observacoes) {
    linhas.push(`Observações dela: ${briefing.observacoes}`);
  }
  linhas.push(
    "Use exatamente o tema acima como assunto principal do post. O ângulo automático fica em segundo plano.",
  );

  if (contextoBase) {
    linhas.push("");
    linhas.push("---");
    linhas.push(contextoBase);
  }

  return linhas.join("\n");
}

/**
 * Lembrete do stories de rotina: se o modelo sugeriu enquete ou caixinha,
 * vira o recado "ponha por cima". Arte não leva sticker, quem põe é ela.
 */
function lembreteDaInteracao(tipo: string, post: { interacao_sugerida?: unknown }): string | null {
  if (tipo !== "stories") return null;
  const i = typeof post.interacao_sugerida === "string" ? post.interacao_sugerida.trim() : "";
  if (!i) return null;
  return `A arte está pronta. Ponha por cima no Instagram: ${i.slice(0, 200)}`;
}

/** Baixa uma foto pública do app; falha devolve null e o slide segue sem ela. */
async function baixarFotoPublica(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) {
      console.warn(`[semanal] foto não baixou (${res.status}): ${url}`);
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn("[semanal] foto não baixou:", (e as Error).message);
    return null;
  }
}

/** Baixa a foto do kit do teste; falha devolve null e o post segue sem ela. */
async function baixarFotoDoKit(
  produto: Parameters<typeof fotoDoKit>[0],
): Promise<{ buf: Buffer; url: string } | null> {
  const url = fotoDoKit(produto);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!res.ok) {
      console.warn(`[semanal] foto do kit não baixou (${res.status}): ${url}`);
      return null;
    }
    return { buf: Buffer.from(await res.arrayBuffer()), url };
  } catch (e) {
    console.warn("[semanal] foto do kit não baixou:", (e as Error).message);
    return null;
  }
}

/** O texto do post que decide a foto: título, subtítulo e slides. */
function textoDoPost(post: { headline?: unknown; subtitle?: unknown; slides?: unknown }): string {
  const slides = Array.isArray(post.slides) ? post.slides.map((x) => String(x ?? "")).join(" ") : "";
  return [post.headline, post.subtitle].filter((x) => typeof x === "string").join(" ") + " " + slides;
}
