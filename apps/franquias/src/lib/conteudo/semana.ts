/**
 * A semana de referência do pacote de conteúdo — em UM lugar só.
 *
 * 🔴 Por que este arquivo existe: `proximaSegunda()` estava escrito à mão em
 * dois lugares (o painel e a server action), e os dois miravam a semana QUE
 * VEM. Numa segunda-feira isso significa uma semana futura e vazia:
 *   • o painel mostrava "0 Sugestões da semana" com o pacote da semana
 *     listado no Estúdio logo ao lado (Juliana, 17/08);
 *   • a action nunca batia na semana exibida, então a mensagem "semana já tem
 *     sugestões" nunca disparava e o botão 🔄 Regerar nunca aparecia — não
 *     havia como refazer um pacote.
 * Toda tela que fala de "a semana" importa daqui.
 *
 * Fuso: America/São Paulo aproximado por UTC-3 (o app não tem horário de
 * verão pra tratar). Segunda é o início da semana em todo o produto.
 */

function emSaoPaulo(base?: Date): Date {
  return new Date((base?.getTime() ?? Date.now()) - 3 * 3600 * 1000);
}

/** Segunda-feira DA semana que contém a data (YYYY-MM-DD). */
export function segundaDaSemana(base?: Date): string {
  const agora = emSaoPaulo(base);
  const dow = agora.getUTCDay(); // 0=dom
  const diasDesdeSegunda = dow === 0 ? 6 : dow - 1;
  return new Date(agora.getTime() - diasDesdeSegunda * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** Segunda-feira da PRÓXIMA semana (YYYY-MM-DD). É o que o cron de domingo gera. */
export function proximaSegunda(base?: Date): string {
  const agora = emSaoPaulo(base);
  const dow = agora.getUTCDay();
  const diasAteSegunda = ((8 - dow) % 7) || 7;
  return new Date(agora.getTime() + diasAteSegunda * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
}

/**
 * A semana que o produto considera "a semana" agora — a que o Estúdio lista
 * no topo, a que o painel conta e a que o botão gera/regera.
 *
 * Domingo é dia de gerar: o cron roda às 10h e o pacote já é o da semana que
 * começa amanhã. De segunda a sábado, é a semana que a nutri está vivendo.
 */
export function semanaAlvo(base?: Date): string {
  const dow = emSaoPaulo(base).getUTCDay();
  return dow === 0 ? proximaSegunda(base) : segundaDaSemana(base);
}

/** "17 de agosto" — rótulo curto pra tela. */
export function formatarSemana(semanaRef: string): string {
  return new Date(`${semanaRef}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}
