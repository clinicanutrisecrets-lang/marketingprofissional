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
 * DESLIGADA POR PADRÃO desde 06/09/2026, a pedido da Aline: os crons vinham
 * gerando pacote toda semana pra todas as franqueadas ativas — 169 posts
 * acumulados em `aguardando_aprovacao` — gastando crédito de modelo sem que
 * ninguém tivesse aprovado, e antes das regras novas de conteúdo entrarem.
 *
 * Nada disso chegou a publicar: o cron de publicação exige `status='aprovado'`.
 * O desperdício é de geração, não de alcance.
 *
 * Religar com GERACAO_AUTOMATICA_ATIVA=true (variável de servidor, exige
 * redeploy) quando as regras novas estiverem no gerador.
 */
export function geracaoAutomaticaAtiva(): boolean {
  return process.env.GERACAO_AUTOMATICA_ATIVA === "true";
}
