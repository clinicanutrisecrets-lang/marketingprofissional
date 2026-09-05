/**
 * Cliente mínimo da API do Instagram usado pelo robô (comentários, DMs,
 * webhooks, token) — funciona nos DOIS logins:
 *
 *   - login direto do Instagram (app "Automacao NS"): base graph.instagram.com,
 *     caminhos com /me/...; é o caminho da Nutri Secrets.
 *   - login pela Página do Facebook (app antigo do Scanner): base
 *     graph.facebook.com, caminhos com o IG user id.
 *
 * Toda chamada joga erro com o corpo da Meta — quem chama decide se engole.
 */

export const IG_API_VERSION = "v21.0";

export type LoginTipo = "facebook" | "instagram";

export type Credenciais = {
  loginTipo: LoginTipo;
  /** id usado nos caminhos (/{id}/messages). No login do Instagram é 'me'. */
  pathId: string;
  token: string;
};

export function apiBase(loginTipo: LoginTipo): string {
  return loginTipo === "instagram"
    ? `https://graph.instagram.com/${IG_API_VERSION}`
    : `https://graph.facebook.com/${IG_API_VERSION}`;
}

async function chamar<T>(
  cred: Credenciais,
  caminho: string,
  init: { method?: "GET" | "POST"; query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${apiBase(cred.loginTipo)}/${caminho.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  url.searchParams.set("access_token", cred.token);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`Instagram API ${init.method ?? "GET"} /${caminho}: ${res.status} ${texto}`);
  return (texto ? JSON.parse(texto) : {}) as T;
}

/* ── Conta ────────────────────────────────────────────────────────────── */

export type MeInstagram = {
  id: string; // app-scoped
  user_id?: string; // id da conta profissional (entry.id dos webhooks)
  username?: string;
  name?: string;
  account_type?: string;
};

export async function obterMe(cred: Credenciais): Promise<MeInstagram> {
  return chamar<MeInstagram>(cred, "me", {
    query: { fields: "id,user_id,username,name,account_type" },
  });
}

/** Assina os campos de webhook pra esta conta (login do Instagram). */
export async function assinarWebhooks(cred: Credenciais): Promise<void> {
  await chamar(cred, `${cred.pathId}/subscribed_apps`, {
    method: "POST",
    query: {
      subscribed_fields: "comments,messages,messaging_postbacks,messaging_seen",
    },
  });
}

/** Renova token longo do login do Instagram (precisa ter ≥ 24h). */
export async function renovarTokenLongo(token: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`https://graph.instagram.com/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`refresh_access_token: ${res.status} ${await res.text()}`);
  return res.json();
}

/* ── Mensagens ────────────────────────────────────────────────────────── */

export type BotaoRapido = { title: string; payload: string };

function mensagemComBotoes(texto: string, botoes?: BotaoRapido[]) {
  const quick = (botoes ?? []).slice(0, 13).map((b) => ({
    content_type: "text",
    title: b.title.slice(0, 20),
    payload: b.payload.slice(0, 1000),
  }));
  return quick.length > 0 ? { text: texto, quick_replies: quick } : { text: texto };
}

export async function enviarDm(
  cred: Credenciais,
  igsid: string,
  texto: string,
  botoes?: BotaoRapido[],
): Promise<{ message_id?: string }> {
  return chamar(cred, `${cred.pathId}/messages`, {
    method: "POST",
    body: { recipient: { id: igsid }, message: mensagemComBotoes(texto, botoes) },
  });
}

/** Resposta privada a um comentário (vira DM). Só UMA por comentário, em até 7 dias. */
export async function respostaPrivadaComentario(
  cred: Credenciais,
  commentId: string,
  texto: string,
  botoes?: BotaoRapido[],
): Promise<{ message_id?: string }> {
  return chamar(cred, `${cred.pathId}/messages`, {
    method: "POST",
    body: { recipient: { comment_id: commentId }, message: mensagemComBotoes(texto, botoes) },
  });
}

/* ── Comentários ──────────────────────────────────────────────────────── */

export async function responderComentario(cred: Credenciais, commentId: string, texto: string): Promise<{ id?: string }> {
  return chamar(cred, `${commentId}/replies`, { method: "POST", query: { message: texto } });
}

/* ── Perfil de quem escreveu ──────────────────────────────────────────── */

export type PerfilUsuario = { name?: string; username?: string };

/** Nome/username de um IGSID. Falha vira vazio: é só pra personalizar texto. */
export async function obterPerfilUsuario(cred: Credenciais, igsid: string): Promise<PerfilUsuario> {
  try {
    return await chamar<PerfilUsuario>(cred, igsid, { query: { fields: "name,username" } });
  } catch {
    return {};
  }
}

/* ── Leitura do próprio conteúdo (pra mapear a voz da dona) ───────────── */

export type MidiaResumo = { id: string; caption?: string; timestamp?: string; media_type?: string };

export async function listarMidias(cred: Credenciais, limite = 20): Promise<MidiaResumo[]> {
  const r = await chamar<{ data?: MidiaResumo[] }>(cred, `${cred.pathId}/media`, {
    query: { fields: "id,caption,timestamp,media_type", limit: String(limite) },
  });
  return r.data ?? [];
}

export type ComentarioComRespostas = {
  id: string;
  text?: string;
  username?: string;
  replies?: { data?: Array<{ id: string; text?: string; username?: string }> };
};

export async function listarComentarios(cred: Credenciais, mediaId: string, limite = 30): Promise<ComentarioComRespostas[]> {
  const r = await chamar<{ data?: ComentarioComRespostas[] }>(cred, `${mediaId}/comments`, {
    query: { fields: "id,text,username,replies{id,text,username}", limit: String(limite) },
  });
  return r.data ?? [];
}
