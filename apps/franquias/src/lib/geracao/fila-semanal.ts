/**
 * A fila do pacote semanal de posts.
 *
 * 🔴 O DEFEITO QUE ESTE ARQUIVO EXISTE PRA IMPEDIR (medido em 22/09/2026):
 * o cron de domingo percorria TODAS as contas dentro de UMA função de 300s,
 * e cada conta leva ~95s (Claude + criativo, post a post). Deu tempo de três.
 * Medido nos dois domingos seguidos (13/09 e 20/09): as MESMAS três contas
 * às 09:00:38, 09:02:1x e 09:03:42, e depois nada — a função morria no teto
 * de 5 minutos. Gleryston (Consultório de Precisão Avançado, pagante) e
 * Juliana nunca chegavam a ter a vez delas, sem erro nenhum em lugar nenhum.
 *
 * Pior: a ordem era a FÍSICA da tabela (nenhum `order by` na consulta), que
 * põe quem entrou depois no fim. Ou seja, toda cliente nova nascia condenada
 * a ficar no fim de uma fila que nunca chegava ao fim.
 *
 * As duas travas, e o motivo de cada uma:
 *  1. ORDEM DETERMINÍSTICA — quem entrou primeiro vai primeiro, sempre igual.
 *     Ordem física é invisível: ela muda com um UPDATE e ninguém percebe.
 *  2. UMA FUNÇÃO POR CONTA — o pai despacha e cada conta ganha os seus 300s.
 *     É a mesma regra que já vale no Scanner desde 04/09: trabalho pesado não
 *     divide o `maxDuration` com quem o chamou.
 *
 * E a terceira, que não é técnica: quando sobra conta sem processar, isso vai
 * pro relatório e pro log COM NOME. Fila que mata gente em silêncio foi
 * exatamente o que custou três semanas de conteúdo a uma cliente pagante.
 */

export type ContaDaFila = {
  id: string;
  nome_completo: string;
  email: string | null;
  criado_em?: string | null;
};

/** Quantas contas o pai despacha ao mesmo tempo. */
export const LOTE_PARALELO = 5;

/**
 * Até quando o pai abre lote novo. O teto da função é 300s; parar em 240s
 * deixa folga pra montar e devolver o relatório dizendo quem ficou de fora.
 */
export const ORCAMENTO_MS = 240_000;

/**
 * Ordem da fila: a mais antiga primeiro, desempatando por id.
 *
 * O desempate não é capricho — sem ele, duas contas criadas no mesmo instante
 * (importação em lote) voltariam a depender da ordem física, que é o defeito.
 */
export function ordenarFila<T extends ContaDaFila>(contas: readonly T[]): T[] {
  return [...contas].sort((a, b) => {
    const ca = a.criado_em ?? "";
    const cb = b.criado_em ?? "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Quebra a fila em lotes do tamanho pedido, preservando a ordem. */
export function lotesDaFila<T>(fila: readonly T[], tamanho = LOTE_PARALELO): T[][] {
  const n = Math.max(1, Math.floor(tamanho));
  const lotes: T[][] = [];
  for (let i = 0; i < fila.length; i += n) lotes.push(fila.slice(i, i + n));
  return lotes;
}

/**
 * Ainda dá pra abrir mais um lote?
 *
 * A pergunta é feita ANTES do lote, não depois: começar um lote que não vai
 * caber é o mesmo que não começar, só que sem relatório.
 */
export function cabeMaisUmLote(decorridoMs: number, orcamentoMs = ORCAMENTO_MS): boolean {
  return decorridoMs < orcamentoMs;
}

/**
 * A linha que denuncia a fila cortada. `null` quando ninguém ficou pra trás —
 * a ausência de aviso tem que significar "todo mundo foi atendido".
 */
export function avisoFilaCortada(naoProcessadas: readonly ContaDaFila[]): string | null {
  if (naoProcessadas.length === 0) return null;
  const nomes = naoProcessadas
    .map((c) => c.email ?? c.nome_completo ?? c.id)
    .join(", ");
  return `${naoProcessadas.length} conta(s) ficaram sem o pacote da semana por falta de tempo na função: ${nomes}`;
}

/**
 * O despacho falhou de um jeito que significa "a função filha não existe aí"?
 *
 * Só aí vale gerar inline (o comportamento antigo). Erro de geração NÃO entra:
 * repetir inline uma conta que já falhou lá dentro só gasta modelo duas vezes.
 */
export function filhaIndisponivel(status: number): boolean {
  return status === 404 || status === 401 || status === 403 || status === 405;
}

/**
 * A segunda-feira de uma semana, no formato que `semana_ref` usa.
 *
 * Em UTC de propósito: `semana_ref` é uma DATA, e converter pro fuso local
 * do servidor faria a segunda virar domingo às 21h de Brasília.
 */
export function segundaDaSemana(base: Date, deslocamentoSemanas = 0): string {
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  const dia = d.getUTCDay(); // 0 = domingo
  const atrasoAteSegunda = dia === 0 ? 6 : dia - 1;
  d.setUTCDate(d.getUTCDate() - atrasoAteSegunda + deslocamentoSemanas * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * As duas semanas que o admin pode remontar à mão: a que está correndo e a
 * que vem. A de trás não entra — refazer semana que já passou só confunde a
 * tela da nutri com um pacote que ela nunca vai publicar.
 */
export function semanasParaRemontar(agora = new Date()): {
  atual: string;
  proxima: string;
} {
  return {
    atual: segundaDaSemana(agora, 0),
    proxima: segundaDaSemana(agora, 1),
  };
}
