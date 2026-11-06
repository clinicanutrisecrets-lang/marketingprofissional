/**
 * O painel de conversas da Aline no Estúdio (06/11/2026).
 *
 * *"Eu olho as conversas todo dia, tem que fazer um painel pra mim no
 * Studio."* Ela responde pelo app do Instagram, não por aqui (ROBO-INSTAGRAM.md
 * §4): o painel existe pra ela saber, em um minuto, O QUE precisa dela e o
 * que o robô andou dizendo, sem abrir conversa por conversa.
 *
 * Quatro blocos, nesta ordem:
 *   1. Urgente: mensagem de sofrimento (o robô já mandou o CVV e avisou).
 *   2. Esperando você: o robô passou a conversa (cliente com problema,
 *      convite, resposta segurada, caso individual).
 *   3. Ninguém respondeu: a pessoa escreveu e não saiu nada depois (nem do
 *      robô, nem dela), fora das conversas que ela mesma conduz.
 *   4. O robô respondeu: tudo que saiu nas últimas 24 h, pra revisão.
 *
 * Puro (sem import): testado em tests/painel-conversas.test.ts.
 */

export type ContatoPainel = {
  id: string;
  username: string | null;
  nome: string | null;
  precisa_humano: boolean;
  precisa_humano_motivo: string | null;
  silenciado: boolean;
  aline_falou_em: string | null;
  ultima_msg_recebida_em: string | null;
  cliente_situacao?: { confirmado: boolean; tem_genetico?: boolean; tem_epigenetico?: boolean; comprou_lotus?: boolean } | null;
};

export type MensagemPainel = {
  id: string;
  contato_id: string | null;
  canal: string;
  direcao: "entrada" | "saida";
  texto: string | null;
  origem: string | null;
  criado_em: string;
};

export type Conversa = {
  contato: ContatoPainel;
  mensagens: MensagemPainel[]; // da mais antiga pra mais nova, só as últimas
  ultimaEm: string;
  /** Horas que faltam pra fechar a janela de 24 h da Meta (null = fechada ou nunca abriu). */
  horasDeJanela: number | null;
  /** "story", "comentário" ou "direct": de onde veio a última mensagem dela. */
  canalDaUltimaEntrada: string | null;
};

export type Painel = {
  urgentes: Conversa[];
  esperando: Conversa[];
  semResposta: Conversa[];
  roboRespondeu: Conversa[];
  contadores: { entradas24h: number; saidas24h: number; conversas24h: number };
};

const H = 3600_000;

export function ehUrgente(c: Pick<ContatoPainel, "precisa_humano" | "precisa_humano_motivo">): boolean {
  return c.precisa_humano && (c.precisa_humano_motivo ?? "").startsWith("🔴");
}

export function horasDeJanela(ultimaRecebida: string | null, agora: number): number | null {
  if (!ultimaRecebida) return null;
  const resta = new Date(ultimaRecebida).getTime() + 24 * H - agora;
  return resta > 0 ? Math.round((resta / H) * 10) / 10 : null;
}

const NOME_CANAL: Record<string, string> = {
  dm: "direct", comentario: "comentário", story_reply: "resposta de story", story_mention: "menção em story",
};
export function nomeDoCanal(c: string): string {
  return NOME_CANAL[c] ?? c;
}

/** O que a origem do registro significa, em palavras dela. */
export function legendaDaOrigem(origem: string | null): string {
  const o = origem ?? "";
  if (o.startsWith("risco:")) return "mensagem de segurança (CVV / 192)";
  if (o === "regra_por_intencao") return "material, entendendo o pedido sem a palavra-chave";
  if (o.startsWith("regra")) return o.includes("sem_confirmacao") ? "material (o Instagram não confirmou a entrega)" : "material da palavra-chave";
  if (o.startsWith("opcao:")) return `botão "${o.slice(6).split(":")[0]}"`;
  if (o.startsWith("sequencia")) return "lembrete da sequência";
  if (o === "ia_scanner") return "conversa escrita pelo robô";
  if (o === "ia_agradecimento") return "agradecimento no comentário";
  if (o === "convite_direct") return "convite pro direct";
  if (o === "coracao") return "coração";
  return o || "robô";
}

export function montarPainel(contatos: ContatoPainel[], mensagens: MensagemPainel[], agora = Date.now(), porConversa = 8): Painel {
  const desde24h = agora - 24 * H;
  const porContato = new Map<string, MensagemPainel[]>();
  for (const m of mensagens) {
    if (!m.contato_id) continue;
    const l = porContato.get(m.contato_id) ?? [];
    l.push(m);
    porContato.set(m.contato_id, l);
  }

  const conversas: Conversa[] = [];
  for (const c of contatos) {
    const msgs = (porContato.get(c.id) ?? []).slice().sort((a, b) => a.criado_em.localeCompare(b.criado_em));
    if (msgs.length === 0 && !c.precisa_humano) continue;
    const ultimaEntrada = [...msgs].reverse().find((m) => m.direcao === "entrada");
    conversas.push({
      contato: c,
      mensagens: msgs.slice(-porConversa),
      ultimaEm: msgs.at(-1)?.criado_em ?? c.ultima_msg_recebida_em ?? new Date(0).toISOString(),
      horasDeJanela: horasDeJanela(c.ultima_msg_recebida_em, agora),
      canalDaUltimaEntrada: ultimaEntrada ? nomeDoCanal(ultimaEntrada.canal) : null,
    });
  }
  const recentes = (a: Conversa, b: Conversa) => b.ultimaEm.localeCompare(a.ultimaEm);

  const urgentes = conversas.filter((v) => ehUrgente(v.contato)).sort(recentes);
  const esperando = conversas.filter((v) => v.contato.precisa_humano && !ehUrgente(v.contato)).sort(recentes);
  const jaListados = new Set([...urgentes, ...esperando].map((v) => v.contato.id));

  const semResposta = conversas
    .filter((v) => !jaListados.has(v.contato.id))
    // Conversa que ELA conduz não é "sem resposta": ela responde pelo app.
    .filter((v) => !v.contato.aline_falou_em)
    .filter((v) => {
      const ultima = v.mensagens.at(-1);
      return !!ultima && ultima.direcao === "entrada" && new Date(ultima.criado_em).getTime() >= desde24h;
    })
    .sort(recentes);
  semResposta.forEach((v) => jaListados.add(v.contato.id));

  const roboRespondeu = conversas
    .filter((v) => !jaListados.has(v.contato.id))
    .filter((v) => v.mensagens.some((m) => m.direcao === "saida" && new Date(m.criado_em).getTime() >= desde24h))
    .sort(recentes);

  const ult24 = mensagens.filter((m) => new Date(m.criado_em).getTime() >= desde24h);
  return {
    urgentes, esperando, semResposta, roboRespondeu,
    contadores: {
      entradas24h: ult24.filter((m) => m.direcao === "entrada").length,
      saidas24h: ult24.filter((m) => m.direcao === "saida").length,
      conversas24h: new Set(ult24.map((m) => m.contato_id).filter(Boolean)).size,
    },
  };
}

/** Abre a conversa com a pessoa no app do Instagram (celular ou computador). */
export function linkDoDirect(username: string | null): string | null {
  const u = (username ?? "").replace(/^@/, "").trim();
  return u ? `https://ig.me/m/${encodeURIComponent(u)}` : null;
}
