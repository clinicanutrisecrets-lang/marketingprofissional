/** Chaves gerais do robô por perfil (aline.perfis.automacao_config). */

export type Direcionamento = { quando: string; fazer: string };

export type AutomacaoConfig = {
  /** Agradece em público todo comentário sem regra (texto gerado). */
  agradecer_comentarios: boolean;
  /** Responde DM sem regra consultando a base do Scanner. */
  responder_dm_scanner: boolean;
  /**
   * Entrega o material quando a pessoa PEDE com as palavras dela, sem digitar
   * a palavra-chave. 🔴 Nasce LIGADA: é o defeito do ManyChat que motivou a
   * troca, e desligada por omissão ela voltaria calada. `false` explícito
   * desliga e volta ao casamento por palavra exata.
   */
  entender_pedido_sem_palavra: boolean;
  /**
   * Direct sem regra: em vez de escrever, o robô só REAGE com um coração.
   *
   * 🔴 Pedido da Aline em 22/09/2026, depois de o robô responder por cima de
   * uma conversa pessoal dela: o coração avisa que ela viu, sem falar nada em
   * nome dela, e ela decide se responde. Quando ligada, a IA não escreve
   * direct nenhum -- esta chave VENCE responder_dm_scanner.
   */
  reagir_com_coracao: boolean;
  /** Resposta pública quando o comentário é pergunta clínica individual. */
  texto_convite_direct: string;
  /** Texto enviado na DM quando o robô decide passar pra uma pessoa. */
  texto_encaminhar_humano: string;
  /** Usernames (sem @) que o robô nunca responde: família, equipe, amigas. */
  nao_responder_usernames: string[];
  /**
   * NOMES de exibição que o robô nunca responde.
   *
   * 🔴 Existe porque a Aline lembra das pessoas pelo NOME, não pelo @ — e os
   * dois quase nunca se parecem: "Carolina Schneider" é @nina_por_ai, "Lais
   * Pereira" é @_laispl. Exigir o @ de memória deixaria família de fora da
   * trava, que é o pior erro que este robô pode cometer.
   *
   * Casa por nome COMPLETO normalizado (sem acento, sem caixa), nunca por
   * pedaço: "Ana" bloquearia meia base.
   */
  nao_responder_nomes: string[];
  /** Como a dona do perfil fala — mapeado das legendas e respostas dela, e editado por ela. */
  voz: string;
  /** O que dizer quando pedem orientação ou prescrição (ética), nas palavras dela. */
  instrucoes_etica: string;
  /** "Quando a pessoa quer X → faça Y": conduz a DM pra consulta, curso, teste, etc. */
  direcionamentos: Direcionamento[];
  /** Chave-geral da PUBLICAÇÃO de posts pelo cron. Desligada por padrão: post aprovado sem isto NÃO sobe. */
  publicar_posts: boolean;
  /** Chave-geral da GERAÇÃO semanal de posts (cron de quinta). Desligada por padrão desde 05/09: estratégia em revisão. */
  gerar_posts_semanal: boolean;
};

export const CONFIG_PADRAO: AutomacaoConfig = {
  agradecer_comentarios: false,
  responder_dm_scanner: false,
  entender_pedido_sem_palavra: true,
  reagir_com_coracao: false,
  texto_convite_direct: "Obrigada pela pergunta! Isso depende do seu caso, então te respondo melhor no direct. Me chama lá 💬",
  texto_encaminhar_humano: "Obrigada pela mensagem! Alguém da equipe continua essa conversa com você em breve.",
  nao_responder_usernames: [],
  nao_responder_nomes: [],
  voz: "",
  instrucoes_etica: "",
  direcionamentos: [],
  publicar_posts: false,
  gerar_posts_semanal: false,
};

function textoOuPadrao(v: unknown, padrao: string): string {
  return typeof v === "string" && v.trim() ? v : padrao;
}

export function normalizarUsername(u: string): string {
  return u.trim().replace(/^@/, "").toLowerCase();
}

/** Nome de exibição comparável: sem acento, sem caixa, espaço único. */
export function normalizarNome(n: string): string {
  return (n ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function lerConfig(bruto: unknown): AutomacaoConfig {
  const c = (bruto ?? {}) as Partial<Record<keyof AutomacaoConfig, unknown>>;
  const usernames = Array.isArray(c.nao_responder_usernames)
    ? c.nao_responder_usernames.filter((u): u is string => typeof u === "string").map(normalizarUsername).filter(Boolean)
    : [];
  const nomes = Array.isArray(c.nao_responder_nomes)
    ? c.nao_responder_nomes.filter((n): n is string => typeof n === "string").map(normalizarNome).filter(Boolean)
    : [];
  const direcionamentos = Array.isArray(c.direcionamentos)
    ? c.direcionamentos
        .filter((d): d is Direcionamento => !!d && typeof d === "object" && typeof (d as Direcionamento).quando === "string" && typeof (d as Direcionamento).fazer === "string")
        .map((d) => ({ quando: d.quando.trim(), fazer: d.fazer.trim() }))
        .filter((d) => d.quando && d.fazer)
    : [];
  return {
    agradecer_comentarios: c.agradecer_comentarios === true,
    responder_dm_scanner: c.responder_dm_scanner === true,
    // Ligada por omissão: só `false` explícito desliga.
    entender_pedido_sem_palavra: c.entender_pedido_sem_palavra !== false,
    reagir_com_coracao: c.reagir_com_coracao === true,
    texto_convite_direct: textoOuPadrao(c.texto_convite_direct, CONFIG_PADRAO.texto_convite_direct),
    texto_encaminhar_humano: textoOuPadrao(c.texto_encaminhar_humano, CONFIG_PADRAO.texto_encaminhar_humano),
    nao_responder_usernames: usernames,
    nao_responder_nomes: nomes,
    voz: typeof c.voz === "string" ? c.voz.trim() : "",
    instrucoes_etica: typeof c.instrucoes_etica === "string" ? c.instrucoes_etica.trim() : "",
    direcionamentos,
    publicar_posts: c.publicar_posts === true,
    gerar_posts_semanal: c.gerar_posts_semanal === true,
  };
}

/**
 * Lê o textarea de direcionamentos: uma linha por item, "quando -> fazer"
 * (aceita "->", "=>" ou "|"). Linha sem separador é ignorada.
 */
export function lerDirecionamentos(texto: string): Direcionamento[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s*(?:->|=>|\|)\s*(.+)$/);
      return m ? { quando: m[1].trim(), fazer: m[2].trim() } : null;
    })
    .filter((d): d is Direcionamento => !!d && !!d.quando && !!d.fazer);
}

export function direcionamentosParaTexto(lista: Direcionamento[]): string {
  return lista.map((d) => `${d.quando} -> ${d.fazer}`).join("\n");
}

/** Bloco das orientações da dona do perfil, pro system prompt das respostas geradas. */
export function blocoOrientacoesDaDona(config: AutomacaoConfig): string {
  const partes: string[] = [];
  if (config.voz) partes.push(`COMO A DONA DO PERFIL FALA (imite este jeito):\n${config.voz}`);
  if (config.instrucoes_etica) {
    partes.push(`QUANDO PEDIREM ORIENTAÇÃO, DOSE OU PRESCRIÇÃO (regra da dona do perfil, além da lei):\n${config.instrucoes_etica}`);
  }
  if (config.direcionamentos.length > 0) {
    partes.push(
      "DIRECIONAMENTOS (se a intenção da pessoa bater com um destes, conduza a conversa pra ele, sem forçar):\n" +
        config.direcionamentos.map((d) => `- Quando ${d.quando}: ${d.fazer}`).join("\n"),
    );
  }
  return partes.join("\n\n");
}
