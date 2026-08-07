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
