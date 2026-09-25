/**
 * revisor-copy.ts — relê a copy PRONTA e sinaliza o que quebra as regras.
 *
 * Por que existe: instrução em prompt é pedido, não garantia. É a mesma lição
 * que o Scanner aprendeu caro três vezes (as interações medicamentosas, as
 * restrições alimentares do cardápio e o peixe que vazou no título da
 * refeição): o prompt pede, e a conferência determinística DEPOIS é o que
 * garante. O anúncio já tinha revisor; o post não tinha.
 *
 * 🔴 SINALIZA, NUNCA APAGA. Reescrever a legenda em silêncio trocaria um
 * problema visível por um invisível, e quem publica é a profissional.
 *
 * 🔴 Custo ZERO: é regex sobre o texto, não uma segunda chamada de modelo. Um
 * revisor que custasse uma geração por post dobraria a conta da semana pra
 * pegar o que uma regra pega de graça.
 *
 * 🔴 Precisão acima de cobertura. Alarme falso repetido treina a nutri a
 * ignorar o aviso, e aí passa junto o que importa. Cada regra aqui ou é
 * mecânica (`erro`) ou é explicitamente um pedido de conferência (`confira`).
 */

export type Gravidade = "erro" | "confira";

export interface AchadoRevisao {
  /** Identificador estável da regra, pra log e teste. */
  regra: string;
  gravidade: Gravidade;
  /** O pedaço do texto que disparou, como está escrito. */
  trecho: string;
  /** O que fazer, em uma linha, pra quem está olhando o post. */
  motivo: string;
}

export interface ContextoRevisao {
  /** O que ela NÃO atende, como escreveu no onboarding. */
  nao_atende?: string | null;
  /** Palavras e abordagens que ela vetou no cadastro do app. */
  palavras_evitar?: string | null;
  /** Nomes de produto reais; preço citado fora daqui é invenção. */
  precos_reais?: string[];
}

/* ── casamento tolerante a acento, sem perder a posição ─────────────────── */

/**
 * Minúsculas e sem acento, preservando a posição de cada caractere.
 *
 * 🔴 `normalize('NFD')` puro DESLOCA os índices (cada acento vira um
 * caractere a mais), e aí o trecho recortado sai torto. Aqui cada ponto de
 * código do original vira exatamente um do resultado, então o índice do
 * casamento vale nos dois — inclusive com emoji, que legenda de Instagram tem.
 */
export function normPos(s: string): string {
  return Array.from(s)
    .map((c) => {
      // 🔴 `base[0]` cortaria emoji ao meio: ponto de código astral ocupa duas
      // unidades UTF-16, e meia unidade desloca todo índice depois dele.
      const semAcento = Array.from(c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      const um = semAcento.length === 1 ? semAcento[0] : c;
      const minusculo = um.toLowerCase();
      // Alguns caracteres crescem ao minusculizar (İ vira dois pontos de
      // código). Aí vale o original: comprimento igual importa mais que caixa.
      return minusculo.length === um.length ? minusculo : um;
    })
    .join("");
}

/**
 * Fronteira de palavra que funciona em português.
 *
 * 🔴 `\b` NUNCA casa antes de "área" nem depois de "coração": em JavaScript o
 * `\w` é ASCII, então a fronteira cai no meio da palavra acentuada. Isto já
 * mordeu no guard financeiro da Fernanda (04/09).
 */
const ANTES = "(?<![\\p{L}\\p{N}])";
const DEPOIS = "(?![\\p{L}\\p{N}])";

function regraPalavra(termos: string[]): RegExp {
  const alt = termos.map((t) => normPos(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`${ANTES}(?:${alt})${DEPOIS}`, "giu");
}

function achar(texto: string, re: RegExp): { trecho: string; idx: number }[] {
  const alvo = normPos(texto);
  const saida: { trecho: string; idx: number }[] = [];
  for (const m of alvo.matchAll(re)) {
    const i = m.index ?? 0;
    saida.push({ trecho: texto.slice(i, i + m[0].length), idx: i });
  }
  return saida;
}

/** Um pedaço legível em volta do casamento, pra nutri reconhecer onde é. */
function janela(texto: string, idx: number, tam: number): string {
  const ini = Math.max(0, idx - 40);
  const fim = Math.min(texto.length, idx + tam + 40);
  return (ini > 0 ? "…" : "") + texto.slice(ini, fim).trim() + (fim < texto.length ? "…" : "");
}

/* ── vocabulários ───────────────────────────────────────────────────────── */

/** Aberturas que o próprio prompt chama de gancho morto. */
const GANCHOS_MORTOS = [
  "voce sabia que",
  "voce sabia",
  "hoje vamos falar sobre",
  "hoje vou falar sobre",
  "nesse post voce vai aprender",
  "neste post voce vai aprender",
  "vamos falar hoje sobre",
];

const SUPERLATIVOS = [
  "milagroso", "milagrosa", "milagre", "infalivel",
  "100% garantido", "cem por cento garantido",
  "unico metodo", "metodo unico", "solucao definitiva", "tratamento definitivo",
];

const PROMESSA_CURA = ["cura", "curar", "cure", "curam", "curado", "curada"];
const ACABA_COM = ["acaba com", "acabe com", "elimina de vez", "resolve de vez", "some de vez", "adeus"];

const SENSACIONALISMO = [
  "cuidado!", "perigo!", "pare agora", "pare agora!", "nunca mais!", "atencao!!!",
  "alerta!", "voce esta se matando", "isso esta te matando",
];

/**
 * Palavras genéricas do domínio: aparecem em toda legenda de nutrição e não
 * distinguem nada.
 *
 * 🔴 Sem esta lista, um "não atende" escrito em prosa ("não realizo
 * atendimento nutricional esportivo...") faria TODO post ser sinalizado por
 * conter "nutricional" ou "alimentar". Alarme que dispara sempre é ruído.
 */
const GENERICAS = new Set([
  "nutricional", "nutricionais", "nutricao", "alimentar", "alimentares", "alimentacao",
  "atendimento", "atendimentos", "acompanhamento", "acompanhamentos", "consulta", "consultas",
  "paciente", "pacientes", "pessoa", "pessoas", "saude", "plano", "planos", "protocolo",
  "realizo", "realiza", "atendo", "atende", "faco", "trabalho", "voltada", "voltado",
  "exclusivamente", "apenas", "somente", "contexto", "fora", "dentro", "geral",
  "casos", "caso", "tipo", "tipos", "area", "areas", "forma", "formas",
]);

const GRAMATICAIS = new Set([
  "de", "da", "do", "das", "dos", "e", "ou", "para", "pra", "por", "com", "sem", "em",
  "no", "na", "nos", "nas", "que", "nao", "a", "o", "as", "os", "um", "uma", "ao", "aos",
  "the", "se", "meu", "minha", "seu", "sua", "este", "esta", "esse", "essa", "alta", "baixa",
]);

/**
 * Tira do "não atende" os termos que valem a pena procurar no texto.
 *
 * 🔴 Palavra com 5 letras ou mais casa por PREFIXO ("gestante" acha
 * "gestantes", "criança" acha "crianças"), porque a copy flexiona e a ficha
 * não. Com 4 letras ou menos exige a palavra inteira: prefixo curto acerta
 * qualquer coisa.
 */
export function termosDoNaoAtende(txt: string | null | undefined): string[] {
  if (!txt) return [];
  const palavras = normPos(txt)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .filter((p) => p.length >= 4)
    .filter((p) => !GRAMATICAIS.has(p) && !GENERICAS.has(p));
  return [...new Set(palavras)].slice(0, 25);
}

function casaTermo(texto: string, termo: string): { trecho: string; idx: number } | null {
  const alvo = normPos(texto);
  const corpo = termo.length >= 5 ? `${termo.slice(0, 5)}\\p{L}{0,12}` : termo;
  const re = new RegExp(`${ANTES}${corpo}${DEPOIS}`, "iu");
  const m = alvo.match(re);
  if (!m || m.index === undefined) return null;
  return { trecho: texto.slice(m.index, m.index + m[0].length), idx: m.index };
}

/* ── o revisor ──────────────────────────────────────────────────────────── */

/**
 * Relê a copy e devolve o que precisa de olho. Lista vazia = nada encontrado
 * pelas regras mecânicas, o que NÃO é um atestado de que o post está bom.
 */
export function revisarCopy(texto: string, ctx: ContextoRevisao = {}): AchadoRevisao[] {
  const achados: AchadoRevisao[] = [];
  const add = (a: AchadoRevisao) => {
    if (!achados.some((x) => x.regra === a.regra && x.trecho === a.trecho)) achados.push(a);
  };
  if (!texto || !texto.trim()) return achados;

  for (const { trecho, idx } of achar(texto, /[—–]/gu)) {
    add({
      regra: "travessao",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: 'Travessão é veto da marca. Troque por vírgula, ponto ou dois-pontos.',
    });
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(["inteligencia artificial", "ia", "ai"]))) {
    add({
      regra: "ia",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: 'A copy nunca diz "IA" nem "inteligência artificial". Se precisar nomear, é "algoritmo Scanner".',
    });
  }
  for (const { trecho, idx } of achar(texto, /[✨]/gu)) {
    add({
      regra: "estrelinha",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "A estrelinha ✨ é o símbolo universal de IA e está vetada na marca.",
    });
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(PROMESSA_CURA))) {
    add({
      regra: "cura",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "Nutrição auxilia, não cura (CFN). Troque por linguagem de convite: 'pode ajudar', 'há evidência de'.",
    });
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(ACABA_COM))) {
    add({
      regra: "promessa_definitiva",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "Promessa de resolver 'de vez' é promessa de resultado. Descreva o processo, não o desfecho garantido.",
    });
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(SUPERLATIVOS))) {
    add({
      regra: "superlativo",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "Palavra proibida pelo CFN em publicidade de nutrição.",
    });
  }

  // Resultado com prazo: só vira achado quando o prazo está perto de um verbo
  // de resultado. "Em 3 dias eu respondo" não é promessa clínica.
  const prazo = /(?<![\p{L}\p{N}])(?:em\s+)?\d{1,3}\s*(?:dias?|semanas?|meses|mes)(?![\p{L}\p{N}])/giu;
  for (const { idx, trecho } of achar(texto, prazo)) {
    const volta = normPos(texto).slice(Math.max(0, idx - 90), idx + trecho.length + 90);
    if (/(emagre|perde|perca|elimin|seca|queim|reduz|resolv|melhor|transform|ganh)/u.test(volta)) {
      add({
        regra: "resultado_com_prazo",
        gravidade: "erro",
        trecho: janela(texto, idx, trecho.length),
        motivo: "Resultado com prazo é proibido (CFN). Tire o prazo ou tire a promessa.",
      });
    }
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(["antes e depois", "antes x depois", "antes/depois"]))) {
    add({
      regra: "antes_e_depois",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "Antes e depois de paciente é proibido, mesmo com consentimento (CFN 856/2026).",
    });
  }

  for (const { trecho, idx } of achar(texto, regraPalavra(SENSACIONALISMO))) {
    add({
      regra: "sensacionalismo",
      gravidade: "erro",
      trecho: janela(texto, idx, trecho.length),
      motivo: "Somos profissionais de saúde: impacto sim, susto não. Se parece manchete de tabloide, reescreva.",
    });
  }

  // Gancho morto: só conta na ABERTURA, que é onde ele mata o post. No meio
  // do texto "você sabia" é conversa normal.
  const abertura = texto.trim().slice(0, 120);
  for (const { trecho, idx } of achar(abertura, regraPalavra(GANCHOS_MORTOS))) {
    add({
      regra: "gancho_morto",
      gravidade: "erro",
      trecho: janela(abertura, idx, trecho.length),
      motivo: "Abertura morta: não para o scroll. Comece pelo sintoma que ela vive ou por uma afirmação específica.",
    });
  }

  if (ctx.palavras_evitar?.trim()) {
    for (const termo of termosDoNaoAtende(ctx.palavras_evitar)) {
      const m = casaTermo(texto, termo);
      if (m) {
        add({
          regra: "palavra_vetada",
          gravidade: "erro",
          trecho: janela(texto, m.idx, m.trecho.length),
          motivo: `Ela pediu pra não usar isso ("${ctx.palavras_evitar!.trim().slice(0, 80)}").`,
        });
      }
    }
  }

  // 🔴 `confira`, não `erro`: o "não atende" é texto livre, e prosa com
  // exceção ("infantil FORA do contexto materno") não dá pra ler por regra.
  // Quem decide é ela; o revisor só não deixa passar batido.
  for (const termo of termosDoNaoAtende(ctx.nao_atende)) {
    const m = casaTermo(texto, termo);
    if (m) {
      add({
        regra: "fora_do_publico",
        gravidade: "confira",
        trecho: janela(texto, m.idx, m.trecho.length),
        motivo: `Ela declarou que não atende: "${ctx.nao_atende!.trim().slice(0, 120)}". Confira se este post fala com quem ela atende.`,
      });
    }
  }

  // Preço que não está no catálogo real é preço inventado.
  const reais = new Set((ctx.precos_reais ?? []).map((p) => normPos(p).replace(/\s+/g, "")));
  if (reais.size > 0 || (ctx.precos_reais && ctx.precos_reais.length === 0)) {
    for (const { trecho, idx } of achar(texto, /r\$\s?\d[\d.,]*/gu)) {
      if (!reais.has(normPos(trecho).replace(/\s+/g, ""))) {
        add({
          regra: "preco_fora_do_catalogo",
          gravidade: "erro",
          trecho: janela(texto, idx, trecho.length),
          motivo: "Este valor não está nos produtos dela. Preço só pode sair do catálogo real.",
        });
      }
    }
  }

  return achados;
}

/** Só o que é erro mecânico — pra decidir se o post precisa de olho urgente. */
export function temErro(achados: AchadoRevisao[]): boolean {
  return achados.some((a) => a.gravidade === "erro");
}

/** Uma linha por achado, pro log do cron. */
export function resumoRevisao(achados: AchadoRevisao[]): string {
  if (achados.length === 0) return "sem achados";
  const porRegra = new Map<string, number>();
  for (const a of achados) porRegra.set(a.regra, (porRegra.get(a.regra) ?? 0) + 1);
  return [...porRegra.entries()].map(([r, n]) => (n > 1 ? `${r}×${n}` : r)).join(", ");
}
