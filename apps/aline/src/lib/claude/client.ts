import Anthropic from "@anthropic-ai/sdk";
import { semTravessoes } from "@/lib/texto/sem-travessoes";

/**
 * Cliente do Claude com a trava de travessão embutida.
 *
 * A regra "nenhum conteúdo sai com travessão" (Aline, 26/08/2026) estava só
 * nos prompts e em alguns pontos de parse, e voltou a escapar pelos agentes
 * que montavam o cliente na mão (Aline, 08/09/2026). Prompt é pedido, parse é
 * caso a caso; aqui é o único lugar por onde TODA resposta passa.
 *
 * Cópia idêntica em apps/franquias/src/lib/claude/client.ts — mudou aqui,
 * mude lá. (CLAUDE_MODEL deste app vive em lib/claude/scripts.ts.)
 */
export function createClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  const client = new Anthropic({ apiKey });

  const createOriginal = client.messages.create.bind(client.messages);
  client.messages.create = (async (...args: Parameters<typeof createOriginal>) => {
    const resposta = await createOriginal(...args);
    // Streaming não passa por aqui (não tem `content` pronto): sai intacto.
    const blocos = (resposta as { content?: unknown }).content;
    if (Array.isArray(blocos)) {
      (resposta as { content: unknown[] }).content = blocos.map((b) => {
        const bloco = b as { type?: string; text?: string };
        return bloco?.type === "text" && typeof bloco.text === "string"
          ? { ...bloco, text: semTravessoes(bloco.text) }
          : b;
      });
    }
    return resposta;
  }) as typeof client.messages.create;

  return client;
}
