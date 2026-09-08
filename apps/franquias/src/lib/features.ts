/**
 * Flags de recursos que dependem de aprovação/integração EXTERNA.
 *
 * Regra da casa: a nutri nunca vê botão de coisa que o sistema não faz hoje.
 * Recurso que depende de terceiro (Meta, Publer) fica atrás de flag e só
 * aparece quando a integração está de fato configurada.
 *
 * Uso em client component é seguro: `process.env.NEXT_PUBLIC_*` é substituído
 * pelo valor literal no build, então não vaza nada de servidor.
 */

/**
 * Anúncios/Business Manager do Meta (vincular Página do Facebook, criar conta
 * de anúncios, campanhas). Depende de aprovação do app na Meta — enquanto o
 * review não sai, fica DESLIGADO por padrão.
 *
 * Ligar com NEXT_PUBLIC_META_ADS_ATIVO=true quando a aprovação sair.
 */
export function metaAdsAtivo(): boolean {
  return process.env.NEXT_PUBLIC_META_ADS_ATIVO === "true";
}

/**
 * Publicação automática no Instagram via Publer (o caminho que substitui a
 * API do Meta enquanto o review não vem). Só está disponível se a workspace
 * do Publer estiver configurada — sem ela o link de conexão sairia quebrado.
 */
export function publerAtivo(): boolean {
  return !!process.env.NEXT_PUBLIC_PUBLER_WORKSPACE_ID;
}

/** URL de conexão de contas na workspace do Publer (vazia se não configurada). */
export function publerContasUrl(): string {
  const ws = process.env.NEXT_PUBLIC_PUBLER_WORKSPACE_ID;
  return ws ? `https://app.publer.com/workspace/${ws}/settings/accounts` : "";
}

/**
 * Geração automática semanal de posts e de sugestões de conteúdo.
 *
 * LIGADA por padrão. As clientes do Consultório de Precisão esperam o pacote
 * todo domingo — desligar globalmente deixa TODAS sem conteúdo na segunda.
 *
 * 06/09/2026: a pausa pedida pela Aline era só das contas DELA (os 169 posts
 * acumulados eram do perfil Nutri Secrets, gerados antes das regras novas de
 * conteúdo). Uma primeira versão desligou o cron inteiro e tirou o pacote de
 * domingo de todo mundo — por isso a pausa agora é POR CONTA, nunca global.
 *
 * Nada disso chega a publicar sozinho: o cron de publicação exige
 * `status='aprovado'`. O desperdício de uma geração indevida é de crédito de
 * modelo, não de alcance.
 */

/** Contas cuja geração automática está pausada (e-mail em minúsculo). */
const CONTAS_PAUSADAS = new Set<string>([
  // Aline: pausada a pedido dela em 06/09/2026 até o gerador aprender as
  // regras de docs/REGRAS-CONTEUDO.md. Religar tirando desta lista.
  "clinicanutrisecrets@gmail.com",
]);

/**
 * Freio de emergência para TODAS as contas. Só a string exata 'false' desliga
 * (nem 'FALSE', nem '0'), pra ninguém achar que pausou sem ter pausado —
 * e o padrão, sem env nenhuma, é a geração LIGADA.
 */
export function geracaoAutomaticaAtiva(): boolean {
  return process.env.GERACAO_AUTOMATICA_ATIVA !== "false";
}

/** true quando a geração automática está pausada para esta conta. */
export function geracaoPausadaParaConta(email: string | null | undefined): boolean {
  if (!geracaoAutomaticaAtiva()) return true;
  return CONTAS_PAUSADAS.has((email ?? "").trim().toLowerCase());
}
