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
