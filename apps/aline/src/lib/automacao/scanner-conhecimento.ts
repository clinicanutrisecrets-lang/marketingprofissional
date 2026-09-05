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
