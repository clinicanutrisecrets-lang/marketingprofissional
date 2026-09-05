/**
 * Motor de regras do robô do Instagram — funções PURAS (sem React, sem
 * Supabase, sem fetch), pra rodar em teste sem instalar nada.
 *
 * Aqui mora a leitura do webhook da Meta e a escolha da regra. Quem executa
 * (mandar DM, responder comentário, enfileirar sequência) é processar.ts.
 */

export type Gatilho = "comentario" | "dm" | "story_reply" | "story_mention";

export type Opcao = {
  rotulo: string; // ≤ 20 caracteres (limite da resposta rápida do Instagram)
  resposta: string;
  tags: string[];
  sequencia_id: string | null;
};

export type Regra = {
  id: string;
  nome: string;
  ativa: boolean;
  gatilho: Gatilho;
  palavras_chave: string[];
  media_ids: string[];
  resposta_publica: string | null;
  resposta_privada: string | null;
  sequencia_id: string | null;
  tags_adicionar: string[];
  uma_vez_por_contato: boolean;
  prioridade: number;
  opcoes?: Opcao[];
};

export type Anexo = { tipo: string; url?: string };

export type EventoInstagram = {
  /** entry.id — conta profissional que recebeu o evento */
  contaId: string;
  tipo: Gatilho | "eco" | "ignorar";
  igsid: string;
  username?: string;
  texto: string;
  /** id da DM (mid) ou do comentário — chave de deduplicação */
  externalId: string;
  mediaId?: string;
  commentId?: string;
  parentCommentId?: string;
  /** quick_reply.payload quando a pessoa tocou num botão */
  payload?: string;
  anexos?: Anexo[];
  timestamp?: number;
  bruto: unknown;
};

/* ── Texto ─────────────────────────────────────────────────────────────── */

export function normalizarTexto(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Palavra-chave casa por PALAVRA INTEIRA, sem acento e sem caixa.
 * "ebook" casa "quero o EBOOK!" e não casa "facebook". Lista vazia = casa tudo.
 */
export function casaPalavraChave(texto: string, palavras: string[]): boolean {
  const limpas = (palavras ?? []).map(normalizarTexto).filter(Boolean);
  if (limpas.length === 0) return true;
  const t = normalizarTexto(texto);
  if (!t) return false;
  return limpas.some((p) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(p)}(?=$|[^\\p{L}\\p{N}])`, "u");
    return re.test(t);
  });
}

/** Troca {nome}, {primeiro_nome} e {username} no texto da regra. */
export function preencherTexto(
  template: string,
  vars: { nome?: string | null; username?: string | null },
): string {
  const nome = (vars.nome ?? "").trim();
  const primeiro = nome.split(/\s+/)[0] ?? "";
  const username = (vars.username ?? "").replace(/^@/, "");
  let out = template
    .replace(/\{primeiro_nome\}/g, primeiro)
    .replace(/\{nome\}/g, nome)
    .replace(/\{username\}/g, username ? `@${username}` : "");
  // Sem nome, "Oi, {nome}!" vira "Oi!" em vez de "Oi, !"
  out = out.replace(/,\s*([!?.])/g, "$1").replace(/\s+([!?.,])/g, "$1").replace(/ {2,}/g, " ");
  return out.trim();
}

/* ── Escolha da regra ──────────────────────────────────────────────────── */

export function selecionarRegra(
  evento: { gatilho: Gatilho; texto: string; mediaId?: string | null },
  regras: Regra[],
  jaAplicadasNoContato: ReadonlySet<string> = new Set(),
): Regra | null {
  const candidatas = regras
    .filter((r) => r.ativa && r.gatilho === evento.gatilho)
    .filter((r) => r.media_ids.length === 0 || (evento.mediaId != null && r.media_ids.includes(evento.mediaId)))
    .filter((r) => !(r.uma_vez_por_contato && jaAplicadasNoContato.has(r.id)))
    .filter((r) => casaPalavraChave(evento.texto, r.palavras_chave));
  if (candidatas.length === 0) return null;
  // Menor prioridade primeiro; empate → a mais específica (com palavra-chave,
  // depois com post) vence a genérica.
  candidatas.sort((a, b) => {
    if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
    const espA = (a.palavras_chave.length > 0 ? 2 : 0) + (a.media_ids.length > 0 ? 1 : 0);
    const espB = (b.palavras_chave.length > 0 ? 2 : 0) + (b.media_ids.length > 0 ? 1 : 0);
    return espB - espA;
  });
  return candidatas[0];
}

/* ── Janela de 24h da Meta ─────────────────────────────────────────────── */

export const JANELA_24H_MS = 24 * 60 * 60 * 1000;

export function janela24hAberta(ultimaMsgRecebidaEm: string | Date | null | undefined, agora = Date.now()): boolean {
  if (!ultimaMsgRecebidaEm) return false;
  const t = typeof ultimaMsgRecebidaEm === "string" ? Date.parse(ultimaMsgRecebidaEm) : ultimaMsgRecebidaEm.getTime();
  if (Number.isNaN(t)) return false;
  return agora - t < JANELA_24H_MS;
}

/* ── Leitura do webhook ────────────────────────────────────────────────── */

type Json = Record<string, unknown>;

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  return typeof v === "string" ? v : String(v);
}

/**
 * Converte o corpo do webhook (object: 'instagram') numa lista plana de
 * eventos. Aceita os dois formatos de comentário (value.id do login do
 * Instagram e value.comment_id do login do Facebook).
 */
export function extrairEventos(payload: unknown): EventoInstagram[] {
  const body = payload as Json;
  if (!body || body.object !== "instagram" || !Array.isArray(body.entry)) return [];
  const eventos: EventoInstagram[] = [];

  for (const entry of body.entry as Json[]) {
    const contaId = str(entry.id) ?? "";

    for (const change of (entry.changes as Json[] | undefined) ?? []) {
      if (change.field !== "comments") continue;
      const v = (change.value ?? {}) as Json;
      const from = (v.from ?? {}) as Json;
      const media = (v.media ?? {}) as Json;
      const commentId = str(v.id) ?? str(v.comment_id) ?? "";
      if (!commentId) continue;
      eventos.push({
        contaId,
        tipo: "comentario",
        igsid: str(from.id) ?? "",
        username: str(from.username),
        texto: str(v.text) ?? "",
        externalId: commentId,
        mediaId: str(media.id),
        commentId,
        parentCommentId: str(v.parent_id),
        timestamp: typeof entry.time === "number" ? entry.time : undefined,
        bruto: change,
      });
    }

    for (const m of (entry.messaging as Json[] | undefined) ?? []) {
      const sender = (m.sender ?? {}) as Json;
      const msg = m.message as Json | undefined;
      if (!msg) {
        // read / postback / reaction: não vira resposta
        eventos.push({
          contaId,
          tipo: "ignorar",
          igsid: str(sender.id) ?? "",
          texto: "",
          externalId: "",
          timestamp: typeof m.timestamp === "number" ? m.timestamp : undefined,
          bruto: m,
        });
        continue;
      }
      const mid = str(msg.mid) ?? "";
      const base = {
        contaId,
        igsid: str(sender.id) ?? "",
        externalId: mid,
        timestamp: typeof m.timestamp === "number" ? m.timestamp : undefined,
        bruto: m,
      };
      if (msg.is_echo === true) {
        eventos.push({ ...base, tipo: "eco", texto: str(msg.text) ?? "" });
        continue;
      }
      const replyTo = msg.reply_to as Json | undefined;
      const story = replyTo?.story as Json | undefined;
      const attachments = (msg.attachments as Json[] | undefined) ?? [];
      const mention = attachments.find((a) => a.type === "story_mention");
      if (story) {
        eventos.push({ ...base, tipo: "story_reply", texto: str(msg.text) ?? "", mediaId: str(story.id) });
      } else if (mention) {
        const payload = (mention.payload ?? {}) as Json;
        eventos.push({ ...base, tipo: "story_mention", texto: str(msg.text) ?? "", mediaId: str(payload.url) });
      } else {
        const anexos: Anexo[] = attachments.map((a) => ({
          tipo: str(a.type) ?? "desconhecido",
          url: str(((a.payload ?? {}) as Json).url),
        }));
        const quick = msg.quick_reply as Json | undefined;
        const texto = str(msg.text) ?? (anexos.length > 0 ? `[${anexos.map((a) => a.tipo).join(", ")}]` : "");
        eventos.push({ ...base, tipo: "dm", texto, payload: str(quick?.payload), anexos: anexos.length ? anexos : undefined });
      }
    }
  }
  return eventos;
}

/* ── Proteções ─────────────────────────────────────────────────────────── */

/** Evento gerado pela própria conta (resposta nossa, comentário nosso) nunca dispara regra. */
export function ehDaPropriaConta(igsid: string, idsDaConta: Array<string | null | undefined>): boolean {
  return idsDaConta.filter(Boolean).includes(igsid);
}

/**
 * Comentário que é pergunta clínica individual não recebe resposta clínica
 * em público: o robô convida pro direct. Lista curta de propósito.
 */
const RE_CLINICO =
  /\b(exame|exames|tomar|tomo|dose|dosagem|suplemento|suplementa|remedio|medicamento|medicacao|diagnostic|doenca|sintoma|posso usar|quanto de|mg|ui|comprimido)\b/;

export function pareceClinico(texto: string): boolean {
  return RE_CLINICO.test(normalizarTexto(texto));
}

/** Spam óbvio: só menções, só link com promessa, ou vazio. */
export function pareceSpam(texto: string): boolean {
  const t = normalizarTexto(texto);
  if (!t) return true;
  const semMencoes = t.replace(/@[\w.]+/g, "").trim();
  if (!semMencoes) return true;
  if (/https?:\/\//.test(t) && /(seguidores|ganhe|renda|crypto|bitcoin|promocao)/.test(t)) return true;
  return false;
}

/* ── Botões (respostas rápidas) ────────────────────────────────────────── */

export const PREFIXO_PAYLOAD_OPCAO = "opc:";
export const MAX_OPCOES = 3;
export const MAX_ROTULO = 20;

export function payloadDaOpcao(regraId: string, indice: number): string {
  return `${PREFIXO_PAYLOAD_OPCAO}${regraId}:${indice}`;
}

/** regra_id é o id da regra OU "passo:<id do passo de sequência>". */
export type UltimasOpcoes = { regra_id: string; rotulos: string[] };
export const PREFIXO_PASSO = "passo:";

/**
 * Descobre qual botão a pessoa escolheu. Ordem: payload do toque →
 * número digitado ("2") → texto igual ao rótulo (sem acento/caixa).
 * Devolve {regraId, indice} ou null.
 */
export function casarOpcao(
  ev: { texto: string; payload?: string },
  ultimas: UltimasOpcoes | null | undefined,
): { regraId: string; indice: number } | null {
  if (ev.payload && ev.payload.startsWith(PREFIXO_PAYLOAD_OPCAO)) {
    const [regraId, idx] = ev.payload.slice(PREFIXO_PAYLOAD_OPCAO.length).split(":");
    const indice = Number(idx);
    if (regraId && Number.isInteger(indice) && indice >= 0) return { regraId, indice };
  }
  if (!ultimas || ultimas.rotulos.length === 0) return null;
  const t = normalizarTexto(ev.texto);
  if (!t) return null;
  const numero = t.match(/^(\d{1,2})[.)]?$/);
  if (numero) {
    const indice = Number(numero[1]) - 1;
    if (indice >= 0 && indice < ultimas.rotulos.length) return { regraId: ultimas.regra_id, indice };
  }
  const indice = ultimas.rotulos.findIndex((r) => normalizarTexto(r) === t);
  return indice >= 0 ? { regraId: ultimas.regra_id, indice } : null;
}

/** Texto de reserva quando os botões não podem ser mostrados: lista numerada. */
export function opcoesComoTexto(texto: string, rotulos: string[]): string {
  return `${texto}\n\n${rotulos.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nResponda com o número.`;
}
