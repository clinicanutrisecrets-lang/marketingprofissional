/**
 * Processa o corpo de um webhook do Instagram: acha o perfil dono, deduplica,
 * registra o contato, escolhe a regra e executa (ou cai nas chaves gerais:
 * agradecer comentário / responder DM com a base do Scanner).
 *
 * Toda falha de envio é logada e NÃO derruba o lote: a Meta reenvia o
 * webhook inteiro em caso de erro HTTP, e aí a deduplicação segura o resto.
 */

import { createAlineClient } from "@/lib/supabase/server";
import {
  enviarDm,
  obterPerfilUsuario,
  reagirMensagem,
  responderComentario,
  respostaPrivadaComentario,
  type BotaoRapido,
  type Credenciais,
} from "@/lib/instagram/api";
import {
  carregarPerfilPorContaInstagram,
  credenciaisDoPerfil,
  type PerfilInstagram,
} from "@/lib/instagram/credenciais";
import { blocoOrientacoesDaDona, lerConfig, normalizarNome, normalizarUsername } from "./config";
import { enfileirarSequencia } from "./fila";
import { classificarOpcaoPorTexto, escolherRegraPorIntencao, gerarAgradecimentoComentario, lerTomDaCritica, responderDmComScanner } from "./ia";
import {
  casarOpcao,
  ehDaPropriaConta,
  escolherVariante,
  extrairEventos,
  opcoesComoTexto,
  pareceClinico,
  pareceSpam,
  casaPalavraChave,
  pareceAbordagemComercial,
  payloadDaOpcao,
  preencherTexto,
  PREFIXO_PASSO,
  selecionarRegra,
  candidatasPorIntencao,
  descreverRegra,
  type EventoInstagram,
  type Gatilho,
  type Opcao,
  type Regra,
  type UltimasOpcoes,
} from "./regras";
import { buscarConhecimentoScanner } from "./scanner-conhecimento";
import { transcreverAudio } from "./transcrever-audio";
import {
  decidirAposAcusacao, contatoJaAcusou, TAG_ACUSACAO,
  suspeitaDeAcusacao, acaoParaLeitura,
} from "./acusacao";

export type ResumoProcessamento = {
  eventos: number;
  ignorados: number;
  duplicados: number;
  regras: number;
  /** Regras entregues porque a IA entendeu o pedido sem a palavra-chave. */
  regrasPorIntencao: number;
  /** Mensagens que saíram da conta (robô ou a própria Aline). */
  ecos: number;
  /** Direct que recebeu só um coração, sem texto. */
  coracoes: number;
  opcoes: number;
  agradecimentos: number;
  respostasDm: number;
  encaminhados: number;
  erros: number;
};

type Contato = {
  id: string;
  username: string | null;
  nome: string | null;
  tags: string[];
  silenciado: boolean;
  ultimas_opcoes: UltimasOpcoes | null;
  /** Quando a Aline escreveu ELA MESMA nesta conversa. Preenchido = robô fora. */
  aline_falou_em: string | null;
};

const COLS_CONTATO = "id, username, nome, tags, silenciado, ultimas_opcoes, aline_falou_em";
const COLS_REGRA =
  "id, nome, ativa, gatilho, palavras_chave, media_ids, resposta_publica, resposta_privada, sequencia_id, tags_adicionar, uma_vez_por_contato, prioridade, opcoes";
const THROTTLE_SAIDA_MS = 20_000;

export async function processarWebhook(payload: unknown): Promise<ResumoProcessamento> {
  const resumo: ResumoProcessamento = {
    eventos: 0, ignorados: 0, duplicados: 0, regras: 0, regrasPorIntencao: 0, ecos: 0, coracoes: 0, opcoes: 0, agradecimentos: 0, respostasDm: 0, encaminhados: 0, erros: 0,
  };
  const eventos = extrairEventos(payload);
  resumo.eventos = eventos.length;
  if (eventos.length === 0) return resumo;

  const perfis = new Map<string, PerfilInstagram | null>();
  const creds = new Map<string, Credenciais | null>();
  const regrasPorPerfil = new Map<string, Regra[]>();
  const aline = createAlineClient();

  for (const ev of eventos) {
    if (ev.tipo === "ignorar" || !ev.igsid) { resumo.ignorados++; continue; }
    try {
      let perfil = perfis.get(ev.contaId);
      if (perfil === undefined) {
        perfil = await carregarPerfilPorContaInstagram(ev.contaId);
        perfis.set(ev.contaId, perfil);
      }
      if (!perfil) {
        console.warn("[automacao] webhook de conta desconhecida", ev.contaId);
        resumo.ignorados++;
        continue;
      }
      if (ehDaPropriaConta(ev.igsid, [perfil.instagram_user_id, perfil.instagram_conta_id])) {
        resumo.ignorados++;
        continue;
      }

      // ── Eco: a conta mandou uma mensagem. Foi o robô, ou foi a Aline? ──
      if (ev.tipo === "eco") {
        await marcarSeFoiAline(perfil.id, ev);
        resumo.ecos++;
        continue;
      }

      // Dedup: a Meta reenvia; a chave é (perfil, entrada, id do evento).
      const entrada = await registrarEntrada(perfil.id, ev);
      if (entrada === "duplicado") { resumo.duplicados++; continue; }

      let cred = creds.get(perfil.id);
      if (cred === undefined) {
        const acesso = await credenciaisDoPerfil(perfil);
        cred = acesso.cred;
        if (!acesso.cred) console.error("[automacao] perfil sem credencial:", perfil.slug, acesso.motivo);
        creds.set(perfil.id, cred);
      }
      if (!cred) { resumo.ignorados++; continue; }

      const contato = await upsertContato(perfil.id, ev, cred);
      await aline.from("ig_mensagens").update({ contato_id: contato.id }).eq("id", entrada);
      if (contato.silenciado) { resumo.ignorados++; continue; }

      // 🔴 A Aline já escreveu ELA MESMA nesta conversa: é conversa dela, não
      // lead. O robô não entra. (Incidente 22/09: a Mariana respondeu uma
      // mensagem da Aline e o robô ofereceu teste genético por cima.)
      if (contato.aline_falou_em) { resumo.ignorados++; continue; }

      const config = lerConfig(perfil.automacao_config);
      const orientacoes = blocoOrientacoesDaDona(config);
      const gatilho = ev.tipo as Gatilho;

      // Família, equipe, amigas: o robô não responde (regra nem chave geral).
      // Casa por @ E por nome: a Aline lembra das pessoas pelo nome, e o @
      // quase nunca se parece com ele (Carolina Schneider = @nina_por_ai).
      const usernameContato = normalizarUsername(contato.username ?? ev.username ?? "");
      const nomeContato = normalizarNome(contato.nome ?? "");
      const bloqueado =
        (usernameContato && config.nao_responder_usernames.includes(usernameContato)) ||
        (nomeContato && config.nao_responder_nomes.includes(nomeContato));
      if (bloqueado) { resumo.ignorados++; continue; }

      // Áudio no direct → texto (AssemblyAI). Sem transcrição, segue como "[audio]".
      if (gatilho === "dm" && (!ev.texto || ev.texto.startsWith("["))) {
        const audio = ev.anexos?.find((a) => a.tipo === "audio" && a.url);
        if (audio?.url) {
          const transcrito = await transcreverAudio(audio.url);
          if (transcrito) {
            ev.texto = transcrito;
            await aline.from("ig_mensagens").update({ texto: `[áudio] ${transcrito}` }).eq("id", entrada);
          }
        }
      }

      let regras = regrasPorPerfil.get(perfil.id);
      if (!regras) {
        regras = await carregarRegras(perfil.id);
        regrasPorPerfil.set(perfil.id, regras);
      }
      const vars = { nome: contato.nome, username: contato.username ?? ev.username };
      // 🔴 O ofício de quem vende costuma estar no NOME do perfil, não na
      // mensagem ("João Pedro | Tráfego Pago"). Por isso a identidade anda
      // junto do texto em toda checagem de abordagem comercial.
      const quemEscreve = { nome: contato.nome, username: contato.username ?? ev.username };

      // ── Toque num botão, ou "2", ou o rótulo digitado, ou a frase que quer
      //    dizer um dos botões ("sou farmacêutico" → Outro profissional) ──
      if (gatilho === "dm") {
        let escolha = casarOpcao(ev, contato.ultimas_opcoes);
        if (!escolha && contato.ultimas_opcoes && ev.texto.trim() && !ev.texto.startsWith("[")) {
          const idx = await classificarOpcaoPorTexto(ev.texto, contato.ultimas_opcoes.rotulos);
          if (idx != null) escolha = { regraId: contato.ultimas_opcoes.regra_id, indice: idx };
        }
        if (escolha) {
          const origem = await opcaoDeOrigem(escolha.regraId, escolha.indice, regras);
          if (origem) {
            await executarOpcao({ perfil, cred, contato, ev, regraId: origem.regraId, opcao: origem.opcao, vars });
            resumo.opcoes++;
            continue;
          }
        }
      }

      const jaAplicadas = await regrasJaAplicadas(contato.id);

      // ── Crítica: o TOM decide, não a palavra ──
      // 🔴 Pedido da Aline (22/09/2026). Duas etapas: a peneira larga é de
      // graça e não decide nada; quem decide é uma leitura curta. Dúvida
      // legítima JAMAIS recebe a defesa, porque responder "Genética é
      // ciência, é o meu mestrado" a quem só perguntou "isso tem estudo?"
      // transforma uma curiosa em inimiga, em público.
      const regraAcusacao = regras.find(
        (r) => r.gatilho === gatilho && contatoJaAcusou(r.tags_adicionar) && !jaAplicadas.has(r.id),
      );
      if (regraAcusacao && suspeitaDeAcusacao(ev.texto, casaPalavraChave)) {
        const acao = acaoParaLeitura(await lerTomDaCritica(ev.texto));
        if (acao.acao === "responder_acusacao") {
          await executarRegra({ perfil, cred, contato, ev, regra: regraAcusacao, vars });
          resumo.regras++;
          continue;
        }
        if (acao.acao === "mandar_pra_ela") {
          await marcarPrecisaHumano(contato.id, acao.motivo);
          resumo.encaminhados++;
          continue;
        }
      }

      // 🔴 A regra de acusação sai das DUAS vias normais. Por palavra-chave
      // crua ela dispararia em "dizem que é charlatanismo, mas eu confio em
      // você" (aliada levando defesa na cara). Pela classificação genérica
      // ela concorreria olhando só nome e 160 caracteres, que não bastam pra
      // separar ataque de curiosidade. Só a peneira de duas etapas acima a
      // dispara.
      const regrasComuns = regras.filter((r) => !contatoJaAcusou(r.tags_adicionar));

      let regra = selecionarRegra({ gatilho, texto: ev.texto, mediaId: ev.mediaId }, regrasComuns, jaAplicadas);
      let porIntencao = false;

      // ── Rede embaixo da palavra-chave ──
      // A pessoa escreveu com as palavras dela em vez de digitar o comando.
      // Só roda depois que a palavra-chave não pegou nada: quem digitou
      // "GLP1" continua tendo a resposta instantânea e previsível de sempre.
      if (!regra && config.entender_pedido_sem_palavra && ev.texto.trim() && !ev.texto.startsWith("[") && !pareceSpam(ev.texto) && !pareceAbordagemComercial(ev.texto, quemEscreve)) {
        const candidatas = candidatasPorIntencao({ gatilho, texto: ev.texto, mediaId: ev.mediaId }, regrasComuns, jaAplicadas);
        if (candidatas.length > 0) {
          const i = await escolherRegraPorIntencao(ev.texto, candidatas.map(descreverRegra));
          if (i != null) {
            regra = candidatas[i];
            porIntencao = true;
          }
        }
      }

      if (regra) {
        await executarRegra({ perfil, cred, contato, ev, regra, vars, porIntencao });
        if (porIntencao) resumo.regrasPorIntencao++;
        else resumo.regras++;
        continue;
      }

      // ── Quem já recebeu a resposta de acusação e voltou ──
      // 🔴 Decisão da Aline (22/09/2026): responde UMA vez, e se a pessoa
      // rebater, o robô cala e avisa ela. Vem depois das regras de propósito:
      // quem acusou ontem pode pedir o material hoje, e material é texto
      // fixo, não discussão.
      const apos = decidirAposAcusacao({ tags: contato.tags, regraDisparou: false });
      if (apos.acao === "calar_e_avisar") {
        await marcarPrecisaHumano(contato.id, apos.motivo);
        resumo.encaminhados++;
        continue;
      }

      // ── Sem regra: chaves gerais ──
      if (gatilho === "comentario") {
        if (!config.agradecer_comentarios || pareceSpam(ev.texto) || pareceAbordagemComercial(ev.texto, quemEscreve) || ev.parentCommentId) { resumo.ignorados++; continue; }
        if (await saidaRecente(contato.id)) { resumo.ignorados++; continue; }
        let texto: string | null;
        let origem: string;
        if (pareceClinico(ev.texto)) {
          texto = preencherTexto(config.texto_convite_direct, vars);
          origem = "convite_direct";
        } else {
          texto = await gerarAgradecimentoComentario({
            perfil, comentario: ev.texto, username: ev.username, legendaDoPost: await legendaDoPost(perfil.id, ev.mediaId), orientacoes,
          });
          origem = "ia_agradecimento";
        }
        if (!texto) { resumo.erros++; continue; }
        await responderComentario(cred, ev.commentId!, texto);
        await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "comentario", texto, origem, mediaId: ev.mediaId });
        resumo.agradecimentos++;
        continue;
      }

      if (gatilho === "dm") {
        const textoPessoa = ev.texto.trim();

        // ── Modo coração ──
        // 🔴 Em vez de falar em nome dela, o robô só avisa que viu. A Aline
        // decide se responde. Esta chave VENCE a IA de propósito: o pedido
        // nasceu de o robô ter escrito onde não devia (22/09/2026).
        if (config.reagir_com_coracao) {
          if (pareceAbordagemComercial(textoPessoa, quemEscreve)) { resumo.ignorados++; continue; }
          if (!ev.externalId) { resumo.ignorados++; continue; } // sem id não há o que reagir
          try {
            await reagirMensagem(cred, ev.igsid, ev.externalId);
            await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "dm", texto: "♥️", origem: "coracao" });
            resumo.coracoes++;
          } catch (e) {
            console.error("[automacao] falha ao reagir:", (e as Error).message);
            resumo.erros++;
          }
          continue;
        }

        if (!config.responder_dm_scanner || !textoPessoa || textoPessoa.startsWith("[") || pareceAbordagemComercial(textoPessoa, quemEscreve)) { resumo.ignorados++; continue; }
        if (await saidaRecente(contato.id)) { resumo.ignorados++; continue; }
        const [historico, contexto] = await Promise.all([historicoDm(contato.id), buscarConhecimentoScanner(textoPessoa)]);
        const resp = await responderDmComScanner({
          perfil, historico, pergunta: textoPessoa, nomeContato: contato.nome,
          contextoScanner: contexto, textoEncaminharHumano: config.texto_encaminhar_humano, orientacoes,
        });
        if (!resp || !resp.texto) { resumo.erros++; continue; }
        const env = await enviarDm(cred, ev.igsid, resp.texto);
        await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "dm", texto: resp.texto, origem: "ia_scanner", externalId: env.message_id ?? null });
        resumo.respostasDm++;
        if (resp.encaminhar) {
          await aline.from("ig_contatos")
            .update({ precisa_humano: true, precisa_humano_motivo: resp.motivo ?? "encaminhado pelo robô" })
            .eq("id", contato.id);
          resumo.encaminhados++;
        }
        continue;
      }

      resumo.ignorados++; // story sem regra: só fica registrado
    } catch (e) {
      console.error("[automacao] erro processando evento", ev.tipo, ev.externalId, (e as Error).message);
      resumo.erros++;
    }
  }
  return resumo;

  /* ── helpers com acesso ao client ── */

  /**
   * Chegou um ECO: alguma mensagem saiu da conta. Foi o robô, ou foi a Aline
   * digitando no celular?
   *
   * 🔴 Se foi ela, o robô sai da conversa PRA SEMPRE: quem responde uma
   * mensagem dela está falando com ELA, não com a empresa. Foi assim que a
   * Mariana Uchoa respondeu "Meu sonhooooooo" e levou uma oferta de teste
   * genético por cima (22/09/2026).
   *
   * O lado seguro do erro é ficar calado: se a gente confundir o eco do robô
   * com o dela, o robô só para de responder aquela pessoa.
   */
  async function marcarSeFoiAline(perfilId: string, ev: EventoInstagram) {
    const { data } = await aline
      .from("ig_contatos").select("id, aline_falou_em")
      .eq("perfil_id", perfilId).eq("igsid", ev.igsid).maybeSingle();
    if (!data) return; // ela escreveu pra quem nunca falou com a gente
    const c = data as { id: string; aline_falou_em: string | null };
    if (c.aline_falou_em) return; // já está travado

    // Foi o robô? O id do eco é o message_id que a Meta devolveu no envio.
    if (ev.externalId) {
      const { data: nossa } = await aline
        .from("ig_mensagens").select("id")
        .eq("contato_id", c.id).eq("direcao", "saida").eq("external_id", ev.externalId)
        .maybeSingle();
      if (nossa) return;
    }
    // Rede, pros envios cujo id não ficou guardado: texto idêntico que saiu
    // daqui há pouco. O robô manda e o eco volta em segundos.
    if (ev.texto.trim()) {
      const desde = new Date(Date.now() - 10 * 60_000).toISOString();
      const { data: igual } = await aline
        .from("ig_mensagens").select("id")
        .eq("contato_id", c.id).eq("direcao", "saida").eq("texto", ev.texto)
        .gte("criado_em", desde).limit(1);
      if (igual && igual.length > 0) return;
    }

    await aline.from("ig_contatos")
      .update({ aline_falou_em: new Date().toISOString() }).eq("id", c.id);
    console.log("[automacao] a dona do perfil escreveu nesta conversa; o robô sai:", c.id);
  }

  async function registrarEntrada(perfilId: string, ev: EventoInstagram): Promise<string | "duplicado"> {
    const { data, error } = await aline
      .from("ig_mensagens")
      .insert({
        perfil_id: perfilId,
        canal: ev.tipo,
        direcao: "entrada",
        external_id: ev.externalId || null,
        media_id: ev.mediaId ?? null,
        texto: ev.texto || null,
        payload: ev.bruto as Record<string, unknown>,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return "duplicado";
      throw new Error(`ig_mensagens: ${error.message}`);
    }
    return (data as { id: string }).id;
  }

  async function upsertContato(perfilId: string, ev: EventoInstagram, cred: Credenciais): Promise<Contato> {
    const agora = new Date().toISOString();
    const ehDm = ev.tipo !== "comentario";
    const { data: existente } = await aline
      .from("ig_contatos")
      .select(COLS_CONTATO)
      .eq("perfil_id", perfilId)
      .eq("igsid", ev.igsid)
      .maybeSingle();

    if (existente) {
      const c = existente as Contato;
      const patch: Record<string, unknown> = { ultima_interacao_em: agora };
      if (ehDm) patch.ultima_msg_recebida_em = agora;
      if (!c.username && ev.username) patch.username = ev.username;
      // 🔴 Busca o nome TAMBÉM em comentário, não só em DM. O webhook de
      // comentário entrega o @ mas não o nome, e a trava de vendedor lê o
      // NOME DO PERFIL ("João Pedro | Tráfego Pago"). Sem isto, quem só
      // comenta nunca tinha nome e a trava não tinha o que ler. Medido em
      // 22/09/2026: 35 dos 90 contatos estavam sem nome, todos de comentário.
      if (!c.nome) {
        const p = await obterPerfilUsuario(cred, ev.igsid);
        if (p.name) patch.nome = p.name;
        if (p.username && !c.username) patch.username = p.username;
      }
      await aline.from("ig_contatos").update(patch).eq("id", c.id);
      return { ...c, username: (patch.username as string | undefined) ?? c.username, nome: (patch.nome as string | undefined) ?? c.nome };
    }

    let nome: string | null = null;
    let username: string | null = ev.username ?? null;
    {
      // Vale pra comentário também: é onde o vendedor aparece, e é o nome
      // dele que denuncia. Falha de rede aqui devolve vazio (a função
      // engole o erro), então nunca trava a entrada do contato.
      const p = await obterPerfilUsuario(cred, ev.igsid);
      nome = p.name ?? null;
      username = username ?? p.username ?? null;
    }
    const { data, error } = await aline
      .from("ig_contatos")
      .insert({
        perfil_id: perfilId, igsid: ev.igsid, username, nome,
        ultima_interacao_em: agora, ultima_msg_recebida_em: ehDm ? agora : null,
      })
      .select(COLS_CONTATO)
      .single();
    if (error) throw new Error(`ig_contatos: ${error.message}`);
    return data as Contato;
  }

  async function carregarRegras(perfilId: string): Promise<Regra[]> {
    const { data, error } = await aline.from("ig_regras").select(COLS_REGRA).eq("perfil_id", perfilId).eq("ativa", true);
    if (error) throw new Error(`ig_regras: ${error.message}`);
    return (data ?? []) as Regra[];
  }

  async function carregarRegraPorId(id: string): Promise<Regra | null> {
    const { data } = await aline.from("ig_regras").select(COLS_REGRA).eq("id", id).maybeSingle();
    return (data as Regra | null) ?? null;
  }

  /** Acha a opção escolhida: numa regra (id) ou num passo de sequência ("passo:<id>"). */
  async function opcaoDeOrigem(ref: string, indice: number, regras: Regra[]): Promise<{ regraId: string | null; opcao: Opcao } | null> {
    if (ref.startsWith(PREFIXO_PASSO)) {
      const { data } = await aline.from("ig_sequencia_passos").select("opcoes").eq("id", ref.slice(PREFIXO_PASSO.length)).maybeSingle();
      const opcao = ((data as { opcoes?: Opcao[] } | null)?.opcoes ?? [])[indice];
      return opcao ? { regraId: null, opcao } : null;
    }
    const regra = regras.find((r) => r.id === ref) ?? (await carregarRegraPorId(ref));
    const opcao = regra?.opcoes?.[indice];
    return regra && opcao ? { regraId: regra.id, opcao } : null;
  }

  async function regrasJaAplicadas(contatoId: string): Promise<Set<string>> {
    const { data } = await aline
      .from("ig_mensagens")
      .select("regra_id")
      .eq("contato_id", contatoId)
      .eq("direcao", "saida")
      .not("regra_id", "is", null);
    return new Set(((data ?? []) as Array<{ regra_id: string }>).map((r) => r.regra_id));
  }

  async function saidaRecente(contatoId: string): Promise<boolean> {
    const { data } = await aline
      .from("ig_mensagens")
      .select("criado_em")
      .eq("contato_id", contatoId)
      .eq("direcao", "saida")
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    const t = (data as { criado_em: string } | null)?.criado_em;
    return !!t && Date.now() - Date.parse(t) < THROTTLE_SAIDA_MS;
  }

  async function historicoDm(contatoId: string): Promise<Array<{ direcao: "entrada" | "saida"; texto: string }>> {
    const { data } = await aline
      .from("ig_mensagens")
      .select("direcao, texto")
      .eq("contato_id", contatoId)
      .in("canal", ["dm", "story_reply", "story_mention"])
      .order("criado_em", { ascending: false })
      .limit(9);
    return ((data ?? []) as Array<{ direcao: "entrada" | "saida"; texto: string | null }>)
      .slice(1) // a mais recente é a mensagem que está sendo respondida
      .reverse()
      .filter((m) => m.texto)
      .map((m) => ({ direcao: m.direcao, texto: m.texto! }));
  }

  async function legendaDoPost(perfilId: string, mediaId?: string): Promise<string | null> {
    if (!mediaId) return null;
    const { data } = await aline
      .from("posts")
      .select("copy_legenda")
      .eq("perfil_id", perfilId)
      .eq("instagram_post_id", mediaId)
      .maybeSingle();
    return (data as { copy_legenda: string | null } | null)?.copy_legenda ?? null;
  }

  async function registrarSaida(p: {
    perfilId: string; contatoId: string; canal: "dm" | "comentario"; texto: string | null; origem: string; regraId?: string; mediaId?: string;
    /** message_id devolvido pela Meta: é o que faz o eco ser reconhecido como NOSSO. */
    externalId?: string | null;
  }) {
    await aline.from("ig_mensagens").insert({
      perfil_id: p.perfilId, contato_id: p.contatoId, canal: p.canal, direcao: "saida",
      texto: p.texto, origem: p.origem, regra_id: p.regraId ?? null, media_id: p.mediaId ?? null,
      external_id: p.externalId ?? null,
    });
  }

  async function aplicarTags(contato: Contato, tags: string[]) {
    if (tags.length === 0) return;
    const novas = Array.from(new Set([...(contato.tags ?? []), ...tags]));
    await aline.from("ig_contatos").update({ tags: novas }).eq("id", contato.id);
    contato.tags = novas;
  }

  /** Manda a DM com botões; se a Meta recusar os botões, manda a lista numerada. */
  async function enviarComBotoes(p: {
    cred: Credenciais; ev: EventoInstagram; texto: string; regra: Regra; opcoes: Opcao[];
  }): Promise<string> {
    const botoes: BotaoRapido[] = p.opcoes.map((o, i) => ({ title: o.rotulo, payload: payloadDaOpcao(p.regra.id, i) }));
    const ehComentario = p.ev.tipo === "comentario" && !!p.ev.commentId;
    try {
      if (ehComentario) await respostaPrivadaComentario(p.cred, p.ev.commentId!, p.texto, botoes);
      else await enviarDm(p.cred, p.ev.igsid, p.texto, botoes);
      return p.texto;
    } catch (e) {
      console.warn("[automacao] botões recusados, mandando lista numerada:", (e as Error).message.slice(0, 200));
      const textoLista = opcoesComoTexto(p.texto, p.opcoes.map((o) => o.rotulo));
      if (ehComentario) await respostaPrivadaComentario(p.cred, p.ev.commentId!, textoLista);
      else await enviarDm(p.cred, p.ev.igsid, textoLista);
      return textoLista;
    }
  }

  /** Põe o contato na fila dela, sem escrever nada pra pessoa. */
  async function marcarPrecisaHumano(contatoId: string, motivo: string) {
    await aline
      .from("ig_contatos")
      .update({ precisa_humano: true, precisa_humano_motivo: motivo })
      .eq("id", contatoId);
  }

  async function executarRegra(p: {
    perfil: PerfilInstagram; cred: Credenciais; contato: Contato; ev: EventoInstagram; regra: Regra;
    vars: { nome?: string | null; username?: string | null };
    /** true quando a palavra-chave não pegou e a IA entendeu o pedido. */
    porIntencao?: boolean;
  }) {
    const { perfil, cred, contato, ev, regra, vars } = p;
    // Origem distinta pra ela auditar no painel o que a palavra-chave perdeu.
    const origemRegra = p.porIntencao ? "regra_por_intencao" : "regra";
    const ehComentario = ev.tipo === "comentario";
    const opcoes = (regra.opcoes ?? []).filter((o) => o.rotulo && o.resposta);

    if (ehComentario && regra.resposta_publica && ev.commentId) {
      const texto = preencherTexto(escolherVariante(regra.resposta_publica), vars);
      await responderComentario(cred, ev.commentId, texto);
      await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "comentario", texto, origem: origemRegra, regraId: regra.id, mediaId: ev.mediaId });
    }
    if (regra.resposta_privada) {
      const texto = preencherTexto(escolherVariante(regra.resposta_privada), vars);
      let enviado = texto;
      let enviado_id: string | null = null;
      if (opcoes.length > 0) {
        enviado = await enviarComBotoes({ cred, ev, texto, regra, opcoes });
        const ultimas: UltimasOpcoes = { regra_id: regra.id, rotulos: opcoes.map((o) => o.rotulo) };
        await aline.from("ig_contatos").update({ ultimas_opcoes: ultimas }).eq("id", contato.id);
      } else if (ehComentario && ev.commentId) {
        enviado_id = (await respostaPrivadaComentario(cred, ev.commentId, texto)).message_id ?? null;
      } else {
        enviado_id = (await enviarDm(cred, ev.igsid, texto)).message_id ?? null;
      }
      await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "dm", texto: enviado, origem: origemRegra, regraId: regra.id, mediaId: ev.mediaId, externalId: enviado_id });
    }
    if (!regra.resposta_publica && !regra.resposta_privada) {
      // Regra só de tag/sequência: registra a aplicação pra "uma vez por contato" valer.
      await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: ehComentario ? "comentario" : "dm", texto: null, origem: "regra_sem_texto", regraId: regra.id });
    }
    await aplicarTags(contato, regra.tags_adicionar);
    // Acusação respondida: ela precisa SABER, mesmo tendo sido automática.
    // Sem isto a única resposta pública a um ataque sairia sem ninguém ver.
    if (contatoJaAcusou(regra.tags_adicionar)) {
      await marcarPrecisaHumano(contato.id, "respondi a uma acusação em público, confira o tom");
    }
    if (regra.sequencia_id) {
      // Sequência é DM: só entra na janela de 24h (comentário não abre janela;
      // a resposta privada abre quando a pessoa responder).
      await enfileirarSequencia({
        perfilId: perfil.id, contatoId: contato.id, igsid: ev.igsid, sequenciaId: regra.sequencia_id, regraId: regra.id, vars,
      });
    }
  }

  async function executarOpcao(p: {
    perfil: PerfilInstagram; cred: Credenciais; contato: Contato; ev: EventoInstagram; regraId: string | null; opcao: Opcao;
    vars: { nome?: string | null; username?: string | null };
  }) {
    const { perfil, cred, contato, ev, regraId, opcao, vars } = p;
    const texto = preencherTexto(opcao.resposta, vars);
    await enviarDm(cred, ev.igsid, texto);
    await registrarSaida({ perfilId: perfil.id, contatoId: contato.id, canal: "dm", texto, origem: `opcao:${opcao.rotulo}`, regraId: regraId ?? undefined });
    await aline.from("ig_contatos").update({ ultimas_opcoes: null }).eq("id", contato.id);
    await aplicarTags(contato, opcao.tags ?? []);
    if (opcao.sequencia_id) {
      await enfileirarSequencia({
        perfilId: perfil.id, contatoId: contato.id, igsid: ev.igsid, sequenciaId: opcao.sequencia_id, regraId, vars,
      });
    }
  }
}
