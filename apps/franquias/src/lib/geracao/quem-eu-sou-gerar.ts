import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClaude, CLAUDE_MODEL_COPY, COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO } from "@/lib/claude/client";
import { comAgenteDeCopy, type MarcaDaCopy } from "@/lib/claude/copy-agent";
import type { ContextoRevisao } from "@/lib/claude/revisor-copy";
import { logarCusto } from "@/lib/custos/log";
import { acentuarFundo } from "@/lib/texto/acentos-visivel";
import {
  TAREFA_QUEM_EU_SOU,
  FERRAMENTA_QUEM_EU_SOU,
  conferirQuemEuSou,
  pedidoQuemEuSou,
  type MaterialQuemEuSou,
  type TextosQuemEuSou,
} from "./quem-eu-sou";

/** Escreve os textos do "Quem eu sou" (até 3 tentativas, com o motivo da recusa). */
export async function escreverQuemEuSou(p: {
  franqueadaId: string;
  material: MaterialQuemEuSou;
  marca: MarcaDaCopy;
  revisao: ContextoRevisao;
}): Promise<{ ok: true; textos: TextosQuemEuSou } | { ok: false; motivo: string }> {
  const system = comAgenteDeCopy(TAREFA_QUEM_EU_SOU, {
    marca: p.marca,
    extras: [COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO],
  });
  const pedido = pedidoQuemEuSou(p.material);
  let ultimo = "";
  for (let t = 0; t < 3; t++) {
    const correcao = ultimo ? `\n\nA RESPOSTA ANTERIOR FOI RECUSADA: ${ultimo}. Refaça.` : "";
    const msg = await createClaude().messages.create({
      model: CLAUDE_MODEL_COPY,
      max_tokens: 3000,
      system,
      tools: [FERRAMENTA_QUEM_EU_SOU],
      tool_choice: { type: "tool", name: FERRAMENTA_QUEM_EU_SOU.name },
      messages: [{ role: "user", content: pedido + correcao }],
    });
    await logarCusto({
      franqueadaId: p.franqueadaId,
      servico: "claude",
      operacao: "quem_eu_sou",
      modelo: CLAUDE_MODEL_COPY,
      uso: msg.usage,
    });
    if (msg.stop_reason === "max_tokens") { ultimo = "resposta cortada"; continue; }
    const bloco = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!bloco) { ultimo = "sem resposta estruturada"; continue; }
    const c = conferirQuemEuSou(bloco.input, p.material, p.revisao);
    if (c.ok) return { ok: true, textos: acentuarFundo(c.textos) };
    ultimo = c.motivo;
  }
  return { ok: false, motivo: ultimo };
}
