/**
 * Travas de segurança do robô do Instagram que não dependem de banco nem de
 * rede (puras, testadas em tests/robo-seguranca.test.ts).
 *
 * Nasceu da auditoria de 06/11/2026, feita antes de desligar o ManyChat. A
 * Aline: *"principalmente na comunicação das respostas do direct, não pode ter
 * erro"*. Cada função aqui fecha um caminho em que o robô respondia quem não
 * devia, ou mandava texto que ela nunca escreveria.
 *
 * Sem import de propósito: o teste roda com `node --test` direto no arquivo.
 */

function normalizar(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ── 1. Crise e evento agudo (ROBO-INSTAGRAM.md, seção 3) ─────────────── */

/**
 * Sofrimento dirigido a si: autolesão, ideação, desejo de morrer. É o único
 * caso que precisa de gente de verdade na hora. Lista de FRASES, não de
 * palavras soltas: "morrer de rir" e "quero sumir do grupo" não entram.
 */
const CRISE = [
  "me matar", "me mata", "tirar minha vida", "tirar a minha vida", "acabar com minha vida",
  "acabar com a minha vida", "nao quero mais viver", "quero morrer", "vontade de morrer",
  "pensando em morrer", "penso em morrer", "suicid", "me cortar", "me corto", "me machucar",
  "me machuco", "automutil", "auto mutil", "nao aguento mais viver", "melhor eu nao existir",
  "queria nao existir", "quero sumir", "sem vontade de viver", "desistir de tudo", "desistir da vida",
  "nao vejo sentido em viver", "provocar o vomito", "provocando o vomito", "provoco o vomito",
  "vomitar depois de comer", "vomito depois de comer", "me fazer vomitar", "forcar o vomito",
];

/** Evento acontecendo AGORA. "Eu tenho X" é condição; "estou com X agora" é evento. */
const AGUDO = [
  "dor no peito", "aperto no peito", "falta de ar", "nao consigo respirar", "nao estou conseguindo respirar",
  "estou sangrando", "to sangrando", "sangrando muito", "desmaiei", "desmaiando", "vou desmaiar",
  "convulsao", "convulsionando", "reacao alergica forte", "garganta fechando", "inchou a garganta",
  "lingua inchada", "boca inchada", "vomitando sangue", "sangue nas fezes agora", "perdi a consciencia",
  "overdose", "tomei muitos comprimidos", "tomei remedio demais",
];

export type Risco = "crise" | "agudo";

export function situacaoDeRisco(texto: string): Risco | null {
  const t = normalizar(texto);
  if (!t) return null;
  // "morrer de rir", "morrendo de rir/fome/vergonha" é figura de linguagem.
  const semFigura = t.replace(/morr\w* de (rir|fome|vergonha|saudade|amor|calor|frio|sono|tedio|inveja)/g, "");
  if (CRISE.some((f) => semFigura.includes(f))) return "crise";
  if (AGUDO.some((f) => semFigura.includes(f))) return "agudo";
  return null;
}

/**
 * O que sai no direct. Curto, sem hipótese, sem "urgente", e com a porta
 * aberta. CVV 188 e SAMU 192 são serviços públicos, gratuitos e 24 h.
 * Nunca no comentário público: lá o robô fica calado e avisa a Aline.
 */
/** Alguma chave geral que faz o robô falar está ligada? */
export function algumaChaveDeResposta(c: { agradecer_comentarios?: boolean; responder_dm_scanner?: boolean; reagir_com_coracao?: boolean }): boolean {
  return !!(c.agradecer_comentarios || c.responder_dm_scanner || c.reagir_com_coracao);
}

export const TEXTO_CRISE =
  "Obrigada por me contar, de verdade. Você não está só nisso 💛\n\n" +
  "Agora o mais importante é você conversar com alguém. O CVV atende 24 horas, de graça, pelo telefone 188 ou pelo chat em cvv.org.br. " +
  "Se você estiver em perigo agora, ligue 192.\n\n" +
  "A sua mensagem chegou até mim.";

// Revisão de 06/11: dor no peito e falta de ar pedem ação clara, não "vale procurar".
export const TEXTO_AGUDO =
  "Isso precisa de atendimento agora. Ligue 192 ou vá a um pronto atendimento.\n\n" +
  "Depois, se quiser cuidar da parte alimentar, o meu time te ajuda por aqui 💛";

/* ── 2. Texto GERADO que não pode sair ───────────────────────────────── */

/**
 * Por que este texto NÃO pode ir pra pessoa, ou null se pode.
 *
 * 🔴 Prompt é pedido, não garantia. Antes de 06/11 só o travessão e o
 * contato inventado eram conferidos depois da geração; "IA", diagnóstico,
 * dose e o JSON cru do modelo saíam se o modelo escorregasse. Quando isto
 * devolve um motivo, o robô NÃO envia e põe a conversa na fila da Aline.
 */
export function motivoParaNaoEnviar(texto: string): string | null {
  const bruto = (texto ?? "").trim();
  if (!bruto) return "texto vazio";
  // Vazamento do formato interno: a pessoa receberia {"resposta": ..., "encaminhar": true}.
  if (/^\s*[{[]/.test(bruto) || /"(resposta|encaminhar|motivo)"\s*:/.test(bruto)) return "o texto saiu no formato interno (JSON)";
  const t = normalizar(bruto);
  // "IA" só em maiúscula: "eu ia te mandar" é verbo, não tecnologia.
  if (/(^|[^\p{L}])(IA|I\.A\.)([^\p{L}]|$)/u.test(bruto) || t.includes("inteligencia artificial") || /(^|[^\p{L}])(robo|bot|chatbot|assistente virtual)([^\p{L}]|$)/u.test(t)) {
    return "o texto fala em IA ou robô";
  }
  if (/\b(claude|anthropic|openai|chatgpt|gpt)\b/.test(t)) return "o texto cita fornecedor de tecnologia";
  // Diagnóstico afirmado sobre a pessoa ("você tem SII", "seu diagnóstico é").
  if (/\bvoce (tem|esta com|sofre de|e) (uma? )?(doenca|sindrome|disturbio|transtorno|diabet|hipotireoid|hashimoto|sii|sibo|sop|endometriose|candidiase|celiac|depress|ansiedade generalizada|esteatose|fibromialgia|lipedema|intolerancia)/.test(t) ||
      /\b(seu|o seu) diagnostico (e|seria|parece)\b/.test(t) || /\bisso (e|parece|deve ser) (um caso de |uma? )?(sindrome|doenca|transtorno)/.test(t)) {
    return "o texto afirma diagnóstico";
  }
  // Dose: número com unidade de suplemento/medicamento.
  if (/\b\d+([.,]\d+)?\s?(mg|mcg|µg|ug|ui|iu|ufc|bilhoes|gotas|capsulas?|comprimidos?)\b/.test(t)) return "o texto traz dose";
  if (/\b(garanto|garantido|cura|curar|vai sumir|resolve de vez|100% eficaz)\b/.test(t)) return "o texto promete resultado";
  return null;
}

/* ── 3. Botões antigos não viram escolha para sempre ──────────────────── */

/**
 * Por quanto tempo uma pergunta com botões continua "aberta".
 *
 * 🔴 Antes de 06/11 `ultimas_opcoes` nunca expirava. Quem comentou "GLP1" e
 * não tocou no botão, e três semanas depois escreveu "paguei e não recebi o
 * acesso", recebia o link do GLP1 (porta única: qualquer texto vira a opção).
 * A janela de 24 h da Meta é o limite natural: depois dela a conversa é outra.
 */
export const VALIDADE_OPCOES_MS = 24 * 60 * 60 * 1000;

export function opcoesAindaValidas(gravadasEm: string | null | undefined, agora = Date.now()): boolean {
  if (!gravadasEm) return false; // gravadas antes de 06/11, sem data: vencidas
  const t = new Date(gravadasEm).getTime();
  if (Number.isNaN(t)) return false;
  return agora - t <= VALIDADE_OPCOES_MS;
}

/* ── 4. Proativo espera o horário (ROBO-INSTAGRAM.md, seção 2) ─────────── */

/** Brasília é UTC-3 o ano todo (sem horário de verão desde 2019). */
const OFFSET_BRT_H = -3;
export const HORA_ABRE = 9;
export const HORA_FECHA = 21;

/**
 * Passo de sequência ("conseguiu ler?") não sai de madrugada. Devolve o
 * instante em que pode sair: o próprio `quando` se já está entre 9h e 21h de
 * Brasília, senão as 9h seguintes. Resposta a quem acabou de escrever NÃO
 * passa por aqui: reativo sai na hora.
 */
export function proximoHorarioComercial(quando: Date): Date {
  const local = new Date(quando.getTime() + OFFSET_BRT_H * 3600_000);
  const h = local.getUTCHours();
  if (h >= HORA_ABRE && h < HORA_FECHA) return quando;
  const alvo = new Date(local);
  if (h >= HORA_FECHA) alvo.setUTCDate(alvo.getUTCDate() + 1);
  alvo.setUTCHours(HORA_ABRE, 0, 0, 0);
  return new Date(alvo.getTime() - OFFSET_BRT_H * 3600_000);
}

/**
 * 🔴 Segurar até as 9h não pode custar a mensagem. O "conseguiu ler?" de 23 h
 * depois cai de madrugada pra quem tocou no botão entre 22h e 10h; esperar as
 * 9h passava das 24 h da Meta e a fila CANCELAVA o passo (o convite pro teste
 * do software se perdia pra metade do dia). Regra: segura só se ainda der
 * tempo; se esperar fecharia a janela, sai agora (melhor de madrugada que nunca).
 */
export function quandoMandarPasso(agora: Date, janelaFechaEm: Date | null, folgaMs = 15 * 60_000): Date {
  const comercial = proximoHorarioComercial(agora);
  if (comercial.getTime() === agora.getTime()) return agora;
  if (janelaFechaEm && comercial.getTime() > janelaFechaEm.getTime() - folgaMs) return agora;
  return comercial;
}

/* ── 5. Quem o robô não procura de novo pela fila ─────────────────────── */

export type EstadoDoContato = {
  silenciado?: boolean | null;
  aline_falou_em?: string | null;
  precisa_humano?: boolean | null;
};

/**
 * Por que um passo de sequência NÃO deve sair, ou null.
 *
 * 🔴 A fila só olhava `silenciado`: se a Aline entrasse na conversa depois do
 * material, o "conseguiu ler?" automático saía por cima dela.
 */
export function motivoParaCancelarPasso(c: EstadoDoContato | null | undefined): string | null {
  if (!c) return "contato não encontrado";
  if (c.silenciado) return "contato silenciado";
  if (c.aline_falou_em) return "a Aline entrou na conversa";
  if (c.precisa_humano) return "a conversa está esperando uma pessoa";
  return null;
}

/* ── 6. A Aline já conversava com esta pessoa antes do robô? ──────────── */

/**
 * 🔴 O eco (`is_echo`) só marca conversa em que a Aline escreve DEPOIS de o
 * webhook existir. A amiga com quem ela conversa há anos, que manda "meu
 * sonho" pela primeira vez desde que o robô ligou, nascia sem trava nenhuma:
 * o incidente de 22/09 (Mariana Uchoa) inteiro de novo.
 *
 * Mensagem da conversa que NÃO é da pessoa e NÃO é do robô é da Aline.
 * `idsDoRobo` são os message_id que a Meta devolveu nos nossos envios;
 * `textosDoRobo` é a rede pra envio cujo id não ficou guardado.
 */
export function alineJaEscreveu(
  mensagens: Array<{ id: string; message?: string; from?: { id: string } }>,
  igsidPessoa: string,
  idsDoRobo: ReadonlySet<string>,
  textosDoRobo: ReadonlySet<string> = new Set(),
): boolean {
  return mensagens.some((m) => {
    const de = m.from?.id;
    if (!de || de === igsidPessoa) return false;
    if (idsDoRobo.has(m.id)) return false;
    if (m.message && textosDoRobo.has(m.message.trim())) return false;
    return true;
  });
}

/* ── 7. E-mail digitado no direct (pra conferir se já é cliente) ──────── */

export function emailNoTexto(texto: string): string | null {
  const m = (texto ?? "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}
