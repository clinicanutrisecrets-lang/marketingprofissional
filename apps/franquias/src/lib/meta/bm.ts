/**
 * Meta Business Manager API — criação de Ad Accounts e request de acesso a Páginas.
 * Usa um System User permanente da BM da Scanner da Saúde.
 *
 * Setup manual (UMA VEZ):
 * 1. business.facebook.com → Configurações → Usuários do sistema → Criar usuário admin
 * 2. Gerar token permanente com escopos: ads_management, business_management, pages_manage_ads
 * 3. Adicionar no env: META_BM_ID e META_BM_SYSTEM_USER_TOKEN
 */

const GRAPH = "https://graph.facebook.com/v21.0";

function getBmId(): string {
  const id = process.env.META_BM_ID;
  if (!id) throw new Error("META_BM_ID não configurado");
  return id;
}

function getSystemToken(): string {
  const token = process.env.META_BM_SYSTEM_USER_TOKEN;
  if (!token) throw new Error("META_BM_SYSTEM_USER_TOKEN não configurado");
  return token;
}

export type AdAccountResult = {
  id: string;       // ex: "act_123456789"
  name: string;
  account_id: string;
};

/**
 * Cria uma Ad Account dentro da BM da Scanner para uma franqueada.
 * Retorna o ID da Ad Account criada.
 */
export async function criarAdAccount(params: {
  nomeFranqueada: string;
  facebookPaginaId?: string;
}): Promise<AdAccountResult> {
  const bmId = getBmId();
  const token = getSystemToken();
  const nome = `${params.nomeFranqueada} — Scanner`;

  const body = new URLSearchParams({
    name: nome,
    currency: "BRL",
    timezone_id: "1", // America/Sao_Paulo = timezone_id 1 no Meta
    end_advertiser: params.facebookPaginaId ?? bmId,
    media_agency: bmId,
    partner: "NONE",
    access_token: token,
  });

  const res = await fetch(`${GRAPH}/${bmId}/adaccount`, {
    method: "POST",
    body,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message ?? `criarAdAccount: ${res.status} ${JSON.stringify(data)}`,
    );
  }

  return {
    id: data.id,          // "act_XXXXXXXXX"
    name: nome,
    account_id: data.id.replace("act_", ""),
  };
}

/**
 * Solicita acesso à Página do Facebook de uma franqueada para a BM da Scanner.
 * O admin da Página recebe um e-mail do Facebook para aceitar.
 */
export async function solicitarAcessoPagina(params: {
  facebookPaginaId: string;
}): Promise<{ ok: boolean }> {
  const bmId = getBmId();
  const token = getSystemToken();

  const body = new URLSearchParams({
    page_id: params.facebookPaginaId,
    permitted_tasks: JSON.stringify(["ADVERTISE", "ANALYZE", "CREATE_CONTENT"]),
    access_token: token,
  });

  const res = await fetch(`${GRAPH}/${bmId}/client_pages`, {
    method: "POST",
    body,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    // "Already requested" não é erro fatal
    if (data.error?.code === 3918003) return { ok: true };
    throw new Error(
      data.error?.message ?? `solicitarAcessoPagina: ${res.status}`,
    );
  }

  return { ok: true };
}

/**
 * Extrai o ID de uma Página do Facebook a partir do URL da página.
 * Ex: https://www.facebook.com/scannerdasaude → chama a API para resolver o ID
 */
export async function resolverPaginaId(paginaUrl: string): Promise<string> {
  const token = getSystemToken();

  // Extrai o slug do URL
  const slug = paginaUrl
    .replace(/https?:\/\/(www\.)?facebook\.com\//, "")
    .replace(/\/$/, "")
    .split("?")[0]
    .split("/")[0];

  const res = await fetch(
    `${GRAPH}/${encodeURIComponent(slug)}?fields=id&access_token=${token}`,
  );
  const data = await res.json();
  if (!res.ok || data.error || !data.id) {
    throw new Error(
      data.error?.message ?? "Não conseguimos encontrar essa Página do Facebook. Verifique o link.",
    );
  }
  return data.id as string;
}
