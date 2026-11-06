/**
 * O conhecimento técnico mora no SCANNER (base_conhecimento, genes, microbiota,
 * exames). O robô do Estúdio pergunta pra lá por API com o bearer
 * STUDIO_CONHECIMENTO_SECRET (mesmo valor na Vercel do scanner-saude-b1jf e do
 * studio-aline). MARKETING_WEBHOOK_SECRET vale como reserva.
 *
 * Fail-safe: sem env, sem rede ou erro → contexto vazio e o modelo responde
 * só com o que sabe do perfil, avisando que vai confirmar com a equipe.
 */

export type ContextoScanner = { blocos: string; totalRegistros: number; disponivel: boolean };

export async function buscarConhecimentoScanner(pergunta: string): Promise<ContextoScanner> {
  const base = (process.env.SCANNER_API_URL ?? "https://scannerdasaude.com").replace(/\/$/, "");
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[automacao/scanner] STUDIO_CONHECIMENTO_SECRET ausente — respondendo sem a base do Scanner");
    return { blocos: "", totalRegistros: 0, disponivel: false };
  }
  const url = new URL(`${base}/api/integrations/marketing/conhecimento`);
  url.searchParams.set("q", pergunta.slice(0, 500));
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[automacao/scanner] conhecimento respondeu", res.status, (await res.text()).slice(0, 200));
      return { blocos: "", totalRegistros: 0, disponivel: false };
    }
    const json = (await res.json()) as { blocos?: string; total?: number };
    return { blocos: json.blocos ?? "", totalRegistros: json.total ?? 0, disponivel: true };
  } catch (e) {
    console.error("[automacao/scanner] falha ao consultar conhecimento:", (e as Error).message);
    return { blocos: "", totalRegistros: 0, disponivel: false };
  }
}

/* ── Catálogo de produtos (a vendedora do direct, 06/11/2026) ─────────── */

/**
 * Produtos, preços, condições, o que inclui e links da Clínica Nutri Secrets,
 * montados pelo SCANNER a partir da loja (`/api/integrations/marketing/catalogo`).
 * O Estúdio não guarda preço: mudou na loja, muda aqui.
 *
 * Cache de 10 minutos por instância: uma conversa animada não bate na loja a
 * cada mensagem. Falhou: devolve vazio, e o prompt manda NÃO falar de preço
 * nem de link de compra sem catálogo (a pessoa vai pra Helô).
 */
let cacheCatalogo: { em: number; blocos: string } | null = null;
const CATALOGO_TTL_MS = 10 * 60_000;

export async function buscarCatalogoScanner(agora = Date.now()): Promise<{ blocos: string; disponivel: boolean }> {
  if (cacheCatalogo && agora - cacheCatalogo.em < CATALOGO_TTL_MS) return { blocos: cacheCatalogo.blocos, disponivel: true };
  const base = (process.env.SCANNER_API_URL ?? "https://scannerdasaude.com").replace(/\/$/, "");
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return { blocos: "", disponivel: false };
  try {
    const res = await fetch(`${base}/api/integrations/marketing/catalogo`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[automacao/catalogo] o Scanner respondeu", res.status, (await res.text()).slice(0, 200));
      return { blocos: "", disponivel: false };
    }
    const json = (await res.json()) as { blocos?: string };
    const blocos = (json.blocos ?? "").trim();
    if (!blocos) return { blocos: "", disponivel: false };
    cacheCatalogo = { em: agora, blocos };
    return { blocos, disponivel: true };
  } catch (e) {
    console.error("[automacao/catalogo] falha ao buscar o catálogo:", (e as Error).message);
    return { blocos: "", disponivel: false };
  }
}

/* ── Já é cliente? (a closer do direct, 06/11/2026) ───────────────────── */

export type SituacaoCliente =
  | { confirmado: false }
  | { confirmado: true; paciente: boolean; tem_genetico: boolean; tem_epigenetico: boolean; comprou_lotus: boolean };

/**
 * Pergunta ao Scanner se o e-mail que a pessoa digitou no direct é de
 * cliente, conferindo também o primeiro nome do Instagram (régua de LGPD em
 * scanner-saude/lib/direct-cliente.ts). Falhou a consulta: null (a conversa
 * segue como pessoa nova, que é o lado seguro).
 */
export async function conferirCliente(p: { email: string; nome?: string | null; username?: string | null }): Promise<SituacaoCliente | null> {
  const base = (process.env.SCANNER_API_URL ?? "https://scannerdasaude.com").replace(/\/$/, "");
  const secret = process.env.STUDIO_CONHECIMENTO_SECRET ?? process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch(`${base}/api/integrations/marketing/cliente`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(p),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[automacao/cliente] o Scanner respondeu", res.status);
      return null;
    }
    const j = (await res.json()) as SituacaoCliente;
    return typeof j?.confirmado === "boolean" ? j : null;
  } catch (e) {
    console.error("[automacao/cliente] falha ao conferir:", (e as Error).message);
    return null;
  }
}
