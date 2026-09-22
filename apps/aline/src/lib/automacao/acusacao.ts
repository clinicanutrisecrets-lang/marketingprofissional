/**
 * Acusação pública ("isso é charlatanismo") — responde UMA vez, e só.
 *
 * 🔴 Decisão da Aline (22/09/2026), depois de apagar um "Charlatanismo, é o
 * nome disso" num anúncio pago: *"responde sozinho só uma vez por pessoa"*.
 * Se a pessoa rebater, o robô CALA e avisa ela. O pior caso aqui não é ficar
 * sem resposta: é o robô discutindo em público, em nome dela, com quem veio
 * para brigar. Discussão automática sempre vira print.
 *
 * A primeira resposta é automática porque acusação em anúncio pago é lida por
 * estranhos, e silêncio nesse contexto parece concordância. A segunda não é,
 * porque a partir dali deixou de ser esclarecimento e virou discussão.
 *
 * O mecanismo reusa o que já existe: a regra tem `uma_vez_por_contato` (que
 * já impede o segundo disparo) e carimba a TAG abaixo no contato. Daí em
 * diante qualquer mensagem dessa pessoa cai aqui.
 */

/** Carimbo que a regra de acusação põe no contato (campo `tags_adicionar`). */
export const TAG_ACUSACAO = "acusacao";

export function contatoJaAcusou(tags: string[] | null | undefined): boolean {
  return (tags ?? []).some((t) => t.trim().toLowerCase() === TAG_ACUSACAO);
}

export type DecisaoAcusacao =
  | { acao: "seguir" }
  | { acao: "calar_e_avisar"; motivo: string };

/**
 * O que fazer com uma mensagem de quem JÁ recebeu a resposta de acusação.
 *
 * `regraDisparou` = alguma regra tratou esta mensagem. Se tratou, é pedido de
 * material com palavra-chave ("GLP1"), e isso continua valendo: quem acusou
 * ontem pode querer o material hoje, e material é texto fixo, não discussão.
 */
export function decidirAposAcusacao(p: {
  tags: string[] | null | undefined;
  regraDisparou: boolean;
}): DecisaoAcusacao {
  if (!contatoJaAcusou(p.tags)) return { acao: "seguir" };
  if (p.regraDisparou) return { acao: "seguir" };
  return {
    acao: "calar_e_avisar",
    motivo: "já recebeu a resposta sobre a acusação e escreveu de novo",
  };
}

/**
 * Vocabulário da acusação, pra palavra-chave da regra.
 *
 * ⚠️ ESTREITO de propósito. Cada termo aqui é uma acusação direta ao trabalho
 * dela. Palavra ambígua ("golpe", "mentira", "furada") fica FORA: quem
 * comenta "caí num golpe de outra clínica" receberia a defesa dela como
 * resposta, o que é pior que não responder. Ampliar isto é decisão dela.
 */
export const PALAVRAS_ACUSACAO = [
  // A comparação normaliza acento dos DOIS lados, então "charlatao" pega
  // "charlatão". Mas o casamento é por PALAVRA INTEIRA: plural e feminino
  // precisam de entrada própria, e hífen não é o mesmo que espaço.
  "charlatanismo",
  "charlatanismos",
  "charlatanice",
  "charlatao",
  "charlatã",
  "charlatoes",
  "pseudociencia",
  "pseudo ciencia",
  "pseudo-ciencia",
  "picaretagem",
  "estelionato",
];

/* ── Peneira de duas etapas ──────────────────────────────────────────────
 *
 * 🔴 Pergunta da Aline (22/09/2026): *"a gente já não tinha confirmado que a
 * IA ia interpretar a frase, não só buscar por palavra-chave? Porque às vezes
 * pode interpretar errado, dependendo do contexto."*
 *
 * Ela está certa, e aqui o erro tem uma direção perigosa que as regras de
 * material não têm. Entregar um PDF pra quem não pediu é barato. Responder
 * "Genética é ciência, é o meu mestrado" pra quem só perguntou "isso tem
 * estudo?" é agredir uma seguidora curiosa em público.
 *
 * Por isso a decisão não é da palavra: é de duas etapas.
 *
 *   1. SUSPEITA (de graça, aqui): a frase tem alguma marca de ataque ou de
 *      descrédito? Rede LARGA de propósito, porque quem decide é a etapa 2.
 *      Entram até termos ambíguos ("golpe", "mentira") que a lista estreita
 *      de cima não podia conter.
 *   2. LEITURA (uma chamada curta, só pra quem passou na 1): é ACUSAÇÃO ao
 *      trabalho dela, DÚVIDA legítima, ou nenhum dos dois?
 *
 * Dúvida legítima NUNCA recebe a defesa. Vai pra fila dela, que responde
 * como quiser. Acusação recebe a resposta uma vez, e só.
 */

/**
 * Etapa 1: vale gastar uma leitura nesta frase?
 *
 * ⚠️ LARGA de propósito, ao contrário de PALAVRAS_ACUSACAO. Aqui um falso
 * positivo custa uma chamada curta e a etapa 2 descarta; um falso negativo
 * deixa passar uma acusação escrita com outras palavras, que é o defeito que
 * a Aline apontou. Só acusação e descrédito entram: elogio e pedido de
 * material não têm por que chegar aqui.
 */
const MARCAS_DE_SUSPEITA = [
  ...PALAVRAS_ACUSACAO,
  "charlata", "picareta", "picaretas",
  "enganacao", "enganando", "engana", "enganar", "enganou",
  "mentira", "mentiroso", "mentirosa", "mentindo",
  "farsa", "fraude", "golpe", "golpista", "lorota", "conto do vigario",
  "sem base", "nao tem base", "sem comprovacao", "nao comprovado",
  "sem evidencia", "nao tem evidencia", "sem respaldo",
  "vender ilusao", "vendendo ilusao", "ilusao",
  "modinha", "balela", "furada", "papo furado", "so marketing",
  "nao funciona", "nao existe isso", "isso e mito", "e mito",
];

/** A frase pede uma leitura? (etapa 1, sem custo) */
export function suspeitaDeAcusacao(
  texto: string,
  casa: (texto: string, palavras: string[]) => boolean,
): boolean {
  if (!texto.trim()) return false;
  return casa(texto, MARCAS_DE_SUSPEITA);
}

/** Resultado da etapa 2. */
export type LeituraAcusacao = "acusacao" | "duvida" | "nenhum";

export type AcaoSuspeita =
  | { acao: "responder_acusacao" }
  | { acao: "mandar_pra_ela"; motivo: string }
  | { acao: "seguir" };

/**
 * O que fazer com o que a leitura devolveu.
 *
 * 🔴 `duvida` jamais recebe a defesa. Quem pergunta de boa-fé e leva um
 * "Genética é ciência, é o meu mestrado" vira inimigo em público, e a
 * conversa que daria uma cliente vira um print.
 *
 * 🔴 Leitura que falhou (`null`) também vai pra ela. Na dúvida sobre o TOM,
 * quem decide é gente: responder por engano é irreversível, esperar não é.
 */
export function acaoParaLeitura(leitura: LeituraAcusacao | null): AcaoSuspeita {
  if (leitura === "acusacao") return { acao: "responder_acusacao" };
  if (leitura === "duvida") {
    return { acao: "mandar_pra_ela", motivo: "questionou a base científica, sem ofender: vale a sua resposta" };
  }
  if (leitura === null) {
    return { acao: "mandar_pra_ela", motivo: "não deu pra ler o tom da mensagem" };
  }
  return { acao: "seguir" };
}
