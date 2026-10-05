/**
 * O que fazer com o erro que a Meta devolveu num envio.
 *
 * 🔴 ISTO EXISTE POR CAUSA DE UM INCIDENTE REAL (29/09/2026). A Meta
 * respondeu `500 {"error":{"message":"An unknown error has occurred.",
 * "type":"OAuthException","code":1}}` numa resposta privada a comentário —
 * E ENTREGOU A MENSAGEM DO MESMO JEITO. O código acreditou no erro, tentou de
 * novo, e a pessoa recebeu a mesma coisa duas vezes. Pior: o registro de
 * saída só era escrito depois do envio "dar certo", então:
 *
 *   - `uma_vez_por_contato` ficou cego (mandou de novo na próxima vez);
 *   - o eco da nossa própria mensagem voltou sem registro pra casar, o robô
 *     leu como se fosse a Aline escrevendo, e TRAVOU 23 contatos;
 *   - as opções do botão nunca foram gravadas, então quem respondeu não casou
 *     com nada.
 *
 * Daí a régua: erro de envio tem TRÊS desfechos, não dois.
 *
 *   entregue        — a Meta confirmou (200).
 *   sem_confirmacao — a Meta reclamou mas pode ter entregue. NÃO repetir, e
 *                     registrar como se tivesse saído: repetir é o defeito
 *                     que a pessoa vê, e registro a menos trava contato.
 *   recusado        — a Meta rejeitou o pedido (janela fechada, permissão,
 *                     cota). Não saiu nada, e pode ser tentado outra vez.
 */

export type Desfecho = "entregue" | "sem_confirmacao" | "recusado";

/** Status HTTP que o `chamar()` da api.ts carimba no texto do erro. */
function statusDoErro(mensagem: string): number | null {
  // "Instagram API POST /me/messages: 500 {...}"
  const m = mensagem.match(/:\s(\d{3})\s/);
  return m ? Number(m[1]) : null;
}

/**
 * O código 1 da Meta ("An unknown error has occurred") é o erro que ela usa
 * quando não sabe o que dizer — e é justamente o que vem junto da entrega que
 * aconteceu. Vale como "não sei" em qualquer status.
 */
function ehErroDesconhecidoDaMeta(mensagem: string): boolean {
  return /"code"\s*:\s*1\b/.test(mensagem) || /an unknown error has occurred/i.test(mensagem);
}

export function desfechoDaFalha(mensagem: string): Exclude<Desfecho, "entregue"> {
  if (ehErroDesconhecidoDaMeta(mensagem)) return "sem_confirmacao";
  const status = statusDoErro(mensagem);
  // Sem status: a chamada nem voltou (rede, timeout). Pode ter chegado lá.
  if (status === null) return "sem_confirmacao";
  if (status >= 500) return "sem_confirmacao";
  return "recusado";
}

/**
 * Como o registro de saída fica em cada desfecho.
 *
 * 🔴 `regra_id` é o que faz `uma_vez_por_contato` valer. Em `recusado` ele
 * SAI (null): nada foi entregue, e a pessoa tem direito de receber quando
 * escrever de novo. Em `sem_confirmacao` ele FICA: provavelmente recebeu, e
 * mandar de novo é o defeito visível.
 */
export function registroDoDesfecho(
  desfecho: Desfecho,
  origem: string,
  regraId: string | undefined,
): { origem: string; regraId: string | undefined; precisaConferir: boolean } {
  if (desfecho === "entregue") return { origem, regraId, precisaConferir: false };
  if (desfecho === "sem_confirmacao") {
    return { origem: `${origem}:sem_confirmacao`, regraId, precisaConferir: true };
  }
  return { origem: `falha_envio:${origem}`, regraId: undefined, precisaConferir: true };
}

/**
 * Os status que a linha da FILA aceita. É a lista do CHECK
 * `ig_fila_status_check` no banco.
 *
 * 🔴 ISTO EXISTE POR CAUSA DE UM SEGUNDO INCIDENTE REAL (05/10/2026), que foi
 * o conserto acima mal ligado. A fila passou a gravar
 * `status='sem_confirmacao'` — valor que o CHECK RECUSA — e o `marcar()` não
 * lia o erro do UPDATE. A linha continuou `pendente`, o cron pegou de novo, e
 * a MESMA resposta privada saiu DEZ vezes, de 5 em 5 minutos, até alguém
 * marcar a linha à mão.
 *
 * A lição: `Desfecho` é vocabulário do CÓDIGO, `status` é vocabulário do
 * BANCO. Os dois nunca são a mesma lista, e a tradução entre eles mora aqui —
 * com o tipo fechado, pra o compilador recusar o valor inventado.
 */
export const STATUS_FILA = ["pendente", "enviado", "falhou", "cancelado"] as const;
export type StatusFila = (typeof STATUS_FILA)[number];

export function ehStatusDeFila(valor: string): valor is StatusFila {
  return (STATUS_FILA as readonly string[]).includes(valor);
}

/**
 * Em que status a linha da fila para, depois de uma tentativa de envio.
 *
 * 🔴 `sem_confirmacao` vira `enviado`, nunca `pendente`: `pendente` É o loop
 * do incidente. E nunca `falhou`, que mentiria no histórico sobre uma
 * mensagem que provavelmente chegou. O motivo verdadeiro fica no campo `erro`
 * da própria linha, pra quem for conferir ler.
 */
export function statusNaFila(desfecho: Desfecho): StatusFila {
  return desfecho === "recusado" ? "falhou" : "enviado";
}
