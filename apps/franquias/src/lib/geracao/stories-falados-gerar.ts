import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClaude, CLAUDE_MODEL_COPY, COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO } from "@/lib/claude/client";
import { comAgenteDeCopy, type PublicoDaCopy } from "@/lib/claude/copy-agent";
import { logarCusto } from "@/lib/custos/log";
import {
  TAREFA_STORIES_FALADOS,
  FERRAMENTA_STORIES,
  conferirStoriesFalados,
  type SequenciaStories,
} from "./stories-falados";

/** Escreve a sequência de 3 stories falados (até 3 tentativas, com o motivo da recusa). */
export async function escreverStoriesFalados(p: {
  franqueadaId: string;
  publico: PublicoDaCopy | null;
  nicho: string | null;
  queixas: string | null;
}): Promise<{ ok: true; sequencia: SequenciaStories } | { ok: false; motivo: string }> {
  const system = comAgenteDeCopy(TAREFA_STORIES_FALADOS, {
    publico: p.publico ?? undefined,
    extras: [COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO],
  });
  const pedido = JSON.stringify({ nicho: p.nicho, queixas_da_semana: p.queixas });
  let ultimo = "";
  for (let t = 0; t < 3; t++) {
    const correcao = ultimo ? `\n\nA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimo}. Refaça.` : "";
    const msg = await createClaude().messages.create({
      model: CLAUDE_MODEL_COPY,
      max_tokens: 2000,
      system,
      tools: [FERRAMENTA_STORIES],
      tool_choice: { type: "tool", name: FERRAMENTA_STORIES.name },
      messages: [{ role: "user", content: pedido + correcao }],
    });
    await logarCusto({
      franqueadaId: p.franqueadaId,
      servico: "claude",
      operacao: "stories_falados",
      modelo: CLAUDE_MODEL_COPY,
      uso: msg.usage,
    });
    if (msg.stop_reason === "max_tokens") { ultimo = "resposta cortada"; continue; }
    const bloco = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!bloco) { ultimo = "sem resposta estruturada"; continue; }
    const c = conferirStoriesFalados(bloco.input);
    if (c.ok) return c;
    ultimo = c.motivo;
  }
  return { ok: false, motivo: ultimo };
}
